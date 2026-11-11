# tools/gunma — 群馬県の市町村

設計は [../../design/design.md](../../design/design.md) 13章、チェック結果は [../../docs/gunma/report-2026.md](../../docs/gunma/report-2026.md)。

| ファイル | 内容 |
|---|---|
| `master-2026.json` | マスター。県の税率表から転記した税率・限度額と、根拠（公式ページで確認できたか、Excelの有無）、画面に出す補足 |
| `gen-rulesets.mjs` | マスター → `app/src/data/rulesets/2026/<コード>.json`（高崎市は上書きしない） |
| `gen-pages.mjs` | `app/index.html` を雛形に、市町村ページ `app/<slug>.html` と `app/src/data/municipalities.ts` を作る |
| `gen-golden.mjs` | 市町村のExcel（`xlsx/`）で計算した期待値 → `app/tests/golden/<コード>-2026.json` |
| `lo_eval.py` | LibreOffice でExcelにセルの値を入れて再計算し、結果を読み出す（`gen-golden.mjs` から呼ぶ） |

```
# リポジトリのルートで
node tools/gunma/gen-rulesets.mjs
node tools/gunma/gen-pages.mjs
node tools/gunma/gen-golden.mjs 150            # 全市町村。団体コードを並べるとその市町村だけ
cd app && npm test                              # Windows は PowerShell から
```

- `gen-golden.mjs` は LibreOffice（`C:\LibreOffice`）と、同梱の Python を使う。
- 市町村のExcelの問題（古い限度額など）は `app/tests/golden/excel-diffs.json` に書く。テストは、その条件で計算したエンジンの結果がExcelと一致することを確かめる。
