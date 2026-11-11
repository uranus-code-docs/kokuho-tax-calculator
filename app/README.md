# 国保税試算アプリ（React + TypeScript）

設計: [../design/design.md](../design/design.md)

## コマンド

```
npm install
npm run dev        # 開発サーバー
npm run build      # 型チェック + 静的ビルド（dist/）
npm run preview    # ビルド結果の確認
npm test           # エンジン（Excel照合938件）と画面のテスト
npm run typecheck
```

## 構成

| 場所 | 役割 |
|---|---|
| `src/engine/` | 計算エンジン（純粋なTS。Reactに依存しない） |
| `src/schema/` | ルールセットのZodスキーマ |
| `src/data/rulesets/<年度>/<団体コード>.json` | 自治体ごとの計算ルール（`status` で公開を制御） |
| `src/domain/` | 型、フォーム→エンジン入力の変換 |
| `src/hooks/` | React との接着（計算ロジックは持たない） |
| `src/components/` `src/pages/` | 画面 |
| `public/common/` | 既存サイトのCSS・画像。デザインは変えない |
| `tests/golden/` | 市のExcelから作った期待値（`tools/oracle/gen-golden.mjs` で再生成） |

## 公開の制御

- ルールセットの `meta.status` が `draft` のデータは、`VITE_ALLOW_DRAFT=false` でビルドすると表示されない（「準備中」になる）。
- 高崎市 令和8年度は `reviewed`（2026-11-04）。Excelで計算した938件・公式の試算例（401,700円）の一致と、市の税率表（2026年6月22日更新）との突き合わせを確認済み。画面には「参考値」と表示する。

## 見た目について

- 既存CSSは `data-item` / `data-item-val` 属性で値を表示するため、画面でも同じ属性を出力している。
- 既存CSSの `body > .wrap` の余白は、Reactの `#root` 内に描画するため `src/styles/app.css` で `#root > .wrap` にも付けている。
