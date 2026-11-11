import { useState } from 'react';
import { GUNMA_MAP_AREAS, GUNMA_MAP_SIZE, type GunmaMapLabel } from '../data/gunmaMap';
import { MUNICIPALITIES } from '../data/municipalities';

const PAGE_OF = new Map(MUNICIPALITIES.map((m) => [m.code, `./${m.page}`]));
const FILL_ID = 'gmap-fill';

/**
 * 群馬県の市町村の地図（SVG をそのまま描く）。
 * 区域・引き出し線・名前を別の層に重ねるので、ホバーは state で区域と名前の両方に伝える。
 * highlighted の市町村は、ホバーしたときと同じ見た目にする（検索結果）
 */
export function GunmaMap({ highlighted }: { highlighted: ReadonlySet<string> }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const isActive = (code: string) => code === hovered || highlighted.has(code);
  const handlers = (code: string) => ({
    onMouseEnter: () => setHovered(code),
    onMouseLeave: () => setHovered((h) => (h === code ? null : h)),
    onFocus: () => setHovered(code),
    onBlur: () => setHovered((h) => (h === code ? null : h)),
  });
  const { width, height } = GUNMA_MAP_SIZE;

  return (
    <svg className="gmap" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="群馬県の市町村の地図">
      <defs>
        {/* ブルーにほんの少しのグラデーション（地図全体で1枚） */}
        <linearGradient id={FILL_ID} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width * 0.6} y2={height}>
          <stop offset="0" className="gmap__fill-start" />
          <stop offset="1" className="gmap__fill-end" />
        </linearGradient>
      </defs>

      <g className="gmap__areas">
        {GUNMA_MAP_AREAS.map((a) => (
          <a key={a.code} href={PAGE_OF.get(a.code)} aria-label={a.name} className={cls('gmap__area', isActive(a.code))} {...handlers(a.code)}>
            {a.paths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </a>
        ))}
      </g>

      <g className="gmap__leaders" aria-hidden="true">
        {GUNMA_MAP_AREAS.flatMap((a) =>
          a.labels.filter((l) => l.leader).map((l, i) => <line key={`${a.code}-${i}`} x1={l.leader![0]} y1={l.leader![1]} x2={l.leader![2]} y2={l.leader![3]} />),
        )}
      </g>

      {/* 名前も区域と同じリンク（キーボードでは区域のリンクだけを辿る） */}
      <g className="gmap__labels" aria-hidden="true">
        {GUNMA_MAP_AREAS.flatMap((a) =>
          a.labels.map((l, i) => (
            <a key={`${a.code}-${i}`} href={PAGE_OF.get(a.code)} tabIndex={-1} className={cls('gmap__label', isActive(a.code), !!l.leader)} {...handlers(a.code)}>
              {l.leader && <Capsule label={l} chars={a.name.length} />}
              <text
                x={l.x}
                y={l.y}
                fontSize={l.size}
                style={l.vertical ? { writingMode: 'vertical-rl' } : undefined}
              >
                {a.name}
              </text>
            </a>
          )),
        )}
      </g>
    </svg>
  );
}

/** 区域の外に書かれた名前（館林市など）を囲むカプセル */
function Capsule({ label, chars }: { label: GunmaMapLabel; chars: number }) {
  const s = label.size;
  const padX = s * 0.5;
  const h = s * 1.5;
  const cy = label.y - s * 0.38; // 全角文字の中心（ベースラインの少し上）
  return <rect x={label.x - padX} y={cy - h / 2} width={chars * s + padX * 2} height={h} rx={h / 2} />;
}

function cls(base: string, active: boolean, capsule = false): string {
  return [base, active && 'is-active', capsule && `${base}--capsule`].filter(Boolean).join(' ');
}
