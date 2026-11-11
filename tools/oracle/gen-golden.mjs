// 市のExcelを正解として、入力パターンと期待値（ゴールデンデータ）を生成する。
// 使い方: node gen-golden.mjs [件数=600]   出力: ../../app/tests/golden/102024-2026.json
import { HyperFormula } from 'hyperformula';
import crypto from 'node:crypto';
import fs from 'node:fs';

const N = Number(process.argv[2]) || 600;
const XLSX_PATH = '../../xlsx/2026-102024.xlsx';
const OUT = '../../app/tests/golden/102024-2026.json';

const sheets = JSON.parse(fs.readFileSync('sheets.json', 'utf8')); // probe.mjs が生成
const hf = HyperFormula.buildFromSheets(sheets, { licenseKey: 'gpl-v3' });
const S = hf.getSheetId('入力');
const A = (a) => {
  const m = a.match(/^([A-Z]+)(\d+)$/);
  let c = 0;
  for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64;
  return { sheet: S, row: +m[2] - 1, col: c - 1 };
};
const serial = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
};
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

let seed = 20261005;
const R = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const randBirth = () => iso(ri(1935, 2026), ri(1, 12), ri(1, 28));

const cases = [];
const person = (birthDate, o = {}) => ({ relation: o.relation ?? '本人', birthDate, ...o.income, ...(o.join ? { joinMonth: o.join } : {}), ...(o.leave ? { leaveMonth: o.leave } : {}) });

// --- 1. ランダム
for (let i = 0; i < N * 0.6; i++) {
  const n = ri(1, 5);
  const members = [];
  for (let p = 0; p < n; p++) {
    const income = {};
    if (R() < 0.5) income.salaryIncome = ri(1, 12_000_000);
    if (R() < 0.35) income.pensionIncome = ri(1, 5_000_000);
    if (R() < 0.3) income.otherIncome = ri(0, 3_000_000);
    members.push(person(randBirth(), { relation: p === 0 ? '本人' : '家族', income }));
  }
  cases.push({ allDeclared: R() < 0.85, householdRelief: pick(['none', 'none', 'none', 'half', 'quarter']), members });
}
// --- 2. 高所得（限度額）
for (let i = 0; i < N * 0.15; i++) {
  const n = ri(1, 4);
  const members = [];
  for (let p = 0; p < n; p++) {
    const income = { otherIncome: ri(2_000_000, 30_000_000) };
    if (R() < 0.4) income.salaryIncome = ri(5_000_000, 40_000_000);
    members.push(person(iso(ri(1962, 1985), ri(1, 12), ri(1, 28)), { relation: p === 0 ? '本人' : '家族', income }));
  }
  cases.push({ allDeclared: true, householdRelief: 'none', members });
}
// --- 3. 限度額の境界を狙う（本人1人・所得を細かく掃引）
for (let i = 0; i < N * 0.1; i++) {
  const base = pick([7_100_000, 9_300_000, 3_000_000, 3_200_000, 3_900_000, 12_000_000]);
  cases.push({
    allDeclared: true,
    householdRelief: 'none',
    members: [person(iso(1980, 6, 15), { income: { otherIncome: base + ri(-150_000, 150_000) } }), person(iso(2010, 1, 10), { relation: '子' })],
  });
}
// --- 4. 軽減の境界（軽判所得を基準額ちょうどと±1円に）
for (const n of [1, 2, 3]) {
  for (const base of [430_000, 430_000 + 310_000 * n, 430_000 + 570_000 * n]) {
    for (const d of [-1, 0, 1]) {
      const members = [];
      for (let p = 0; p < n; p++) members.push(person(iso(1980 + p * 3, 3, 3), { relation: p === 0 ? '本人' : '家族', income: p === 0 ? { otherIncome: base + d } : {} }));
      cases.push({ allDeclared: true, householdRelief: 'none', members });
    }
  }
}
// --- 5. 年齢の境界（年度2026。1/1・4/1・月初・月末の前後）
const dates = [
  '1961-01-01', '1961-01-02', '1960-12-31', // 65歳（1/1時点）
  '2020-04-01', '2020-04-02', '2008-04-01', '2008-04-02', // 未就学・18歳未満
  '1951-04-01', '1951-04-02', '1951-05-01', '1951-05-31', '1950-12-31', '1951-03-31', '1951-12-31', '1951-01-01', '1951-06-15', // 75歳到達
  '1986-04-01', '1986-04-02', '1986-05-01', '1986-12-31', '1986-02-01', '1986-03-31', '1985-12-31', '1987-01-01', // 40歳
  '1961-04-01', '1961-05-01', '1961-12-31', '1962-04-01', '1962-02-01', '1962-03-31', // 65歳（介護の終わり）
  '2025-12-31', '2026-01-01', '2026-04-15', '2026-12-31', // 年度内の出生
];
for (const d of dates) {
  cases.push({
    allDeclared: true,
    householdRelief: 'none',
    members: [person('1980-05-05', { income: { otherIncome: 2_000_000 } }), person(d, { relation: '家族', income: { pensionIncome: 1_500_000 } })],
  });
  cases.push({ allDeclared: true, householdRelief: 'none', members: [person(d, { income: { salaryIncome: 3_000_000 } })] });
}
// --- 6. 給与・年金の控除表の境界
for (const s of [1, 650_999, 651_000, 1_899_999, 1_900_000, 1_903_999, 3_599_999, 3_600_000, 6_599_999, 6_600_000, 8_499_999, 8_500_000, 9_000_000]) {
  cases.push({ allDeclared: true, householdRelief: 'none', members: [person('1978-02-02', { income: { salaryIncome: s } })] });
}
for (const p of [1, 1_299_999, 1_300_000, 3_299_999, 3_300_000, 4_099_999, 4_100_000, 7_700_000, 10_000_001]) {
  for (const b of ['1960-01-01', '1962-01-01']) {
    cases.push({ allDeclared: true, householdRelief: 'none', members: [person(b, { income: { pensionIncome: p } })] });
  }
}
cases.push({ allDeclared: true, householdRelief: 'none', members: [person('1960-01-01', { income: { salaryIncome: 1_000_000, pensionIncome: 2_000_000 } })] });
cases.push({ allDeclared: true, householdRelief: 'none', members: [person('1970-01-01', { income: { salaryIncome: 900_000, pensionIncome: 700_000 } })] });

