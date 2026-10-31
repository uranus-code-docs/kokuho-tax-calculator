import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import rulesJson from '../src/data/rulesets/2026/102024.json';
import { RulesetSchema } from '../src/schema/ruleset.schema';
import { calculate } from '../src/engine/calculate';
import type { HouseholdInput } from '../src/domain/types';

const rules = RulesetSchema.parse(rulesJson);
const golden = JSON.parse(fs.readFileSync(new URL('./golden/102024-2026.json', import.meta.url), 'utf8')) as {
  cases: { input: HouseholdInput; expected: Record<string, number | boolean | null> }[];
};

describe(`高崎市2026 ゴールデン（市のExcelの計算結果）${golden.cases.length}件`, () => {
  it('全件一致する', () => {
    const diffs: string[] = [];
    golden.cases.forEach((c, i) => {
      const r = calculate(rules, c.input);
      if (c.expected.noInsured) {
        if (!(r.ok === false && r.reason === 'NO_INSURED')) diffs.push(`#${i} 加入者なしのはずが ${JSON.stringify(r).slice(0, 80)}`);
        return;
      }
      if (!r.ok) return void diffs.push(`#${i} 失敗 ${r.reason}`);
      const got = {
        medical: r.categories.medical.amount,
        support: r.categories.support.amount,
        care: r.categories.care.amount,
        child: r.categories.child.amount,
        total: r.total,
        reductionRate: r.reduction.rate,
      };
      const exp = c.expected as Record<string, number>;
      const bad = Object.keys(got).filter((k) => (got as Record<string, number>)[k] !== exp[k]);
      if (bad.length) diffs.push(`#${i} ${bad.map((k) => `${k}: 期待${exp[k]} 実際${(got as Record<string, number>)[k]}`).join(', ')} ← ${JSON.stringify(c.input.members.map((m) => [m.birthDate, m.salaryIncome, m.pensionIncome, m.otherIncome]))} relief=${c.input.householdRelief} declared=${c.input.allDeclared}`);
    });
    expect(diffs.slice(0, 15), `不一致 ${diffs.length}/${golden.cases.length}件`).toEqual([]);
  });
});
