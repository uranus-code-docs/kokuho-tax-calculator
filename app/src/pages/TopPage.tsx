import { useMemo, useState } from 'react';
import { Footer, Header } from '../components/Layout';
import { GunmaMap } from '../components/GunmaMap';
import { MunicipalitySearch, searchMunicipalities } from '../components/MunicipalitySearch';

/** サイトのトップページ: 見出し、群馬県の地図、市町村の検索 */
export function TopPage() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchMunicipalities(query), [query]);
  const highlighted = useMemo(() => new Set(results.map((m) => m.code)), [results]);

  return (
    <div className="wrap top-page" id="top">
      <Header />
      <main className="top-main">
        <div className="l-container top-main__inner">
          <div className="top-head">
            <h1 className="top-ttl">
              <span className="top-ttl__pref">群馬県</span>
              <span className="top-ttl__main">国民健康保険税計算機</span>
            </h1>
            <p className="top-lead">
              群馬県の市町村の国民健康保険の計算ができます。
              <br />
              吉岡町・上野村・南牧村、長野原町・草津町・高山村・昭和村は
              <br />
              県の計算式を根拠としております。
            </p>
          </div>
          <GunmaMap highlighted={highlighted} />
          <MunicipalitySearch query={query} onQueryChange={setQuery} results={results} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
