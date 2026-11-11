import { useId } from 'react';
import { MUNICIPALITIES, type MunicipalityEntry } from '../data/municipalities';

// 市町村名の読み（ひらがなでも探せるように）。群馬県の「町」はすべて「まち」
const YOMI: Record<string, string> = {
  '102016': 'まえばしし',
  '102024': 'たかさきし',
  '102032': 'きりゅうし',
  '102041': 'いせさきし',
  '102059': 'おおたし',
  '102067': 'ぬまたし',
  '102075': 'たてばやしし',
  '102083': 'しぶかわし',
  '102091': 'ふじおかし',
  '102105': 'とみおかし',
  '102113': 'あんなかし',
  '102121': 'みどりし',
  '103446': 'しんとうむら',
  '103454': 'よしおかまち',
  '103667': 'うえのむら',
  '103675': 'かんなまち',
  '103829': 'しもにたまち',
  '103837': 'なんもくむら',
  '103845': 'かんらまち',
  '104213': 'なかのじょうまち',
  '104248': 'ながのはらまち',
  '104256': 'つまごいむら',
  '104264': 'くさつまち',
  '104281': 'たかやまむら',
  '104299': 'ひがしあがつままち',
  '104434': 'かたしなむら',
  '104442': 'かわばむら',
  '104485': 'しょうわむら',
  '104493': 'みなかみまち',
  '104647': 'たまむらまち',
  '105210': 'いたくらまち',
  '105228': 'めいわまち',
  '105236': 'ちよだまち',
  '105244': 'おおいずみまち',
  '105252': 'おうらまち',
};

/** 全角・半角、カタカナ・ひらがな、大文字・小文字、空白の違いをならす */
function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '');
}

/** 市町村名（漢字・ひらがな・ローマ字の一部）で探す */
export function searchMunicipalities(query: string): MunicipalityEntry[] {
  const q = normalize(query);
  if (!q) return [];
  return MUNICIPALITIES.filter(
    (m) => normalize(m.name).includes(q) || (YOMI[m.code] ?? '').includes(q) || m.page.replace(/\.html$/, '').startsWith(q),
  );
}

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  results: readonly MunicipalityEntry[];
}

/** 市町村の検索。入力するたびに候補のリンクを出す。1件に絞れていれば「検索」でそのページへ */
export function MunicipalitySearch({ query, onQueryChange, results }: Props) {
  const id = useId();
  const hasQuery = normalize(query) !== '';

  return (
    <form
      className="top-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const [only, ...rest] = results;
        if (only && rest.length === 0) window.location.href = `./${only.page}`;
      }}
    >
      <label className="top-search__label" htmlFor={`${id}-q`}>
        市町村名で探す
      </label>
      <div className="top-search__row formset__input">
        <input
          id={`${id}-q`}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="例：高崎市、たかさき"
          autoComplete="off"
          aria-describedby={`${id}-result`}
        />
        <button type="submit" className="top-search__btn">
          検索
        </button>
      </div>
      <div id={`${id}-result`} className="top-search__result" aria-live="polite">
        {hasQuery &&
          (results.length > 0 ? (
            <ul className="top-search__list">
              {results.map((m) => (
                <li key={m.code}>
                  <a className="top-search__link" href={`./${m.page}`}>
                    {m.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="top-search__empty">該当する市町村が見つかりませんでした。</p>
          ))}
      </div>
    </form>
  );
}
