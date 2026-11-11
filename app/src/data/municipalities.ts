// tools/gunma/gen-pages.mjs が生成（手で編集しない）。群馬県の市町村（県の税率表の順）
export interface MunicipalityEntry {
  code: string; // 全国地方公共団体コード
  name: string;
  page: string; // ページのファイル名
}

export const MUNICIPALITIES: readonly MunicipalityEntry[] = [
  { code: '102016', name: '前橋市', page: 'maebashi.html' },
  { code: '102024', name: '高崎市', page: 'takasaki.html' },
  { code: '102032', name: '桐生市', page: 'kiryu.html' },
  { code: '102041', name: '伊勢崎市', page: 'isesaki.html' },
  { code: '102059', name: '太田市', page: 'ota.html' },
  { code: '102067', name: '沼田市', page: 'numata.html' },
  { code: '102075', name: '館林市', page: 'tatebayashi.html' },
  { code: '102083', name: '渋川市', page: 'shibukawa.html' },
  { code: '102091', name: '藤岡市', page: 'fujioka.html' },
  { code: '102105', name: '富岡市', page: 'tomioka.html' },
  { code: '102113', name: '安中市', page: 'annaka.html' },
  { code: '102121', name: 'みどり市', page: 'midori.html' },
  { code: '103446', name: '榛東村', page: 'shinto.html' },
  { code: '103454', name: '吉岡町', page: 'yoshioka.html' },
  { code: '103667', name: '上野村', page: 'ueno.html' },
  { code: '103675', name: '神流町', page: 'kanna.html' },
  { code: '103829', name: '下仁田町', page: 'shimonita.html' },
  { code: '103837', name: '南牧村', page: 'nanmoku.html' },
  { code: '103845', name: '甘楽町', page: 'kanra.html' },
  { code: '104213', name: '中之条町', page: 'nakanojo.html' },
  { code: '104248', name: '長野原町', page: 'naganohara.html' },
  { code: '104256', name: '嬬恋村', page: 'tsumagoi.html' },
  { code: '104264', name: '草津町', page: 'kusatsu.html' },
  { code: '104281', name: '高山村', page: 'takayama.html' },
  { code: '104299', name: '東吾妻町', page: 'higashiagatsuma.html' },
  { code: '104434', name: '片品村', page: 'katashina.html' },
  { code: '104442', name: '川場村', page: 'kawaba.html' },
  { code: '104485', name: '昭和村', page: 'showa.html' },
  { code: '104493', name: 'みなかみ町', page: 'minakami.html' },
  { code: '104647', name: '玉村町', page: 'tamamura.html' },
  { code: '105210', name: '板倉町', page: 'itakura.html' },
  { code: '105228', name: '明和町', page: 'meiwa.html' },
  { code: '105236', name: '千代田町', page: 'chiyoda.html' },
  { code: '105244', name: '大泉町', page: 'oizumi.html' },
  { code: '105252', name: '邑楽町', page: 'ora.html' },
];

export const DEFAULT_MUNICIPALITY = '102024';
