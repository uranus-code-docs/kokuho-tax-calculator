// 群馬県の市町村のExcel（試算表）を「正解」として、照合用の期待値（ゴールデン）を作る。
// 使い方（リポジトリのルートで）: node tools/gunma/gen-golden.mjs [件数=150] [団体コード...]
// 前提: xlsx/ に Excel を置く（取得元は docs/gunma/01-existence-check.md）。LibreOffice（C:\LibreOffice）を使う。
// 出力: app/tests/golden/<団体コード>-2026.json
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const FY = 2026;
const N = Number(process.argv[2]) || 150;
const only = process.argv.slice(3);
const LO_PY = 'C:/LibreOffice/program/python.exe';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gunma-golden-'));

// ---- テストケース（通年加入。年度中に 40・65・75歳、就学、18歳の境目をまたがない年齢だけを使う）
// 誕生日を10月15日に固定: 4/1 と 1/1 の年齢が同じになり、年度中の誕生日で区分が変わらない年齢を選ぶ
const birthOf = (age) => `${FY - age - 1}-10-15`;
const ADULT = [20, 25, 33, 38, 41, 45, 52, 58, 62, 66, 68, 70, 72];
const CHILD = [0, 3, 5, 8, 12, 15, 16];

function makeCases(n, dom, seed) {
  let s = seed;
  const R = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const childAges = CHILD.filter((a) => (dom.preschool ? true : a >= 6) && (dom.under18 ? true : a >= 18));
  const cases = [];
  const income = (age, scale) => {
    const o = {};
    if (age < 16) return o;
    const r = R();
    const both = dom.salaryPension && R() < 0.15;
    if (age >= 62 && R() < 0.7) o.pensionIncome = ri(1, 3_500_000 * scale);
    if ((age < 65 && r < 0.7) || both) o.salaryIncome = ri(1, Math.min(8_400_000, 6_000_000 * scale));
    if (o.salaryIncome && o.pensionIncome && !dom.salaryPension) delete o.pensionIncome;
    if (R() < 0.3) o.otherIncome = ri(0, 3_000_000 * scale);
    return o;
  };
  for (let i = 0; i < n; i++) {
    const kind = i % 10; // 0-5: 一般 / 6-7: 低所得（軽減） / 8-9: 高所得（限度額）
    const scale = kind >= 8 ? 4 : kind >= 6 ? 0.12 : 1;
    const adults = ri(1, 3);
    const kids = childAges.length ? ri(0, 3) : 0;
    const members = [];
    for (let p = 0; p < adults + kids && p < dom.maxMembers; p++) {
      const age = p < adults ? pick(ADULT) : pick(childAges);
      const inc = income(age, scale);
      if (dom.incomeAsShotoku) {
        // 所得を直接入力するExcel（板倉町）: その他所得だけで表す
        const t = ri(0, Math.round(3_000_000 * scale));
        members.push({ relation: p === 0 ? '本人' : '家族', birthDate: birthOf(age), ...(age >= 16 ? { otherIncome: t } : {}) });
      } else members.push({ relation: p === 0 ? '本人' : '家族', birthDate: birthOf(age), ...inc });
    }
    // 1割は限度額に確実に届く世帯にする（世帯主のその他所得を大きくする）
    if (kind === 9) members[0] = { ...members[0], otherIncome: ri(8_000_000, 9_900_000) };
    cases.push({ fiscalYear: FY, allDeclared: dom.reduction, householdRelief: 'none', members });
  }
  return cases;
}
const ageOf = (m) => FY - Number(m.birthDate.slice(0, 4)) - 1;

