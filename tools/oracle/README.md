# tools/oracle — 市のExcelを「正解」にして期待値を作る

`xlsx/2026-102024.xlsx`（高崎市の国民健康保険税試算表。Gitには含めない。取得方法は [../../xlsx/README.md](../../xlsx/README.md)）を HyperFormula で計算し、エンジンのテスト用データを作る。

```
npm install
node probe.mjs                 # Excelを読み込み sheets.json を生成（エラーの有無も確認。生成物はgit管理外）
node gen-golden.mjs 600        # ゴールデン生成 → ../../app/tests/golden/102024-2026.json
node compare.mjs 200           # HyperFormula と LibreOffice(C:\LibreOffice) の結果を突き合わせ
```

- 日本語のシート名は `'入力'!A1` のように引用符で囲まないと HyperFormula が読めない（probe.mjs で変換している）。
- LibreOffice は保存済みの計算値を信用して再計算しないため、数式セルの値を消してから渡している（compare.mjs）。
