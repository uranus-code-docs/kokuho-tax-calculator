import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { RulesetSchema } from '../src/schema/ruleset.schema';
import { MUNICIPALITIES } from '../src/data/municipalities';

// マスター（tools/gunma/master-2026.json = 県の税率表の転記）と、各市町村のルールセットJSONの値が一致するかを確かめる
type Rates = [number, number, number, number]; // 所得割率%, 資産割率%, 均等割額, 平等割額
const master = JSON.parse(fs.readFileSync(new URL('../../tools/gunma/master-2026.json', import.meta.url), 'utf8')) as {
  common: { child: { incomeRate: number; perCapita: number; perCapitaAdult: number; perHousehold: number }; statutoryCaps: number[] };
  municipalities: { code: string; name: string; medical: Rates; support: Rates; care: Rates; caps?: number[] }[];
};
const rulesOf = (code: string) => RulesetSchema.parse(JSON.parse(fs.readFileSync(new URL(`../src/data/rulesets/2026/${code}.json`, import.meta.url), 'utf8')));

describe('群馬県35市町村のルールセット', () => {
  it('マスターに35市町村あり、ページ一覧と一致する', () => {
    expect(master.municipalities).toHaveLength(35);
    expect(MUNICIPALITIES.map((m) => m.code)).toEqual(master.municipalities.map((m) => m.code));
  });

  it.each(master.municipalities.map((m) => [m.name, m] as const))('%s: 税率・限度額がマスターと一致する', (_, m) => {
    const r = rulesOf(m.code);
    expect(r.meta.municipalityName).toBe(m.name);
    const caps = m.caps ?? master.common.statutoryCaps;
    const get = (id: string) => {
      const c = r.categories.find((x) => x.id === id)!;
      return [c.incomeRate, c.assetRate, c.perCapita.amount, c.perHousehold, c.cap];
    };
    expect(get('medical')).toEqual([...m.medical, caps[0]]);
    expect(get('support')).toEqual([...m.support, caps[1]]);
    expect(get('care')).toEqual([...m.care, caps[2]]);
    const ch = master.common.child;
    expect(get('child')).toEqual([ch.incomeRate, 0, ch.perCapita + ch.perCapitaAdult, ch.perHousehold, caps[3]]);
    // 年齢による軽減: 未就学児は医療・支援の均等割が半額、子ども分は18歳未満が全額軽減
    expect(r.categories.find((x) => x.id === 'medical')!.perCapita.ageMultiplier).toEqual({ preschool: 0.5 });
    expect(r.categories.find((x) => x.id === 'child')!.perCapita.ageMultiplier).toEqual({ preschool: 0, under18: 0 });
  });
});
