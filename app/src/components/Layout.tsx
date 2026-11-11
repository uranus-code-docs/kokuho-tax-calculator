import { useEffect, useState } from 'react';

// 既存サイトの header.html / footer.html と同じ構造（デザインは変えない）
const TITLE = 'TakasakiCity Tax Calculator';
const REPOSITORY_URL = 'https://github.com/uranus-code-docs/kokuho-tax-calculator';

export function Header() {
  return (
    <header>
      <div className="header__logo">
        <a href="">
          <img src="./common/images/logo.svg" alt={TITLE} />
        </a>
      </div>
      <nav className="head-nav user">
        <div id="nav-drawer">
          <input id="nav-input" type="checkbox" className="nav-unshown" />
          <label id="nav-open" htmlFor="nav-input">
            <span></span>
          </label>
          <label className="nav-unshown" id="nav-close" htmlFor="nav-input"></label>
          <div id="nav-content">
            <div className="nav-drawer__profile">
              <i className="nav-drawer__profile-img">
                <img src="./common/images/no-image__user.svg" alt="" />
              </i>
              <p className="nav-drawer__profile-name">
                <em>ゲスト</em>
                <span>さん</span>
              </p>
            </div>
            <nav className="nav-drawer__buttons">
              {/* <div className="btn btn--login">
                <a href="">ログイン</a>
              </div> */}
              {/* <div className="btn btn--register">
                <a href="">新規会員登録</a>
              </div> */}
            </nav>
            <div className="nav-drawer__group">
              <p className="nav-drawer__ttl">ヘルプ</p>
              <ul className="nav-drawer__list">
                <li className="nav-drawer__item">
                  <a href="#notice">ご利用ガイド</a>
                </li>
                {/* <li className="nav-drawer__item">
                  <a href="">よくある質問</a>
                </li> */}
              </ul>
            </div>
            <div className="nav-drawer__group">
              <p className="nav-drawer__ttl">&nbsp;{/* カテゴリ名 */}</p>
              <ul className="nav-drawer__list">
                <li className="nav-drawer__item nav-drawer__item--full">
                  {/* <a href="">ページタイトル</a> */}
                </li>
              </ul>
            </div>
            <div className="nav-drawer__group nav-drawer__group--full">
              <ul className="nav-drawer__list nav-drawer__list--terms">
                {/* <li className="nav-drawer__item">
                  <a href="">利用規約</a>
                </li> */}
                {/* <li className="nav-drawer__item">
                  <a href="">個人情報保護方針</a>
                </li> */}
                <li className="nav-drawer__item">
                  <a href="https://synkro.jp/" target="_blank">運営会社</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

/** 100px以上スクロールしたら true（旧 common.js のページトップボタンと同じ） */
function useScrolled(threshold: number): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export function Footer() {
  const scrolled = useScrolled(100);
  return (
    <>
      <footer>
        <div className="l-container">
          <div className="footer__logo">
            <a href="">
              <img src="./common/images/logo-b.svg" alt={TITLE} />
            </a>
          </div>
          <ul className="foot-nav foot-subnav foot-sns c-flex c-flex--wrap"></ul>
        </div>
        <div className="foot-bottom">
          <div className="l-container c-flex c-flex--wrap foot-bottom__inner">
            <a className="foot-github" href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub（ソースコード）" title="GitHub">
              <i className="fa-brands fa-github" aria-hidden="true"></i>
            </a>
            <p className="copyright">&copy; {TITLE}.</p>
          </div>
        </div>
      </footer>
      {scrolled && (
        <div id="page_top">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <i className="ion-ios-arrow-up"></i>
          </a>
        </div>
      )}
    </>
  );
}

export function PageHead({ title, lead }: { title: string; lead: string }) {
  return (
    <>
      <div className="breadcrumb">
        <div className="l-container">
          <ol className="breadcrumb__list">
            <li className="breadcrumb__item">
              <a href="">トップ</a>
            </li>
            <li className="breadcrumb__item">{title}</li>
          </ol>
        </div>
      </div>
      <section className="subpage-head">
        <div className="l-container">
          <div className="c-head c-head--center">
            <h1 className="c-head__ttl">{title}</h1>
            <p className="c-head__txt">{lead}</p>
          </div>
        </div>
      </section>
    </>
  );
}
