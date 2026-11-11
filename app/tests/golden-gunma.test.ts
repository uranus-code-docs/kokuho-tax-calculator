import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { RulesetSchema, type Ruleset } from '../src/schema/ruleset.schema';
import { calculate } from '../src/engine/calculate';
import type { HouseholdInput } from '../src/domain/types';

// 群馬県の市町村のExcel（試算表）で作った期待値と、エンジンの結果を突き合わせる。
// 期待値は tools/gunma/gen-golden.mjs で作る。高崎市（102024）は golden.test.ts で別に照合している。
//
// 市町村のExcel自体が公式の税率表と違う箇所（古い限度額のまま、など）は excel-diffs.json に書く。
// その場合は「Excelと同じ条件にしたエンジンの結果」が一致すれば、理由の分かった差として扱う。

type Golden = {
  meta: { source: string; sha256: string; count: number; domain: Record<string, unknown> };
  cases: { input: HouseholdInput; expected: Record<string, number | null> }[];
};
type ExcelDiff = {
  reason: string;
  /** Excelの計算に合わせるときのルールの差し替え（区分ごと）。preschool は未就学児の均等割の倍率 */
  categories?: Record<string, Partial<{ cap: number; perCapita: number; incomeRate: number; preschool: number }>>;
  /** 給与所得控除の区間表の差し替え（改正前の表を使っているExcel） */
  salaryDeduction?: Ruleset['income']['salaryDeduction'];
  /** 軽減判定の基準額（7割・5割・2割共通の基礎の額）の差し替え */
  reductionBase?: number;
  /** 「給与所得者等」の判定基準（収入額）の差し替え */
  salaryEarnerCriteria?: Ruleset['reduction']['salaryEarnerCriteria'];
  /** 子ども分の所得割から、18歳未満の世帯員の所得を除いて計算するExcel */
  childExcludesUnder18Income?: boolean;
  /** 軽減判定の式に誤りがあるExcel: Excelが判定した軽減割合（expected.excelReductionRate）を使って金額を比べる */
  useExcelReductionRate?: boolean;
  /** Excelの総額だけを比べる（区分ごとの値を取り出せないExcel） */
  totalOnly?: boolean;
};

const DIR = new URL('./golden/', import.meta.url);
const RULES = new URL('../src/data/rulesets/2026/', import.meta.url);
const excelDiffs = JSON.parse(fs.readFileSync(new URL('excel-diffs.json', DIR), 'utf8')) as Record<string, ExcelDiff[]>;
const files = fs.readdirSync(DIR).filter((f) => /^\d{6}-2026\.json$/.test(f) && !f.startsWith('102024'));

const KEYS = ['medical', 'support', 'care', 'child', 'total'] as const;

function run(rules: Ruleset, input: HouseholdInput) {
  const r = calculate(rules, input);
  if (!r.ok) return null;
  return { medical: r.categories.medical!.amount, support: r.categories.support!.amount, care: r.categories.care!.amount, child: r.categories.child!.amount, total: r.total };
}

function withOverrides(rules: Ruleset, diffs: ExcelDiff[]): Ruleset {
  const r = structuredClone(rules);
  for (const d of diffs) {
    for (const [id, o] of Object.entries(d.categories ?? {})) {
      const c = r.categories.find((x) => x.id === id)!;
      if (o.cap !== undefined) c.cap = o.cap;
      if (o.incomeRate !== undefined) c.incomeRate = o.incomeRate;
      if (o.perCapita !== undefined) c.perCapita = { ...c.perCapita, amount: o.perCapita };
      if (o.preschool !== undefined) c.perCapita = { ...c.perCapita, ageMultiplier: { ...c.perCapita.ageMultiplier, preschool: o.preschool } };
    }
    if (d.salaryDeduction) r.income.salaryDeduction = d.salaryDeduction;
    if (d.reductionBase !== undefined) r.reduction.tiers = r.reduction.tiers.map((t) => ({ ...t, base: d.reductionBase! }));
    if (d.salaryEarnerCriteria) r.reduction.salaryEarnerCriteria = d.salaryEarnerCriteria;
  }
  return r;
}

