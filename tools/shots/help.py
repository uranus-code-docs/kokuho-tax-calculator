from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, tag, label in [(1280, 760, 'pc', '給与収入'), (1280, 760, 'pc2', '生年月日'), (390, 800, 'sp', '給与収入')]:
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.goto('http://localhost:4173/', wait_until='networkidle')
        pg.wait_for_timeout(500)
        pg.get_by_role('button', name=f'{label}のヘルプ').first.click()
        pg.wait_for_timeout(200)
        pg.screenshot(path=f'C:/htdocs-c/00-tax/tools/shots/help-{tag}.png')
        box = pg.locator('.help-balloon').bounding_box()
        print(tag, label, 'balloon', {k: round(v) for k, v in box.items()}, 'viewport', w)
        pg.close()
    b.close()
