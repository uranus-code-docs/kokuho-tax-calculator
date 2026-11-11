# 段取り1: 群馬県35市町村の計算方法の確認（令和8年度）

確認日: 2026-11-11

## 結論

- **全35市町村で、令和8年度の税率（所得割・資産割・均等割・平等割）が分かった。**
  根拠は群馬県の「[令和8年度 実際の市町村別国民健康保険税率](https://www.pref.gunma.jp/uploaded/attachment/701029.pdf)」（1枚に全35市町村、子ども・子育て支援納付金分まで載っている）。
- 市町村の公式ページで令和8年度の税率まで確認できたのは **25**（○）。一部だけ確認できたのが2（△: 前橋市は税率表が画像、嬬恋村は広報PDF）、確認できなかったのが **8**（✕）。✕ の市町村は県の税率表だけが根拠。
- 公式ページで確認できた税率は、すべて県の税率表と一致した。
- **市町村のExcel（試算表）は10市町で取得できた**（高崎市を含む）。前橋市はWebのシミュレーターのみ、千代田町はPDFの試算表のみ。
- **資産割があるのは安中市と昭和村だけ**（県の税率表）。他の33市町村は3方式（所得割・均等割・平等割）。
- 子ども・子育て支援納付金分は全市町村で同じ（所得割 0.30%、均等割 1,200円、18歳以上の均等割 100円、平等割 800円）。

### 資料docx（Geminiの回答）との違い

`materials/群馬県国保税の計算式とURL一覧.docx` は参考にとどめた。主な違い:

- 主要都市の比較表に **子ども・子育て支援金分がない**。限度額も「医療65万・支援22万」で古い（令和8年度は67万・26万）。
- 太田市の医療分の平等割を 19,300円としているが、県の表・市のページとも **23,000円**。
- URLの多くがトップページや Google検索のURLで、個別ページではない。
- 「Excel配布」とされた安中市・玉村町・大泉町・みなかみ町・甘楽町・千代田町・下仁田町は、公式ページにExcelが見当たらなかった（千代田町はPDFの試算表）。

## 市町村ごとの結果

- 公式: 市町村の公式ページで令和8年度の税率・限度額を確認できたか（○ 確認 / △ 一部 / ✕ 確認できず）
- 限度額: 公式ページで確認できた課税限度額（医療/支援/介護/子ども、万円）。「—」は未確認
- Excel: 市町村が配っている試算表

| No | 市町村 | 団体コード | 公式 | 限度額 | Excel | 公式ページ | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | 前橋市 | 102016 | △ | — | ✕（Webシミュレーター） | [国保税について](https://www.city.maebashi.gunma.jp/soshiki/kenko/kokuminkenkohoken/gyomu/3/3/4935.html) | 税率表が画像のみ。[試算システム](https://hscloud.sunnet.co.jp/kokuho_maebashi_R8/) |
| 2 | 高崎市 | 102024 | ○ | 67/26/17/3 | ○ | [国保税の計算](https://www.city.takasaki.gunma.jp/page/3607.html) | 対応済み |
| 3 | 桐生市 | 102032 | ○ | — | ○（.xls） | [国保税の決め方](https://www.city.kiryu.lg.jp/kurashi/kenpo/kokuhozei/1000705.html) | 令和8年度のモデルケースPDFあり |
| 4 | 伊勢崎市 | 102041 | ○ | 67/26/17/3 | ○ | [国保の課税](https://www.city.isesaki.lg.jp/soshiki/kensui/kokumin/huka/2111.html) / [計算例](https://www.city.isesaki.lg.jp/soshiki/kensui/kokumin/huka/2114.html) | 計算例（3人世帯 444,500円） |
| 5 | 太田市 | 102059 | ○ | 67/26/17/3 | ○ | [国民健康保険税](https://www.city.ota.gunma.jp/page/2505.html) | |
| 6 | 沼田市 | 102067 | ○ | 67/26/17/3 | ○ | [国保税について](https://www.city.numata.gunma.jp/life/kokuhonenkin/kokuho/1008520.html) / [試算](https://www.city.numata.gunma.jp/life/kokuhonenkin/kokuho/1009823.html) | |
| 7 | 館林市 | 102075 | ○ | 67/26/17/3 | ○ | [課税について](https://www.city.tatebayashi.gunma.jp/s052/kenko/070/005/010/20240226142528.html) / [試算](https://www.city.tatebayashi.gunma.jp/s052/kenko/070/005/030/20240226151058.html) | |
| 8 | 渋川市 | 102083 | ○ | 67/26/17/3 | ✕ | [令和8年度 税率等](http://www.city.shibukawa.lg.jp/kurashi/000025/000028/p005613.html) | |
| 9 | 藤岡市 | 102091 | ○ | 67/26/17/3 | ○（.xls） | [国保税の概要](https://www.city.fujioka.gunma.jp/soshiki/shiminbu/zeimu/9/5/2497.html) / [試算](https://www.city.fujioka.gunma.jp/soshiki/shiminbu/zeimu/9/5/2496.html) | |
| 10 | 富岡市 | 102105 | ○ | 67/26/17/3 | ✕ | [国保税のしくみ](https://www.city.tomioka.lg.jp/www/contents/1000000001379/index.html) | 計算例のページあり |
| 11 | 安中市 | 102113 | ○ | 67/26/17/3 | ✕ | [市税の種類・税率](https://www.city.annaka.lg.jp/page/2482.html) | **資産割あり**（医療24%・支援9%・介護5%） |
| 12 | みどり市 | 102121 | ○ | 67/26/17/3 | ○ | [国保税（計算例・試算）](https://www.city.midori.gunma.jp/kurashi/1001619/1001705/1002148.html) | |
| 13 | 榛東村 | 103446 | ✕ | — | ✕ | [国民健康保険](https://www.vill.shinto.gunma.jp/life/000021/000032/p000194.html) | 税率の掲載なし。令和8年度に子ども分の所得割を30%で誤賦課した旨の[お知らせ](https://www.vill.shinto.gunma.jp/administration/000404/p001456.html)（正しくは0.30%、限度額3万円） |
| 14 | 吉岡町 | 103454 | ✕ | — | ✕ | — | 公式サイトに接続できず（DNSで解決できない）。検索結果のページは旧年度（限度額66万円・子ども分なし） |
| 15 | 上野村 | 103667 | ✕ | — | ✕ | — | 公式サイトに接続できず |
| 16 | 神流町 | 103675 | ○ | 67/—/—/— | ✕ | [国民健康保険税](https://www.town.kanna.gunma.jp/soshiki/juminseikatsuka_kaikeishitsu/7/94.html) | |
| 17 | 下仁田町 | 103829 | ○ | 67/26/17/3 | ✕ | [国保税・後期保険料](https://www.town.shimonita.lg.jp/hukushi/m01/m02/m01/08.html) | |
| 18 | 南牧村 | 103837 | ✕ | — | ✕ | — | 公式サイトに接続できず |
| 19 | 甘楽町 | 103845 | ○ | 67/26/17/3 | ✕ | [国民健康保険税](https://www.town.kanra.lg.jp/jyuumin/jyuuminzei/news/20220803151928.html) | |
| 20 | 中之条町 | 104213 | ○ | 67/26/17/3 | ○ | [国保税について](https://www.town.nakanojo.gunma.jp/soshiki/3/13793.html) | |
| 21 | 長野原町 | 104248 | ✕ | — | ✕ | — | 国保税のページが見つからない |
| 22 | 嬬恋村 | 104256 | △ | — | ✕ | [国民健康保険税](https://www.vill.tsumagoi.gunma.jp/www/contents/1000000000055/index.html) | 令和8年度の税率は広報PDFに掲載 |
| 23 | 草津町 | 104264 | ✕ | — | ✕ | — | 国保税のページが見つからない（例規集の限度額は66万円で旧い可能性） |
| 24 | 高山村 | 104281 | ✕ | — | ✕ | — | 国保税のページが見つからない |
| 25 | 東吾妻町 | 104299 | ○ | 67/26/17/3 | ✕ | [算出方法](https://www.town.higashiagatsuma.gunma.jp/www/contents/1425610034108/index.html) | ページに年度の表記なし（子ども分ありなので令和8年度と判断） |
| 26 | 片品村 | 104434 | ○ | 67/26/17/3 | ✕ | [国民健康保険税](https://www.vill.katashina.gunma.jp/gaiyou/kakuka/jyumin/zyuuminzei/2016-1209-1640-38.html) | |
| 27 | 川場村 | 104442 | ○ | 67/—/—/— | ✕ | [国保税](https://www.vill.kawaba.gunma.jp/kurashi/tetsuzuki/nenkin/kokuhozei.html) | |
| 28 | 昭和村 | 104485 | ✕ | — | ✕ | — | 国保税のページが見つからない。**資産割あり**（医療5%・支援5%・介護4%） |
| 29 | みなかみ町 | 104493 | ○ | 67/26/17/3 | ✕ | [国民健康保険税](https://www.town.minakami.gunma.jp/life/02zeikin/2016-1013-2120-12.html) | |
| 30 | 玉村町 | 104647 | ○ | 67/26/17/3 | ✕ | [国民健康保険税](https://www.town.tamamura.lg.jp/docs/2024032600036/) | |
| 31 | 板倉町 | 105210 | ○ | 67/26/17/3 | ○ | [国民健康保険税](https://www.town.itakura.gunma.jp/cont/s006000/d006010/20121219180648.html) | 令和8年度に子ども分の所得割を0.03%で誤算定した旨の[お知らせ](https://www.town.itakura.gunma.jp/cont/s006000/d006010/20260717145823.html) |
| 32 | 明和町 | 105228 | ○ | 67/26/17/3 | ✕ | [国保税について](https://www.town.meiwa.gunma.jp/life/soshiki/zeimu/kokuho/5722.html) | |
| 33 | 千代田町 | 105236 | ○ | 67/26/17/3 | ✕（PDFの試算表） | [国保税のしくみ](https://www.town.chiyoda.gunma.jp/zeimukaikei/kotei/kotei007.html) | |
| 34 | 大泉町 | 105244 | ○ | 67/26/17/3 | ✕ | [国民健康保険税](https://www.town.oizumi.gunma.jp/s009/kurashi/020/020/040/20200806163623.html) | |
| 35 | 邑楽町 | 105252 | ○ | 67/26/17/3 | ✕ | [国保税の計算方法](https://www.town.ora.gunma.jp/s011/020/040/010/010/kokuho_keisanhouhou.html) | |

## 取得したExcel

`xlsx/`（Gitには含めない）に `<年度>-<団体コード>.<拡張子>` で置く。

| ファイル | 市町村 | 取得元 |
|---|---|---|
| 2026-102024.xlsx | 高崎市 | https://www.city.takasaki.gunma.jp/uploaded/attachment/37655.xlsx （既存と同一） |
| 2026-102032.xls | 桐生市 | https://www.city.kiryu.lg.jp/_res/projects/default_project/_page_/001/000/705/kokuhosisan2026no.3.xls |
| 2026-102041.xlsx | 伊勢崎市 | https://www.city.isesaki.lg.jp/material/files/group/31/R8kokuhozeishisan.xlsx |
| 2026-102059.xlsx | 太田市 | https://www.city.ota.gunma.jp/uploaded/attachment/41045.xlsx |
| 2026-102067.xlsx | 沼田市 | https://www.city.numata.gunma.jp/_res/projects/default_project/_page_/001/009/823/1.xlsx |
| 2026-102075.xlsx | 館林市 | https://www.city.tatebayashi.gunma.jp/s052/kenko/070/005/030/R8sisan.xlsx |
| 2026-102091.xls | 藤岡市 | https://www.city.fujioka.gunma.jp/material/files/group/12/kokuho_sisan_R8_3.xls |
| 2026-102121.xlsx | みどり市 | https://www.city.midori.gunma.jp/_res/projects/default_project/_page_/001/002/148/8nenndokokuhozeisisan.xlsx |
| 2026-104213.xlsx | 中之条町 | https://www.town.nakanojo.gunma.jp/uploaded/attachment/6327.xlsx |
| 2026-105210.xlsx | 板倉町 | https://www.town.itakura.gunma.jp/cont/s006000/d006040/R08Itakurakokuho.xlsx |

## 公式ページで確認できなかった市町村の扱い

税率は県の税率表で分かるので、試算は出す。ただし、次の項目は国の基準どおりと仮定し、画面に注意書きを出す。

- 課税限度額（医療67万円・支援26万円・介護17万円・子ども3万円）
- 軽減判定（7割・5割・2割）、未就学児の均等割5割軽減、18歳未満の子ども分均等割の全額軽減
- 端数処理と月割り（高崎市のExcelと同じ方法）
