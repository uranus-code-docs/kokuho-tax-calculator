# 国保税試算アプリ

市区町村ごとの国民健康保険税を、確定申告前に概算できるアプリ（React + TypeScript）。
現在は高崎市（令和8年度）に対応。計算式は自治体ごとのJSON（ルールセット）で持ち、計算エンジンは共通。

| 場所 | 内容 |
|---|---|
| [app/](app/README.md) | Reactアプリ本体（計算エンジン・ルールセット・画面・テスト） |
| [docs/](docs/) | 設計書、市のExcelの解析メモ、実装ガイド |
| [tools/oracle/](tools/oracle/README.md) | 市のExcelから期待値（ゴールデン）を作るスクリプト |
| [xlsx/](xlsx/README.md) | 市のExcelの取得方法（Excel本体はGitに含めない） |

## このリポジトリに含めないもの

- `xlsx/` のExcel本体 … 毎年変わるため。取得手順は [xlsx/README.md](xlsx/README.md)
- 旧版（jQuery版）`10/` … 参照用にローカルにだけ置いている
- `.htaccess` / `.htpasswd` … 旧サイト用のサーバー設定と認証情報。Reactの静的ビルドには不要
