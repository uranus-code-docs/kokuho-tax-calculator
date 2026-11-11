// 限度額を「年額で頭打ち」にした簡易式が、Excelの「月割り限度額」とどれだけ違うかを測る（結果は標準出力に出す）。
import { it } from 'vitest';
import fs from 'node:fs';
import rulesJson from '../src/data/rulesets/2026/102024.json';
import { RulesetSchema } from '../src/schema/ruleset.schema';
import { calculate } from '../src/engine/calculate';
import type { HouseholdInput } from '../src/domain/types';

const rules = RulesetSchema.parse(rulesJson);
const golden = JSON.parse(fs.readFileSync(new URL('./golden/102024-2026.json', import.meta.url), 'utf8')) as {
  cases: { input: HouseholdInput; expected: Record<string, number | boolean | null> }[];
};

it('年額の頭打ち vs Excelの月割り限度額', () => {
  let capCases = 0;
  let annualDiff = 0;
  const examples: string[] = [];
  for (const c of golden.cases) {
    if (c.expected.noInsured) continue;
    const r = calculate(rules, c.input);
    if (!r.ok) continue;
    const exp = c.expected as Record<string, number>;
    let capped = false;
    let diff = false;
    for (const cat of rules.categories) {
      const res = r.categories[cat.id];
      if (res.capApplied) capped = true;
      // 簡易式: 限度額前の年額（subtotal）を年額の限度額で頭打ちにして100円未満切り捨て
      const simple = Math.floor(Math.min(res.subtotal, cat.cap) / 100) * 100;
      if (simple !== exp[cat.id === 'medical' ? 'medical' : cat.id === 'support' ? 'support' : cat.id === 'care' ? 'care' : 'child']) {
        diff = true;
        if (examples.length < 6) examples.push(`${cat.id}: Excel ${exp[cat.id]} / 年額頭打ち ${simple} / 限度前年額 ${res.subtotal} ← ${JSON.stringify(c.input.members.map((m) => m.birthDate))}`);
      }
    }
    if (capped) capCases++;
    if (diff) annualDiff++;
  }
  console.log(`限度額に達したケース ${capCases}件 / 年額頭打ちがExcelと違うケース ${annualDiff}件`);
  examples.forEach((e) => console.log('  例:', e));
});