// ---- 市町村ごとのExcelの入出力（セルの位置は docs/gunma/03-excel-check.md に説明）
const C = ['medical', 'support', 'care', 'child'];
const ADAPTERS = {
  // 太田市: 生年月日・月ごとの資格。軽減・未就学児・18歳未満の子ども分軽減は計算しない
  '102059': {
    file: 'xlsx/2026-102059.xlsx',
    dom: { reduction: false, preschool: false, under18: false, salaryPension: true, maxMembers: 6 },
    reset: ['記入用!A5:Q20'],
    set: (c) => Object.fromEntries(c.members.flatMap((m, k) => [
      [`記入用!B${5 + k}`, { date: m.birthDate }], [`記入用!O${5 + k}`, m.salaryIncome ?? 0], [`記入用!P${5 + k}`, m.pensionIncome ?? 0], [`記入用!Q${5 + k}`, m.otherIncome ?? 0]])),
    outputs: ['計算用!AA5', '計算用!AF5', '計算用!AK5', '計算用!AP5', '記入用!A24'],
  },
  // 伊勢崎市: 年齢区分（4/1時点）を選ぶ。軽減は自動で判定
  '102041': {
    file: 'xlsx/2026-102041.xlsx',
    dom: { reduction: true, preschool: true, under18: true, salaryPension: true, maxMembers: 6 },
    reset: ['試算!B26:Z33'],
    set: (c) => {
      const cls = (a) => (a <= 5 ? '0歳～6歳' : a <= 18 ? '7歳～18歳' : a <= 39 ? '19歳～39歳' : a <= 64 ? '40歳～64歳' : '65歳～74歳');
      return Object.fromEntries([['試算!B22', '12カ月'], ...c.members.flatMap((m, k) => [
        [`試算!B${26 + k}`, cls(ageOf(m))], [`試算!I${26 + k}`, m.salaryIncome ?? 0], [`試算!O${26 + k}`, m.pensionIncome ?? 0], [`試算!U${26 + k}`, m.otherIncome ?? 0]])]);
    },
    outputs: ['試算!L49', '試算!Q49', '試算!V49', '試算!AA49', '試算!R37'],
  },
  // 沼田市: 年齢（1/1時点）・人数・世帯主の加入
  '102067': {
    file: 'xlsx/2026-102067.xlsx',
    dom: { reduction: true, preschool: true, under18: true, salaryPension: true, maxMembers: 6 },
    reset: ['計算シート!E17:H24'],
    set: (c) => Object.fromEntries([['計算シート!D9', c.members.length], ['計算シート!D12', '加入している'], ...c.members.flatMap((m, k) => [
      [`計算シート!E${17 + k}`, ageOf(m)], [`計算シート!F${17 + k}`, m.salaryIncome ?? 0], [`計算シート!G${17 + k}`, m.pensionIncome ?? 0], [`計算シート!H${17 + k}`, m.otherIncome ?? 0]])]),
    outputs: ['計算シート!K29', '計算シート!K30', '計算シート!K31', '計算シート!K32', '計算シート!K33'],
  },
  // 館林市: 年齢・収入。軽減と未就学児の軽減は非対応（シートに明記）
  '102075': {
    file: 'xlsx/2026-102075.xlsx',
    dom: { reduction: false, preschool: false, under18: true, salaryPension: true, maxMembers: 5 },
    reset: ['HP掲載用!E19:R27'],
    set: (c) => Object.fromEntries(c.members.flatMap((m, k) => {
      const r = 19 + k * 2;
      return [[`HP掲載用!E${r}`, ageOf(m)], [`HP掲載用!H${r}`, m.salaryIncome ?? 0], [`HP掲載用!M${r}`, m.pensionIncome ?? 0], [`HP掲載用!R${r}`, m.otherIncome ?? 0]];
    })),
    outputs: ['HP掲載用!E54', 'HP掲載用!H54', 'HP掲載用!K54', 'HP掲載用!N54', 'HP掲載用!Q54'],
  },
  // みどり市: 年齢（4/1時点）・人数。軽減は非対応（注意事項に明記）
  '102121': {
    file: 'xlsx/2026-102121.xlsx',
    dom: { reduction: false, preschool: true, under18: true, salaryPension: true, maxMembers: 6 },
    reset: ['記入用!B19:E28'],
    set: (c) => Object.fromEntries([['記入用!B7', c.members.length], ...c.members.flatMap((m, k) => [
      [`記入用!B${19 + k}`, ageOf(m)], [`記入用!C${19 + k}`, m.salaryIncome ?? 0], [`記入用!D${19 + k}`, m.pensionIncome ?? 0], [`記入用!E${19 + k}`, m.otherIncome ?? 0]])]),
    outputs: ['記入用!C42', '記入用!D42', '記入用!E42', '記入用!F42', '記入用!E44'],
  },
  // 中之条町: 生年月日・月ごとの加入（国保）・収入。軽減も計算する
  '104213': {
    file: 'xlsx/2026-104213.xlsx',
    dom: { reduction: true, preschool: true, under18: true, salaryPension: true, maxMembers: 6 },
    reset: ['入力シート!C15:T41', '入力シート!E49:V57'],
    set: (c) => Object.fromEntries(c.members.flatMap((m, k) => {
      const r = 15 + k * 3;
      const months = 'GHIJKLMNOPQR'.split('').map((col) => [`入力シート!${col}${r}`, '国保']);
      return [[`入力シート!C${r}`, `加入者${k + 1}`], [`入力シート!E${r}`, { date: m.birthDate }], ...months,
        [`入力シート!E${49 + k}`, m.salaryIncome ?? 0], [`入力シート!K${49 + k}`, m.pensionIncome ?? 0], [`入力シート!T${49 + k}`, m.otherIncome ?? 0]];
    })),
    outputs: ['入力シート!B82', '入力シート!F82', '入力シート!K82', '入力シート!P82', '入力シート!S82'],
    // Excelが判定した軽減割合（7/5/2/0）。軽減判定の式に誤りがあるため、照合で「同じ割合なら金額が一致するか」を確かめるのに使う
    rate: { cell: '入力シート!O63', map: { 7: 0.7, 5: 0.5, 2: 0.2, 0: 0 } },
  },
  // 板倉町: 年齢区分と「所得」を入力（収入ではない）。軽減も計算する
  '105210': {
    file: 'xlsx/2026-105210.xlsx',
    dom: { reduction: true, preschool: true, under18: true, salaryPension: false, maxMembers: 6, incomeAsShotoku: true },
    reset: ['試算シート !G21:Z26'],
    set: (c) => {
      const cls = (a) => (a <= 5 ? '未就学児' : a >= 40 && a <= 64 ? '40～64歳' : 'その他');
      return Object.fromEntries([['試算シート !AP21', 'あり'], ['試算シート !AQ24', 0], ['試算シート !AQ26', c.members.filter((m) => ageOf(m) < 18).length],
        ...c.members.flatMap((m, k) => [[`試算シート !G${21 + k}`, cls(ageOf(m))], [`試算シート !L${21 + k}`, 0], [`試算シート !Q${21 + k}`, 0], [`試算シート !V${21 + k}`, m.otherIncome ?? 0]])]);
    },
    outputs: ['試算シート !C89', '試算シート !N89', '試算シート !Y89', '試算シート !AJ89', '試算シート !AJ92'],
  },
  // 桐生市（.xls）: 年齢・人数。軽減と、給与と年金の両方がある場合の控除は非対応（シートに明記）
  '102032': {
    file: 'xlsx/2026-102032.xls',
    dom: { reduction: false, preschool: true, under18: true, salaryPension: false, maxMembers: 6 },
    reset: ['計算ｼｰﾄ!R11:BB23'],
    set: (c) => Object.fromEntries([['計算ｼｰﾄ!K5', c.members.length], ...c.members.flatMap((m, k) => {
      const r = 11 + k * 2;
      return [[`計算ｼｰﾄ!R${r}`, ageOf(m)], [`計算ｼｰﾄ!AB${r}`, m.salaryIncome ?? 0], [`計算ｼｰﾄ!AN${r}`, m.pensionIncome ?? 0], [`計算ｼｰﾄ!AZ${r}`, m.otherIncome ?? 0]];
    })]),
    outputs: ['計算ｼｰﾄ!AB89', '計算ｼｰﾄ!AQ89', '計算ｼｰﾄ!BF89', '計算ｼｰﾄ!BU89', '計算ｼｰﾄ!AB99'],
  },
  // 藤岡市（.xls）: 年齢区分（番号）と収入。軽減は自動で判定（軽減後の額を使う）
  '102091': {
    file: 'xlsx/2026-102091.xls',
    dom: { reduction: true, preschool: true, under18: true, salaryPension: true, maxMembers: 6 },
    reset: ['入力画面!F8:F37'],
    set: (c) => {
      const cls = (a) => (a <= 5 ? 2 : a <= 17 ? 3 : a <= 39 ? 4 : a <= 64 ? 5 : 6);
      const rows = [8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
      return Object.fromEntries(rows.flatMap((r, k) => {
        const m = c.members[k];
        return [[`入力画面!A${r}`, m ? cls(ageOf(m)) : 1], [`入力画面!F${r}`, m?.salaryIncome ?? 0], [`入力画面!F${r + 1}`, m?.pensionIncome ?? 0], [`入力画面!F${r + 2}`, m?.otherIncome ?? 0]];
      }));
    },
    outputs: ['入力画面!R16', '入力画面!S16', '入力画面!T16', '入力画面!U16', '入力画面!S18'],
  },
};

for (const [code, ad] of Object.entries(ADAPTERS)) {
  if (only.length && !only.includes(code)) continue;
  if (!fs.existsSync(ad.file)) {
    console.log(`${code}: ${ad.file} がないためスキップ`);
    continue;
  }
  const cases = makeCases(N, ad.dom, Number(code));
  const outputs = ad.rate ? [...ad.outputs, ad.rate.cell] : ad.outputs;
  const job = { file: ad.file, reset: ad.reset, cases: cases.map((c) => ({ set: ad.set(c) })), outputs };
  const jobPath = path.join(TMP, `job-${code}.json`);
  const resPath = path.join(TMP, `res-${code}.json`);
  fs.writeFileSync(jobPath, JSON.stringify(job));
  execFileSync(LO_PY, ['tools/gunma/lo_eval.py', jobPath, resPath], { stdio: 'inherit' });
  const res = JSON.parse(fs.readFileSync(resPath, 'utf8'));
  const out = cases.map((input, i) => {
    const v = res[i];
    const expected = Object.fromEntries(C.map((k, j) => [k, typeof v[j] === 'number' ? v[j] : null]));
    expected.total = typeof v[4] === 'number' ? v[4] : null;
    if (ad.rate) expected.excelReductionRate = ad.rate.map[v[5]] ?? null;
    return { input, expected, raw: v.some((x) => typeof x !== 'number') ? v : undefined };
  });
  const sha = crypto.createHash('sha256').update(fs.readFileSync(ad.file)).digest('hex');
  const meta = { source: path.basename(ad.file), sha256: sha, generatedBy: 'tools/gunma/gen-golden.mjs', engine: 'LibreOffice', count: out.length, domain: ad.dom };
  fs.writeFileSync(`app/tests/golden/${code}-${FY}.json`, JSON.stringify({ meta, cases: out }, null, 1));
  console.log(`${code}: ${out.length}件 → app/tests/golden/${code}-${FY}.json`);
}
