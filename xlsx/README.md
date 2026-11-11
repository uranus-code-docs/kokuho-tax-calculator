# xlsx/ — 市のExcel（このフォルダには置くだけ。Gitには含めない）

高崎市が配布している「国民健康保険税試算表」のExcelを、テスト用の期待値（ゴールデン）を作るときの**正解**として使う。
Excelは**毎年変わる**ため、リポジトリには含めず、必要なときに公式サイトから取得して置く。

## 取得と配置

1. 高崎市「国民健康保険税の計算」のページから「国民健康保険税試算表」のExcelをダウンロードする
   https://www.city.takasaki.gunma.jp/page/3607.html
2. このフォルダに `<年度>-<団体コード>.xlsx` の名前で置く（例: `2026-102024.xlsx` = 令和8年度・高崎市）
3. `tools/oracle/` で期待値を作り直す（手順は [tools/oracle/README.md](../tools/oracle/README.md)）

## 群馬県のほかの市町村

照合（`tools/gunma/gen-golden.mjs`）に使う。取得元のURLは [../docs/gunma/01-existence-check.md](../docs/gunma/01-existence-check.md) の「取得したExcel」。
桐生市・藤岡市は `.xls` のまま置く（`2026-102032.xls`、`2026-102091.xls`）。

## 利用条件

Excelの再配布・利用条件は、市のサイトの利用規約に従うこと。

## 現在のゴールデンデータが使ったExcel

`app/tests/golden/102024-2026.json` の `meta` に、使ったExcelのファイル名と SHA-256 を記録している。
年度更新などでExcelが変わったら、`gen-golden.mjs` で再生成して差分（税率・軽減基準額・控除表の変更）を確認する。

| ファイル | SHA-256 |
|---|---|
| `2026-102024.xlsx`（令和8年度 高崎市） | `fef18cbdeeac1190470e45d8fdf06924577ba455b6d2808cf8f34c0b676fcdbe` |
