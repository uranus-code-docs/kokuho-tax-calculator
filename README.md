# 国保税試算アプリ

市区町村ごとの国民健康保険税を、確定申告前に概算できるアプリ（React + TypeScript）。
群馬県の全35市町村（令和8年度）に対応。全市町村とも `reviewed`（画面に「参考値」と表示）。計算式は自治体ごとのJSON（ルールセット）で持ち、計算エンジンは共通。

| 場所 | 内容 |
|---|---|
| [app/](app/README.md) | Reactアプリ本体（計算エンジン・ルールセット・画面・テスト） |
| [design/design.md](design/design.md) | 設計書 |
| [tools/oracle/](tools/oracle/README.md) | 市のExcelから期待値（ゴールデン）を作るスクリプト（高崎市） |
| [tools/gunma/](tools/gunma/README.md) | 群馬県の市町村: マスター、ルールセット・ページ・期待値の生成 |
| [docs/gunma/](docs/gunma/report-2026.md) | 群馬県の市町村の調査とチェック結果レポート |
| [xlsx/](xlsx/README.md) | 市のExcelの取得方法（Excel本体はGitに含めない） |

## このリポジトリに含めないもの

- `xlsx/` のExcel本体 … 毎年変わるため。取得手順は [xlsx/README.md](xlsx/README.md)
- 旧版（jQuery版）`10/` … 参照用にローカルにだけ置いている
- `materials/`（構築に必要な資料）・`requests/`（mdの草案）… ローカルにだけ置いている
- `.htaccess` / `.htpasswd` … 旧サイト用のサーバー設定と認証情報。Reactの静的ビルドには不要
