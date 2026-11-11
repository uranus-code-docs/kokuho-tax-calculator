import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { RulesetSchema } from '../src/schema/ruleset.schema';
import { calculate } from '../src/engine/calculate';
import type { HouseholdInput, Member } from '../src/domain/types';

// 市町村の公式ページに載っている令和8年度の計算例を再現する（出典URLは各 describe に記載）
const rulesOf = (code: string) => RulesetSchema.parse(JSON.parse(fs.readFileSync(new URL(`../src/data/rulesets/2026/${code}.json`, import.meta.url), 'utf8')));
/** 令和8年4月1日時点で age 歳（誕生日を10月にして、年度内に区分の境目をまたがないようにする） */
const born = (age: number) => `${2026 - age - 1}-10-15`;
const m = (relation: string, age: number, o: Partial<Member> = {}): Member => ({ relation, birthDate: born(age), ...o });
const household = (members: Member[]): HouseholdInput => ({ fiscalYear: 2026, allDeclared: true, members });
const NOT_ENROLLED = Array(12).fill(false);

function expectAmounts(code: string, input: HouseholdInput, exp: { medical: number; support: number; care: number; child: number; total: number; rate?: number }) {
  const r = calculate(rulesOf(code), input);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect({
    medical: r.categories.medical!.amount,
    support: r.categories.support!.amount,
    care: r.categories.care!.amount,
    child: r.categories.child!.amount,
    total: r.total,
    ...(exp.rate !== undefined ? { rate: r.reduction.rate } : {}),
  }).toEqual(exp);
}

describe('伊勢崎市 計算例（https://www.city.isesaki.lg.jp/soshiki/kensui/kokumin/huka/2114.html）', () => {
  it('45歳 給与収入400万円・配偶者43歳・子14歳 → 444,500円', () => {
    expectAmounts('102041', household([m('世帯主', 45, { salaryIncome: 4_000_000 }), m('配偶者', 43), m('子', 14)]), {
      medical: 259_200, support: 98_000, care: 77_000, child: 10_300, total: 444_500,
    });
  });
});

describe('富岡市 計算例（https://www.city.tomioka.lg.jp/www/contents/1450421495497/index.html）', () => {
  it('例1: 世帯主47歳 農業所得300万円・妻45歳 給与収入96万円・子18歳・子15歳 → 542,500円', () => {
    // 母（80歳・後期高齢者医療）は所得なしのため入力しない
    expectAmounts('102105', household([m('世帯主', 47, { otherIncome: 3_000_000 }), m('妻', 45, { salaryIncome: 960_000 }), m('子1', 18), m('子2', 15)]), {
      medical: 307_800, support: 129_900, care: 92_400, child: 12_400, total: 542_500,
    });
  });
  it('例2: 世帯主は社保（国保に加入していない）・子3人が国保 → 271,700円', () => {
    expectAmounts(
      '102105',
      household([
        m('世帯主', 55, { salaryIncome: 5_000_000, enrollment: NOT_ENROLLED }),
        m('子1', 30, { salaryIncome: 1_700_000 }),
        m('子2', 28, { otherIncome: 1_000_000 }),
        m('子3', 27, { salaryIncome: 900_000 }),
      ]),
      { medical: 185_800, support: 77_700, care: 0, child: 8_200, total: 271_700 },
    );
  });
  it('例3: 5割軽減（世帯主60歳 給与収入140万円・妻66歳 年金収入130万円・子21歳）→ 124,300円', () => {
    expectAmounts('102105', household([m('世帯主', 60, { salaryIncome: 1_400_000 }), m('妻', 66, { pensionIncome: 1_300_000 }), m('子', 21)]), {
      medical: 73_700, support: 30_600, care: 16_700, child: 3_300, total: 124_300, rate: 0.5,
    });
  });
});

describe('みどり市 計算例（https://www.city.midori.gunma.jp/kurashi/1001619/1001705/1002148.html）', () => {
  it('2割軽減（父40歳 給与収入240万円・母40歳 事業所得30万円・子12歳・子5歳）→ 312,400円', () => {
    expectAmounts('102121', household([m('父', 40, { salaryIncome: 2_400_000 }), m('母', 40, { otherIncome: 300_000 }), m('子1', 12), m('子2', 5)]), {
      medical: 190_200, support: 65_800, care: 50_200, child: 6_200, total: 312_400, rate: 0.2,
    });
  });
});
