// マスター（tools/gunma/master-2026.json）から、市町村ごとのルールセットJSONを作る。
// 使い方（リポジトリのルートで）: node tools/gunma/gen-rulesets.mjs
// 出力: app/src/data/rulesets/2026/<団体コード>.json（高崎市 102024 は人が確認済みのため上書きしない）
//
// 税率・限度額以外（所得の控除表、軽減判定、年齢区分）は国の基準なので、高崎市のルールセットを雛形にする。
import fs from 'node:fs';

const master = JSON.parse(fs.readFileSync('tools/gunma/master-2026.json', 'utf8'));
const FY = master.fiscalYear;
const DIR = `app/src/data/rulesets/${FY}`;
const template = JSON.parse(fs.readFileSync(`${DIR}/102024.json`, 'utf8'));
const KEEP = new Set(['102024']);

const category = (id, label, [incomeRate, assetRate, perCapita, perHousehold], cap, extra) => ({
  id,
  label,
  incomeRate,
  assetRate,
  perCapita: { amount: perCapita, ...(extra.ageMultiplier ? { ageMultiplier: extra.ageMultiplier } : {}) },
  perHousehold,
  cap,
  capMonthlyRounding: 'floor',
  eligibility: extra.eligibility ?? {},
  householdReliefApplies: extra.householdReliefApplies ?? true,
});

let n = 0;
for (const m of master.municipalities) {
  if (KEEP.has(m.code)) continue;
  const caps = m.caps ?? master.common.statutoryCaps;
  const ch = master.common.child;
  const caveats = new Set(m.caveats ?? []);
  if (m.official !== 'yes') caveats.add('RATES_FROM_PREF_ONLY');
  if (m.official === 'no' || m.childConfirmed === false) caveats.add('CHILD_SUPPORT_NOT_CONFIRMED');
  if (m.capsSource !== 'official' && m.capsSource !== 'excel') caveats.add('CAPS_ASSUMED');
  if (!m.excelVerified) {
    caveats.add('NOT_VERIFIED_WITH_EXCEL');
    if (!m.officialExamples) caveats.add('RULES_ASSUMED'); // 公式の計算例が再現できた市町村は、軽減判定などの方法も確認できている
  }
  const order = ['RATES_FROM_PREF_ONLY', 'CHILD_SUPPORT_NOT_CONFIRMED', 'CAPS_ASSUMED', 'RULES_ASSUMED', 'NOT_VERIFIED_WITH_EXCEL', 'MUNICIPAL_EXCEL_DIFFERS'];

  const rules = {
    schemaVersion: 1,
    meta: {
      municipalityCode: m.code,
      municipalityName: m.name,
      fiscalYear: FY,
      levyType: 'tax',
      status: 'draft',
      sources: [
        ...m.sources.map((s) => ({ ...s, retrievedAt: master.retrievedAt })),
        { ...master.prefSource, retrievedAt: master.retrievedAt },
      ],
      verifiedAt: null,
      reviewer: null,
      slug: m.slug,
      caveats: order.filter((c) => caveats.has(c)),
      notes: m.pageNotes ?? [],
    },
    ageClasses: template.ageClasses,
    basicDeduction: template.basicDeduction,
    income: template.income,
    reduction: template.reduction,
    householdRelief: template.householdRelief,
    categories: [
      category('medical', '医療分', m.medical, caps[0], { ageMultiplier: { preschool: 0.5 } }),
      category('support', '後期高齢者支援金分', m.support, caps[1], { ageMultiplier: { preschool: 0.5 } }),
      category('care', '介護分（40〜64歳）', m.care, caps[2], { eligibility: { minAge: 40, maxAge: 64 }, householdReliefApplies: false }),
      category('child', '子ども・子育て支援金分', [ch.incomeRate, 0, ch.perCapita + ch.perCapitaAdult, ch.perHousehold], caps[3], {
        ageMultiplier: { preschool: 0, under18: 0 },
      }),
    ],
    capMode: 'monthly',
  };
  fs.writeFileSync(`${DIR}/${m.code}.json`, JSON.stringify(rules, null, 2) + '\n');
  n++;
}
console.log(`${n}件を ${DIR} に出力（${[...KEEP].join(',')} は上書きしない）`);
