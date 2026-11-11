import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 900})
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:4173/', wait_until='networkidle')
    pg.screenshot(path=f'{out}/1-initial.png', full_page=True)
    # 公式の計算例: 本人42歳(営業所得250万円)・妻38歳・子12歳
    pg.fill('#m0-birth', '1983-06-01')
    pg.fill('#m0-other', '2500000')
    pg.click('text=追加'); pg.click('text=追加')
    pg.select_option('#m1-relation', '妻（夫）'); pg.fill('#m1-birth', '1987-06-01')
    pg.select_option('#m2-relation', '子'); pg.fill('#m2-birth', '2013-06-01')
    pg.wait_for_timeout(300)
    pg.screenshot(path=f'{out}/2-example.png', full_page=True)
    vals = {k: pg.locator(f'[data-item="{k}"]').first.get_attribute('data-item-val') for k in ['国保税', '医療分', '支援金分', '介護分', '子ども分']}
    print('結果:', vals)
    print('console errors:', errs)
    # スマホ幅
    pg.set_viewport_size({'width': 390, 'height': 800})
    pg.screenshot(path=f'{out}/3-mobile.png', full_page=True)
    b.close()
