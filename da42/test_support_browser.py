"""Ko-fi support navigation stays optional and leaves calculations untouched."""
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).parent
FLIGHT = (BASE / 'flight.html').resolve().as_uri()
CALC = (BASE / 'index.html').resolve().as_uri()
WB = (BASE / 'wb.html').resolve().as_uri()
KOFI = 'https://ko-fi.com/aeroui'

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=['--no-sandbox', '--allow-file-access-from-files'])
    for width, height in [(320, 690), (390, 844), (430, 932), (1280, 800)]:
        context = browser.new_context(viewport={'width': width, 'height': height})
        context.route(KOFI, lambda route: route.fulfill(status=200, content_type='text/html', body='<title>Ko-fi test destination</title>'))
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))

        page.goto(FLIGHT + '?tab=more')
        assert page.locator('.heading').inner_text() == 'MORE\nAERO UI'
        support = page.locator('#support-development a.module-card')
        assert support.count() == 1
        assert support.locator('.module-copy strong').inner_text() == 'SUPPORT DEVELOPMENT'
        assert support.get_attribute('href') == KOFI
        assert support.get_attribute('target') == '_blank'
        assert set((support.get_attribute('rel') or '').split()) == {'noopener', 'noreferrer'}
        assert 'all features remain free' in page.locator('#support-development').inner_text()
        assert page.locator('html').evaluate('(element) => element.scrollWidth') <= width
        assert support.evaluate('(element) => element.getBoundingClientRect().height >= 68')
        with page.expect_popup() as popup_info:
            support.click()
        popup = popup_info.value
        popup.wait_for_load_state()
        assert popup.url == KOFI
        assert page.url.startswith(FLIGHT)
        popup.close()

        page.goto(CALC + '?calculator=1&module=takeoff')
        before = page.locator('#main-result').inner_text()
        page.locator('#nav-more').click()
        assert page.locator('.sheet a.option').filter(has_text='SUPPORT DEVELOPMENT').get_attribute('href') == './flight.html?tab=more#support-development'
        page.locator('.sheet a.option').filter(has_text='SUPPORT DEVELOPMENT').click()
        page.wait_for_url('**/flight.html?tab=more#support-development')
        assert page.locator('#support-development a.module-card').count() == 1
        page.go_back()
        assert page.locator('#main-result').inner_text() == before

        page.goto(WB)
        before_wb = page.evaluate('JSON.stringify(WBApp.profile)')
        page.locator('#nav-more').click()
        page.locator('.sheet a.action').filter(has_text='SUPPORT DEVELOPMENT').click()
        page.wait_for_url('**/flight.html?tab=more#support-development')
        assert page.locator('#support-development a.module-card').count() == 1
        page.go_back()
        assert page.evaluate('JSON.stringify(WBApp.profile)') == before_wb
        assert not errors, errors
        context.close()
    browser.close()
print('PASS optional Ko-fi support navigation and external link on four viewports')
