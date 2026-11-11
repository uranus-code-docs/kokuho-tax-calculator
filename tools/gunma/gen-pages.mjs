// 市町村ごとのページ（app/<slug>.html）と、市町村一覧（app/src/data/municipalities.ts）を作る。
// 使い方（リポジトリのルートで）: node tools/gunma/gen-pages.mjs
// 高崎市のページ（app/index.html）をひな形にして、タイトル・説明・団体コードだけを差し替える。
// 高崎市は index.html のまま（既存のURLを変えない）。
import fs from 'node:fs';

const master = JSON.parse(fs.readFileSync('tools/gunma/master-2026.json', 'utf8'));
const template = fs.readFileSync('app/index.html', 'utf8');
const INDEX_CODE = '102024';

const pageOf = (m) => (m.code === INDEX_CODE ? 'index.html' : `${m.slug}.html`);

let n = 0;
for (const m of master.municipalities) {
  if (m.code === INDEX_CODE) continue;
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${m.name}の国民健康保険税の計算｜TakasakiCity Tax Calculator</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${m.name}（群馬県）の国民健康保険税を試算できます。" />`)
    .replace(/<div id="root"[^>]*><\/div>/, `<div id="root" data-municipality="${m.code}"></div>`)
    .replace('<!-- 高崎市のページ。ほかの市町村のページは tools/gunma/gen-pages.mjs がこのファイルから作る -->\n', '');
  fs.writeFileSync(`app/${m.slug}.html`, html);
  n++;
}

const list = master.municipalities.map((m) => `  { code: '${m.code}', name: '${m.name}', page: '${pageOf(m)}' },`).join('\n');
fs.writeFileSync(
  'app/src/data/municipalities.ts',
  `// tools/gunma/gen-pages.mjs が生成（手で編集しない）。群馬県の市町村（県の税率表の順）
export interface MunicipalityEntry {
  code: string; // 全国地方公共団体コード
  name: string;
  page: string; // ページのファイル名
}

export const MUNICIPALITIES: readonly MunicipalityEntry[] = [
${list}
];

export const DEFAULT_MUNICIPALITY = '${INDEX_CODE}';
`,
);
console.log(`${n}ページと app/src/data/municipalities.ts を出力`);
