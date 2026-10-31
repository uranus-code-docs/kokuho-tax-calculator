from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, tag in [(1280, 900, 'pc'), (390, 800, 'sp')]:
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.goto('http://localhost:4173/', wait_until='networkidle')
        pg.wait_for_timeout(800)
        pg.screenshot(path=f'C:/htdocs-c/00-tax/tools/shots/new-{tag}-top.png')
        pg.close()
    b.close()