const AGE18 = `${2026 - 18}-04-02`; // これ以降に生まれた人は令和8年度に18歳未満（子ども分の均等割が全額軽減）

/**
 * Excelの条件で計算する。子ども分の所得割から18歳未満の所得を外すExcelは、18歳未満の所得を0にして子ども分だけ計算し直す。
 * このとき軽減割合は元の判定のまま固定する（所得を外すのは子ども分の所得割だけで、軽減判定には含まれるため）
 */
function runExcelLike(rules: Ruleset, diffs: ExcelDiff[], original: HouseholdInput, excelRate: number | null | undefined) {
  const input: HouseholdInput =
    diffs.some((d) => d.useExcelReductionRate) && excelRate != null ? { ...original, forcedReductionRate: excelRate as HouseholdInput['forcedReductionRate'] } : original;
  const base = run(rules, input);
  if (!base || !diffs.some((d) => d.childExcludesUnder18Income)) return base;
  const full = calculate(rules, input);
  if (!full.ok) return base;
  const noMinorIncome = {
    ...input,
    forcedReductionRate: full.reduction.rate, // useExcelReductionRate のときは Excel の割合がそのまま入る
    members: input.members.map((m) => (m.birthDate >= AGE18 ? { ...m, salaryIncome: 0, pensionIncome: 0, otherIncome: 0 } : m)),
  };
  const childOnly = calculate(rules, noMinorIncome);
  if (!childOnly.ok) return base;
  const child = childOnly.categories.child!.amount;
  return { ...base, child, total: base.total - base.child + child };
}

function compareMunicipality(file: string) {
  const code = file.slice(0, 6);
  const golden = JSON.parse(fs.readFileSync(new URL(file, DIR), 'utf8')) as Golden;
  const rules = RulesetSchema.parse(JSON.parse(fs.readFileSync(new URL(`${code}.json`, RULES), 'utf8')));
  const diffs = excelDiffs[code] ?? [];
  const excelRules = withOverrides(rules, diffs);
  const keys = diffs.some((d) => d.totalOnly) ? (['total'] as const) : KEYS;
  let match = 0;
  let explained = 0;
  const unexplained: string[] = [];
  golden.cases.forEach((c, i) => {
    const got = run(rules, c.input);
    const same = (g: ReturnType<typeof run>) => g !== null && keys.every((k) => g[k] === c.expected[k]);
    if (same(got)) return void match++;
    if (diffs.length && same(runExcelLike(excelRules, diffs, c.input, c.expected.excelReductionRate))) return void explained++;
    const g = got ?? ({} as Record<string, number>);
    unexplained.push(
      `#${i} ${keys.filter((k) => g[k] !== c.expected[k]).map((k) => `${k}: Excel ${c.expected[k]} / エンジン ${g[k]}`).join(', ')} ← ${JSON.stringify(
        c.input.members.map((m) => [m.birthDate, m.salaryIncome ?? 0, m.pensionIncome ?? 0, m.otherIncome ?? 0]),
      )} declared=${c.input.allDeclared}`,
    );
  });
  return { code, name: rules.meta.municipalityName, source: golden.meta.source, total: golden.cases.length, match, explained, unexplained, diffs };
}

describe.each(files)('群馬県 Excel照合 %s', (file) => {
  it('Excelの結果と一致する（理由の分かった差を除く）', () => {
    const r = compareMunicipality(file);
    if (process.env.GUNMA_REPORT) fs.appendFileSync(process.env.GUNMA_REPORT, JSON.stringify({ ...r, unexplained: r.unexplained.slice(0, 20), unexplainedCount: r.unexplained.length }) + '\n');
    expect(r.unexplained.slice(0, 10), `${r.name}: 一致 ${r.match} / 理由の分かった差 ${r.explained} / 不一致 ${r.unexplained.length}（${r.total}件）`).toEqual([]);
  });
});
