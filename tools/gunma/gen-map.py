"""群馬県の白地図（materials/10_群馬県白地図.eps）→ app/src/data/gunmaMap.ts

EPS は Illustrator の出力。ページ部分の PostScript から次を読み出す。
- 市町村の境界: mo / li / cv / cp ... @（線幅 2）。閉じたパス＝市町村の区域
- 引き出し線: 線幅 1.5 の 2点のパス（館林市など、区域の外に書かれた名前と区域を結ぶ線）
- 市町村名: CIDフォント（メイリオ Bold, Identity-H / Identity-V）の文字。グリフ番号を
  Windows のメイリオ（meiryob.ttc）の cmap で文字に戻す

名前の位置（引き出し線があれば線の先）を含む区域を、その市町村の区域とする。
高崎市・桐生市は区域が2つに分かれているので、名前も2つある。

使い方（リポジトリのルートで）:  python tools/gunma/gen-map.py
必要なもの: fontTools（pip install fonttools）、C:/Windows/Fonts/meiryob.ttc
"""

import glob
import json
import math
import re
from pathlib import Path

from fontTools.ttLib import TTCollection

ROOT = Path(__file__).resolve().parents[2]
EPS = Path(glob.glob(str(ROOT / 'materials' / '10_*.eps'))[0])
MUNICIPALITIES_TS = ROOT / 'app' / 'src' / 'data' / 'municipalities.ts'
OUT = ROOT / 'app' / 'src' / 'data' / 'gunmaMap.ts'
FONT = Path('C:/Windows/Fonts/meiryob.ttc')

LEADER_WIDTH = 1.5  # 引き出し線の線幅（境界線は 2）


def load_body() -> tuple[bytes, tuple[float, float]]:
    data = EPS.read_bytes().replace(b'\r\n', b'\n').replace(b'\r', b'\n')
    bbox = re.search(rb'%%HiResBoundingBox: [\d.]+ [\d.]+ ([\d.]+) ([\d.]+)', data)
    body = data[data.index(b'%%EndPageSetup'):data.index(b'%%PageTrailer')]
    # 埋め込みフォント（サブセット）は読まない
    body = re.sub(rb'%ADOBeginSubsetFont.*?%ADOEndSubsetFont', b' ', body, flags=re.S)
    return body, (float(bbox.group(1)), float(bbox.group(2)))


def ps_string(s: bytes) -> bytes:
    out = bytearray()
    i = 0
    while i < len(s):
        c = s[i]
        if c == 0x5C:  # バックスラッシュ
            m = re.match(rb'[0-7]{1,3}', s[i + 1:i + 4])
            if m:
                out.append(int(m.group(0), 8))
                i += 1 + len(m.group(0))
                continue
            out.append({ord('n'): 10, ord('r'): 13, ord('t'): 9}.get(s[i + 1], s[i + 1]))
            i += 2
            continue
        out.append(c)
        i += 1
    return bytes(out)


TEXT_RE = re.compile(
    rb'/OUKJL(.)\+\S+ findfont \[([\d.]+) 0 0 -[\d.]+ 0 0 \]msf\s*([\d.]+) ([\d.]+) mo\s*'
    rb'\(((?:\\.|[^)\\])*)\)\s*(sh|\[[^\]]*\]ysh| false chp)'
)


def read_texts(body: bytes) -> list[dict]:
    font = TTCollection(str(FONT)).fonts[0]  # Meiryo Bold
    order = font.getGlyphOrder()
    glyph_to_char: dict[str, str] = {}
    for cp, g in font.getBestCmap().items():
        # 康熙部首（U+2F00〜）ではなく、ふつうの漢字・かなを選ぶ
        if g not in glyph_to_char or 0x3040 <= cp <= 0x30FF or 0x4E00 <= cp <= 0x9FFF:
            glyph_to_char[g] = chr(cp)
    texts, seen = [], set()
    for m in TEXT_RE.finditer(body):
        if m.group(6) == b' false chp':  # 白いフチ取り（同じ文字の重ね書き）
            continue
        raw = ps_string(m.group(5))
        gids = [raw[i] << 8 | raw[i + 1] for i in range(0, len(raw), 2)]
        text = ''.join(glyph_to_char[order[g]] for g in gids)
        t = dict(text=text, size=float(m.group(2)), x=float(m.group(3)), y=float(m.group(4)), vertical=m.group(1) == b'N')
        key = (t['x'], t['y'], text)
        if key not in seen:
            seen.add(key)
            texts.append(t)
    return texts


def read_paths(body: bytes) -> list[dict]:
    body = TEXT_RE.sub(b' ', body)
    paths, cur, stack, lw = [], None, [], 2.0
    for tok in body.split():
        try:
            stack.append(float(tok))
            continue
        except ValueError:
            pass
        op = tok.decode('latin1')
        if op == 'mo':
            cur = dict(d=[('M', stack[-2:])], closed=False, lw=lw)
        elif op == 'li':
            cur['d'].append(('L', stack[-2:]))
        elif op == 'cv':
            cur['d'].append(('C', stack[-6:]))
        elif op == 'cp':
            cur['closed'] = True
        elif op == 'lw':
            lw = stack[-1]
        elif op == '@' and cur:
            paths.append(cur)
            cur = None
        stack = []
    # 先頭は版面のクリップ（0 0 から始まる四角）
    return [p for p in paths if p['d'][0][1] != [0.0, 0.0]]


