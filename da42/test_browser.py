"""Chromium responsive smoke/regression tests. Runs via page.set_content in sandbox."""
from pathlib import Path
from playwright.sync_api import sync_playwright
html=Path(__file__).with_name('index.html').read_text()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    all_checks=0
    for w,h in [(320,690),(390,667),(390,844),(430,932),(706,1200)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,device_scale_factor=1)
        page=ctx.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html)
        assert page.locator('#main-result').inner_text()=='610',(w,h,'takeoff')
        assert page.locator('#secondary-result').inner_text()=='370 m'
        assert page.locator('html').evaluate('(el)=>el.scrollWidth') <=w,(w,h,'horizontal overflow')
        assert page.locator('.phone').evaluate('(el)=>el.clientWidth')<=w
        assert len(errors)==0, errors
        all_checks+=5
        page.locator('#menu').click()
        page.locator('button[data-module="climb"]').click()
        assert page.locator('#main-result').inner_text()=='1,150'
        assert page.locator('#secondary-result').inner_text()=='5.8 m/s'
        all_checks+=2
        page.locator('#menu').click()
        page.locator('button[data-module="oei"]').click()
        assert page.locator('#main-result').inner_text()=='212'
        assert page.locator('#secondary-result').inner_text()=='1.07 m/s'
        all_checks+=2
        page.locator('#menu').click()
        page.locator('button[data-module="cruise"]').click()
        assert page.locator('#main-result').inner_text()=='164'
        assert page.locator('#secondary-result').inner_text()=='0 °C'
        assert page.locator('.field.readonly .power-value').inner_text()=='2'
        assert page.locator('input[data-key="load"]').count()==1
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        page.locator('input[data-key="load"]').fill('92')
        assert int(page.locator('#main-result').inner_text()) > 164
        page.locator('input[data-key="oat"]').fill('30')
        assert page.locator('#main-result').inner_text()=='—'
        assert len(errors)==0,errors
        all_checks+=8
        ctx.close()
    browser.close()
    print(f'{all_checks} mobile Chromium checks passed at 5 viewport sizes.')
