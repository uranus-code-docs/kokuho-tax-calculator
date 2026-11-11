import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MARGIN = 8; // 画面端との余白
const GAP = 10; // アイコンとバルーンの間隔

interface Pos {
  top: number;
  left: number;
  caretLeft: number;
  placement: 'below' | 'above';
}

/**
 * 「?」アイコン（既存の .icon-help）。クリック／Enter／Space で開閉、PCではホバーでも表示する。
 * バルーンは position: fixed でアイコンの真下（入らなければ真上）に出し、画面の端ではみ出さないよう位置を補正する。
 * 外側クリック・Escape・スクロール・リサイズで閉じる。
 */
export function HelpBalloon({ label, text }: { label: string; text: string }) {
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const iconRef = useRef<HTMLElement>(null);
  const balloonRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const open = pinned || hover;

  // 位置の計算（開いた直後にバルーンの大きさを測って決める）
  useLayoutEffect(() => {
    if (!open || !iconRef.current || !balloonRef.current) return void setPos(null);
    const icon = iconRef.current.getBoundingClientRect();
    const { width, height } = balloonRef.current.getBoundingClientRect();
    const iconCenter = icon.left + icon.width / 2;
    const left = Math.min(Math.max(iconCenter - width / 2, MARGIN), window.innerWidth - width - MARGIN);
    const fitsBelow = icon.bottom + GAP + height <= window.innerHeight - MARGIN;
    const placement = fitsBelow || icon.top - GAP - height < MARGIN ? 'below' : 'above';
    const top = placement === 'below' ? icon.bottom + GAP : icon.top - GAP - height;
    setPos({ top, left, caretLeft: Math.min(Math.max(iconCenter - left, 20), width - 20), placement });
  }, [open, text]);

  // 閉じる操作
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setPinned(false);
      setHover(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!iconRef.current?.contains(t) && !balloonRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <i
        ref={iconRef}
        className={`ion-help icon-help${open ? ' is-open' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${label}のヘルプ`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault(); // <label> の中なので、入力欄にフォーカスが移らないようにする
          setPinned((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setPinned((v) => !v);
          }
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      ></i>
      {open &&
        createPortal(
          <div
            ref={balloonRef}
            id={id}
            role="tooltip"
            className="help-balloon"
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
          >
            {text}
            <span className={`help-balloon__caret help-balloon__caret--${pos?.placement ?? 'below'}`} style={{ left: pos?.caretLeft ?? 0 }} />
          </div>,
          document.body,
        )}
    </>
  );
}