def flatten(p: dict) -> list[tuple[float, float]]:
    pts, cur = [], None
    for op, a in p['d']:
        if op in 'ML':
            cur = a
            pts.append(tuple(a))
            continue
        x0, y0 = cur
        x1, y1, x2, y2, x3, y3 = a
        for i in range(1, 9):
            t = i / 8
            u = 1 - t
            pts.append((u**3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t**3 * x3,
                        u**3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t**3 * y3))
        cur = a[4:]
    return pts


def contains(poly, x, y) -> bool:
    inside = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            inside = not inside
    return inside


def area(poly) -> float:
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]))) / 2


def text_box(t):
    """文字の外接矩形（全角1文字＝1em とみなす）"""
    n, s = len(t['text']), t['size']
    if t['vertical']:  # 縦書き: x は文字の中心線、y は1文字目の上端
        return (t['x'] - s / 2, t['y'], t['x'] + s / 2, t['y'] + n * s)
    return (t['x'], t['y'] - 0.88 * s, t['x'] + n * s, t['y'] + 0.12 * s)


def box_dist(box, x, y) -> float:
    dx = max(box[0] - x, 0, x - box[2])
    dy = max(box[1] - y, 0, y - box[3])
    return math.hypot(dx, dy)


def num(v: float) -> str:
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return s if s != '-0' else '0'


def to_d(p: dict) -> str:
    out = []
    for op, a in p['d']:
        out.append(op + ' '.join(num(v) for v in a))
    return ''.join(out) + 'Z'


def main():
    body, (width, height) = load_body()
    texts = [t for t in read_texts(body) if t['size'] < 20]  # 右下の大きな「群馬県」は使わない
    paths = read_paths(body)
    leaders = [p for p in paths if p['lw'] == LEADER_WIDTH and len(p['d']) == 2]
    areas = [p for p in paths if p['lw'] != LEADER_WIDTH and len(p['d']) > 2]
    polys = [flatten(p) for p in areas]

    names = dict(re.findall(r"code: '(\d+)', name: '([^']+)'", MUNICIPALITIES_TS.read_text(encoding='utf-8')))
    code_of = {name: code for code, name in names.items()}

    # 引き出し線は、端が名前にいちばん近いものに付ける。もう一方の端が区域を指す
    leader_of = {}
    for li, L in enumerate(leaders):
        ends = [tuple(L['d'][0][1]), tuple(L['d'][1][1])]
        best = min((box_dist(text_box(t), *e), ti, ei) for ti, t in enumerate(texts) for ei, e in enumerate(ends))
        _, ti, ei = best
        leader_of[ti] = (ends[ei], ends[1 - ei])

    result: dict[str, dict] = {}
    used = set()
    for ti, t in enumerate(texts):
        if ti in leader_of:
            (lx, ly), (px, py) = leader_of[ti]
        else:
            b = text_box(t)
            px, py = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        hits = sorted((area(poly), i) for i, poly in enumerate(polys) if contains(poly, px, py))
        if not hits:
            raise SystemExit(f'区域が見つからない: {t["text"]}')
        pi = hits[0][1]
        if pi in used:
            raise SystemExit(f'区域が重複: {t["text"]}')
        used.add(pi)
        code = code_of[t['text']]
        entry = result.setdefault(code, dict(code=code, name=t['text'], paths=[], labels=[]))
        entry['paths'].append(to_d(areas[pi]))
        label = dict(x=round(t['x'], 2), y=round(t['y'], 2), size=t['size'])
        if t['vertical']:
            label['vertical'] = True
        if ti in leader_of:
            label['leader'] = [round(v, 2) for v in (*leader_of[ti][1], *leader_of[ti][0])]
        entry['labels'].append(label)

    if len(used) != len(polys):
        raise SystemExit(f'名前のない区域がある: {sorted(set(range(len(polys))) - used)}')
    missing = set(names) - set(result)
    if missing:
        raise SystemExit(f'地図にない市町村: {[names[c] for c in missing]}')

    order = list(names)  # municipalities.ts の順（県の税率表の順）
    rows = [json.dumps(result[c], ensure_ascii=False, separators=(',', ':')) for c in order]
    OUT.write_text(
        '// tools/gunma/gen-map.py が materials/10_群馬県白地図.eps から生成（手で編集しない）\n'
        '// 座標は EPS の版面（左上が原点、単位 pt）。leader は引き出し線 [区域側x, y, 名前側x, y]\n'
        'export interface GunmaMapLabel {\n'
        '  x: number; // 横書き: 1文字目の左端・ベースライン。縦書き: 文字の中心線・1文字目の上端\n'
        '  y: number;\n'
        '  size: number;\n'
        '  vertical?: boolean;\n'
        '  leader?: [number, number, number, number];\n'
        '}\n\n'
        'export interface GunmaMapArea {\n'
        '  code: string; // 全国地方公共団体コード\n'
        '  name: string;\n'
        '  paths: string[]; // 区域（飛び地があれば複数）\n'
        '  labels: GunmaMapLabel[];\n'
        '}\n\n'
        f'export const GUNMA_MAP_SIZE = {{ width: {num(width)}, height: {num(height)} }};\n\n'
        'export const GUNMA_MAP_AREAS: readonly GunmaMapArea[] = [\n'
        + ''.join(f'  {r},\n' for r in rows)
        + '];\n',
        encoding='utf-8',
        newline='\n',
    )
    print(f'{OUT.relative_to(ROOT)}: {len(result)} 市町村, {len(polys)} 区域, 引き出し線 {len(leaders)}')


if __name__ == '__main__':
    main()