// --- 7. 年度途中の加入・脱退（加入月は5〜12,1〜3、脱退月は加入月より後。年度順 4,5,…,12,1,2,3）
const FY = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
for (let i = 0; i < N * 0.4; i++) {
  const n = ri(1, 4);
  const members = [];
  for (let p = 0; p < n; p++) {
    const income = {};
    if (R() < 0.4) income.salaryIncome = ri(1, 9_000_000);
    if (R() < 0.3) income.pensionIncome = ri(1, 4_000_000);
    if (R() < 0.4) income.otherIncome = ri(0, 6_000_000);
    let join, leave;
    const a = ri(0, 11);
    const b = ri(0, 11);
    const r = R();
    if (r < 0.3) join = FY[Math.max(1, Math.min(a, b))]; // 途中加入（5月以降）
    else if (r < 0.6) leave = FY[Math.max(1, Math.max(a, b))]; // 途中脱退（5月以降）
    else if (r < 0.8) {
      const lo = Math.max(1, Math.min(a, b));
      const hi = Math.max(lo + 1, Math.max(a, b));
      if (hi <= 11) { join = FY[lo]; leave = FY[hi]; }
    }
    members.push(person(randBirth(), { relation: p === 0 ? '本人' : '家族', income, join, leave }));
  }
  // 世帯主が途中加入・途中脱退のケースも混ぜる
  cases.push({ allDeclared: R() < 0.85, householdRelief: pick(['none', 'none', 'half', 'quarter']), members });
}
// 限度額 × 途中加入（月ごとの判定が効く）
for (let i = 0; i < N * 0.1; i++) {
  const lo = ri(1, 8);
  cases.push({
    allDeclared: true,
    householdRelief: 'none',
    members: [
      person(iso(1975, 4, 4), { income: { otherIncome: ri(6_000_000, 20_000_000) } }),
      person(iso(1982, 8, 8), { relation: '家族', income: { otherIncome: ri(3_000_000, 15_000_000) }, join: FY[lo] }),
      person(iso(1987, 2, 2), { relation: '家族', income: { salaryIncome: ri(5_000_000, 20_000_000) }, leave: FY[ri(lo + 1, 11)] }),
    ],
  });
}

// --- 実行
const rateOf = (t) => (t === '７割軽減' ? 0.7 : t === '５割軽減' ? 0.5 : t === '２割軽減' ? 0.2 : t === '軽減なし' ? 0 : null);
const reliefLabel = { none: '軽減なし', half: '1/2軽減', quarter: '1/4軽減' };
const g = (a) => hf.getCellValue(A(a));

const out = [];
for (const c of cases) {
  hf.batch(() => {
    hf.setCellContents(A('C19'), [[c.allDeclared ? '全員申告済み' : '未申告者有り']]);
    hf.setCellContents(A('C25'), [[reliefLabel[c.householdRelief]]]);
    for (let p = 0; p < 8; p++) {
      const row = 16 + p;
      const m = c.members[p];
      hf.setCellContents(A('F' + row), [[m ? serial(m.birthDate) : null]]);
      hf.setCellContents(A('G' + row), [[m?.salaryIncome ?? null]]);
      hf.setCellContents(A('H' + row), [[m?.pensionIncome ?? null]]);
      hf.setCellContents(A('I' + row), [[m?.otherIncome ?? null]]);
      hf.setCellContents(A('L' + row), [[m?.joinMonth ?? null]]);
      hf.setCellContents(A('M' + row), [[m?.leaveMonth ?? null]]);
    }
  });
  const h31 = g('H31');
  const expected =
    typeof h31 === 'number'
      ? { noInsured: false, medical: g('H27'), support: g('H28'), care: g('H29'), child: g('H30'), total: h31, reductionRate: rateOf(g('H26')) }
      : { noInsured: true };
  out.push({ input: { fiscalYear: 2026, allDeclared: c.allDeclared, householdRelief: c.householdRelief, members: c.members }, expected });
}

const sha = crypto.createHash('sha256').update(fs.readFileSync(XLSX_PATH)).digest('hex');
fs.mkdirSync('../../app/tests/golden', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ meta: { source: '2026-102024.xlsx', sha256: sha, generatedBy: 'tools/oracle/gen-golden.mjs', engine: 'HyperFormula', count: out.length }, cases: out }, null, 1));
console.log(`生成: ${out.length}件 (加入者なし ${out.filter((c) => c.expected.noInsured).length}件) → ${OUT}`);
