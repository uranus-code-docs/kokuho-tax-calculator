import type { Member } from '../domain/types';
import type { Ruleset } from '../schema/ruleset.schema';
import { applyRounding, floorSafe } from './rounding';

type Bracket = Ruleset['income']['salaryDeduction'][number];

/** 区間表を引く。x は 1 以上。値 = round後の額 × rate − subtract（0未満は0） */
function bracketValue(table: readonly Bracket[], x: number): number {
  let b = table[0]!;
  for (const t of table) if (x >= t.from) b = t;
  const base = b.round ? applyRounding(x, b.round) : x;
  return Math.max(0, base * b.rate - b.subtract);
}

export interface IncomeResult {
  salaryIncome: number; // 給与所得（控除後）
  pensionIncome: number; // 年金所得
  totalIncome: number; // 所得計
  taxableBase: number; // 課税標準
  judgementIncome: number; // 軽減判定所得
  isSalaryEarner: boolean; // 給与所得者等
}

/** 市のExcelの 計算シート D〜R列 に対応 */
export function calcIncome(rules: Ruleset, m: Member, isSenior: boolean): IncomeResult {
  const inc = rules.income;
  const salary = m.salaryIncome && m.salaryIncome > 0 ? m.salaryIncome : undefined;
  const pension = m.pensionIncome && m.pensionIncome > 0 ? m.pensionIncome : undefined;
  const other = m.otherIncome ?? 0;

  // D: 給与所得（特例軽減該当は×0.3）
  const D =
    salary === undefined
      ? undefined
      : floorSafe(bracketValue(inc.salaryDeduction, salary) * (m.salarySpecialRelief ? inc.salarySpecialReliefFactor : 1));

  // K: 年金所得 / L: 軽減判定用の年金所得（65歳以上は加算額を引く）
  const K =
    pension === undefined
      ? undefined
      : floorSafe(bracketValue(isSenior ? inc.pensionDeduction.over65 : inc.pensionDeduction.under65, pension));
  const L =
    K === undefined ? undefined : isSenior ? (K < rules.reduction.judgementPensionExtraDeduction ? 0 : K - rules.reduction.judgementPensionExtraDeduction) : K;

  // E/G: 給与所得と年金所得があるときの併用控除
  const cap = inc.salaryPensionOffset.perItemCap;
  const offset = (d: number, k: number | undefined): number => {
    if (k === undefined) return 0;
    if (d + k < cap) return 0;
    return Math.min(d, cap) + Math.min(k, cap) - cap;
  };
  const F = D === undefined ? 0 : D - offset(D, K); // 控除後給与所得
  const H = D === undefined ? 0 : D - offset(D, L); // 軽判給与所得

  const totalIncome = F + (K ?? 0) + other; // N
  const judgementIncome = H + (L ?? 0) + other; // Q
  const taxableBase = Math.max(totalIncome - rules.basicDeduction, 0); // O/P

  const crit = rules.reduction.salaryEarnerCriteria;
  const hasIncome = D !== undefined || K !== undefined;
  const isSalaryEarner =
    hasIncome &&
    ((salary ?? 0) > crit.salary || (pension ?? 0) > (isSenior ? crit.pension65Plus : crit.pensionUnder65));

  return { salaryIncome: F, pensionIncome: K ?? 0, totalIncome, taxableBase, judgementIncome, isSalaryEarner };
}
