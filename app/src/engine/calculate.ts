import type { CalcResult, CategoryId, CategoryResult, HouseholdInput, MemberResult, Warning } from '../domain/types';
import type { Ruleset } from '../schema/ruleset.schema';
import { ageClassOf, isInsuredInMonth, meetsAgeRange, parseDate } from './age';
import { enrollmentMask } from './enrollment';
import { calcIncome } from './income';
import { judgeReduction } from './reduction';
import { capMonthlyCents, centsToYenRound, floor100, floorSafe, monthlyCents } from './rounding';

const MAX_MEMBERS = 8;

/**
 * 国保税の試算（市のExcel「国民健康保険税試算表」の計算シートに準拠）。
 * 区分ごとに「月ごと」に 所得割・資産割・均等割・平等割 を 1/12 ずつ積み上げ、月の合計が 限度額/12 を超える月は
 * 限度額/12 で頭打ちにし、12か月分を合計して円に丸め、100円未満を切り捨てる。
 */
export function calculate(rules: Ruleset, input: HouseholdInput): CalcResult {
  if (input.fiscalYear !== rules.meta.fiscalYear) {
    return { ok: false, reason: 'INVALID_INPUT', detail: `年度が一致しません（入力 ${input.fiscalYear} / ルール ${rules.meta.fiscalYear}）` };
  }
  if (input.members.length < 1 || input.members.length > MAX_MEMBERS) {
    return { ok: false, reason: 'INVALID_INPUT', detail: `世帯員は1〜${MAX_MEMBERS}人` };
  }
  const births = input.members.map((m) => parseDate(m.birthDate));
  if (births.some(Number.isNaN)) return { ok: false, reason: 'INVALID_INPUT', detail: '生年月日が不正です' };

  const fy = rules.meta.fiscalYear;
  const ages = births.map((b) => ageClassOf(b, fy, rules.ageClasses));

  // 所得
  const incomes = input.members.map((m, k) => calcIncome(rules, m, ages[k] === 'senior65'));

  // 月ごとの被保険者（医療・支援・子ども共通の ●）
  const insured = input.members.map((m, k) =>
    Array.from({ length: 12 }, (_, i) => (m.enrollment ?? enrollmentMask(m.joinMonth, m.leaveMonth))[i] === true && isInsuredInMonth(births[k]!, fy, i, rules.ageClasses)),
  );
  const firstMonth = Array.from({ length: 12 }, (_, i) => i).find((i) => insured.some((row) => row[i]));
  if (firstMonth === undefined) return { ok: false, reason: 'NO_INSURED' };
  const insuredCount = insured.filter((row) => row[firstMonth]).length;

  // 軽減判定の対象者: 世帯主は常に含め、世帯主以外は「世帯の最初の加入月に被保険者だった人」だけを数える
  // （市のExcel: 計算!Q6,R6 の「BB6<>BB20 なら対象外」。後期高齢者へ移った人の所得は数えない）
  const counted = incomes.filter((_, k) => k === 0 || insured[k]![firstMonth]);
  const reduction = judgeReduction(rules, {
    judgementIncomeTotal: counted.reduce((s, x) => s + x.judgementIncome, 0),
    insuredCount,
    salaryEarnerCount: counted.filter((x) => x.isSalaryEarner).length,
    allDeclared: input.allDeclared,
    forcedRate: input.forcedReductionRate,
  });
  const r = reduction.rate;
  const relief = input.householdRelief ?? 'none';
  const reliefFactor = relief === 'half' ? rules.householdRelief.half.factor : relief === 'quarter' ? rules.householdRelief.quarter.factor : 1;

  const warnings: Warning[] = [];
  if (!input.allDeclared && rules.reduction.requiresDeclaration) warnings.push({ code: 'NOT_DECLARED' });
  input.members.forEach((m, k) => {
    if ((m.salaryIncome ?? 0) > 8_500_000) warnings.push({ code: 'SALARY_OVER_8_5M', member: k });
  });

  const categories = {} as Record<CategoryId, CategoryResult>;
  for (const cat of rules.categories) {
    // 個人ごとの均等割（円・切り捨て）。未就学など年齢の倍率と軽減率を掛けて1回だけ切り捨てる
    const perCapita = ages.map((a) => floorSafe(cat.perCapita.amount * (cat.perCapita.ageMultiplier?.[a] ?? 1) * (1 - r)));
    const perHousehold = floorSafe(cat.perHousehold * (1 - r) * (cat.householdReliefApplies ? reliefFactor : 1));
    const capC = capMonthlyCents(cat.cap, cat.capMonthlyRounding);

    let incomeC = 0;
    let assetC = 0;
    let capitaC = 0;
    let householdC = 0;
    let totalC = 0;
    let months = 0;
    const everEligible = new Set<number>();
    let capApplied = false;

    for (let i = 0; i < 12; i++) {
      const eligible = input.members
        .map((m, k) => (insured[k]![i] && meetsAgeRange(births[k]!, fy, i, cat.eligibility.minAge, cat.eligibility.maxAge) ? k : -1))
        .filter((k) => k >= 0);
      if (eligible.length === 0) continue;
      months += eligible.length;
      eligible.forEach((k) => everEligible.add(k));

      const inc = monthlyCents(floorSafe((eligible.reduce((s, k) => s + incomes[k]!.taxableBase, 0) * cat.incomeRate) / 100));
      const asset = monthlyCents(floorSafe((eligible.reduce((s, k) => s + (input.members[k]!.propertyTax ?? 0), 0) * cat.assetRate) / 100));
      const capita = monthlyCents(eligible.reduce((s, k) => s + perCapita[k]!, 0));
      const household = monthlyCents(perHousehold);

      const sum = inc + asset + capita + household;
      if (sum > capC) capApplied = true;
      totalC += Math.min(sum, capC);
      incomeC += inc;
      assetC += asset;
      capitaC += capita;
      householdC += household;
    }

    const subtotalC = incomeC + assetC + capitaC + householdC;
    categories[cat.id] = {
      id: cat.id,
      label: cat.label,
      insuredMonths: months,
      headcount: everEligible.size,
      memberIndexes: [...everEligible].sort((a, b) => a - b),
      perCapitaUnit: floorSafe(cat.perCapita.amount * (1 - r)),
      incomeLevy: centsToYenRound(incomeC),
      assetLevy: centsToYenRound(assetC),
      perCapitaLevy: centsToYenRound(capitaC),
      perHouseholdLevy: centsToYenRound(householdC),
      subtotal: centsToYenRound(subtotalC),
      capApplied,
      amount: floor100(centsToYenRound(totalC)),
    };
    if (capApplied) warnings.push({ code: 'CAP_REACHED', category: cat.id });
  }

  const members: MemberResult[] = input.members.map((m, k) => ({
    relation: m.relation,
    ageClass: ages[k]!,
    salaryIncome: incomes[k]!.salaryIncome,
    pensionIncome: incomes[k]!.pensionIncome,
    totalIncome: incomes[k]!.totalIncome,
    taxableBase: incomes[k]!.taxableBase,
    judgementIncome: incomes[k]!.judgementIncome,
    isSalaryEarner: incomes[k]!.isSalaryEarner,
  }));

  return {
    ok: true,
    total: Object.values(categories).reduce((s, c) => s + c.amount, 0),
    categories,
    members,
    reduction: {
      rate: reduction.rate,
      judgementIncome: counted.reduce((s, x) => s + x.judgementIncome, 0),
      insuredCount,
      salaryEarnerCount: counted.filter((x) => x.isSalaryEarner).length,
      thresholds: reduction.thresholds,
    },
    warnings,
  };
}
