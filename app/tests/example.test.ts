import { describe, expect, it } from 'vitest';
import rulesJson from '../src/data/rulesets/2026/102024.json';
import { RulesetSchema } from '../src/schema/ruleset.schema';
import { calculate } from '../src/engine/calculate';
import type { HouseholdInput } from '../src/domain/types';

const rules = RulesetSchema.parse(rulesJson);

describe('高崎市 令和8年度 公式の計算例（3607ページ）', () => {
  // 本人42歳（営業所得250万円）・妻38歳・子12歳（所得なし）
  const input: HouseholdInput = {
    fiscalYear: 2026,
    allDeclared: true,
    members: [
      { relation: '本人', birthDate: '1983-06-01', otherIncome: 2_500_000 },
      { relation: '妻', birthDate: '1987-06-01' },
      { relation: '子', birthDate: '2013-06-01' },
    ],
  };

  it('年税額 401,700円 を再現する', () => {
    const r = calculate(rules, input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.categories.medical.amount).toBe(244_300);
    expect(r.categories.support.amount).toBe(87_700);
    expect(r.categories.care.amount).toBe(60_100);
    expect(r.categories.child.amount).toBe(9_600);
    expect(r.total).toBe(401_700);
  });

  it('内訳（ページの数式）と一致する', () => {
    const r = calculate(rules, input);
    if (!r.ok) throw new Error('failed');
    // 医療: 所得割 140,760 + 均等割 27,400×3 + 平等割 21,400
    expect(r.categories.medical).toMatchObject({ incomeLevy: 140_760, perCapitaLevy: 82_200, perHouseholdLevy: 21_400 });
    // 子ども: 所得割 6,210 + 均等割 1,300×2（18歳未満の子は0）+ 平等割 800
    expect(r.categories.child).toMatchObject({ incomeLevy: 6_210, perCapitaLevy: 2_600, perHouseholdLevy: 800 });
    // 介護: 40〜64歳は本人のみ
    expect(r.categories.care).toMatchObject({ incomeLevy: 43_470, perCapitaLevy: 10_600, perHouseholdLevy: 6_100 });
    expect(r.members[0]).toMatchObject({ ageClass: 'general', taxableBase: 2_070_000 });
    expect(r.members[2]).toMatchObject({ ageClass: 'under18' });
    expect(r.reduction.rate).toBe(0);
  });

  it('加入者がいない世帯は NO_INSURED', () => {
    const r = calculate(rules, { fiscalYear: 2026, allDeclared: true, members: [{ relation: '本人', birthDate: '1940-01-01' }] });
    expect(r).toEqual({ ok: false, reason: 'NO_INSURED' });
  });
});
