"""Chromium responsive UI smoke checks — Weight & Balance module.
Not an operational or certification validation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

url=Path(__file__).with_name('wb.html').resolve().as_uri()
count=0
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,
        executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else p.chromium.executable_path,
        args=['--no-sandbox','--allow-file-access-from-files'])
    for w,h in [(320,690),(390,667),(390,844),(430,932),(706,1200)]:
        context=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,device_scale_factor=1)
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url)
        assert page.locator('#cg').inner_text()=='2.447'
        assert 'WITHIN LIMITS' in page.locator('#cg-status').inner_text()
        assert 'MASS WITHIN LIMITS' in page.locator('#mass-check').inner_text()
        assert page.locator('input[data-wb]').count()==4
        assert page.locator('#metrics').inner_text().find('1,898.5')!=-1
        assert page.locator('#metrics').inner_text().find('1,655.5')!=-1
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        assert page.locator('svg.graph polygon').count()==1
        count+=8
        page.locator('input[data-wb="pilot"]').fill('110')
        assert 'MASS LIMIT EXCEEDED' in page.locator('#mass-check').inner_text()
        page.locator('input[data-wb="pilot"]').fill('80')
        assert 'MASS WITHIN LIMITS' in page.locator('#mass-check').inner_text()
        count+=2
        page.locator('#edit-load').click()
        assert page.locator('.sheet-row input').count()==8
        assert page.locator('[data-wb^="landing"]').count()==0
        page.locator('input[data-wb="cabin"]').fill('40')
        page.locator('input[data-wb="extension"]').fill('18')
        assert 'CABIN + EXTENSION' in page.locator('#notice').inner_text()
        page.locator('input[data-wb="cabin"]').fill('10')
        assert 'CABIN + EXTENSION' not in page.locator('#notice').inner_text()
        assert 'LANDING FUEL' not in page.locator('.sheet').inner_text()
        assert 'LANDING' not in page.locator('#notice').inner_text()
        page.locator('.close').click()
        count+=5
        page.locator('#nav-scenarios').click()
        assert page.locator('.case').count()==6
        assert 'LANDING' not in page.locator('.sheet').inner_text()
        assert 'FUEL FULL' in page.locator('.sheet').inner_text()
        page.locator('.close').click()
        page.locator('#nav-settings').click()
        assert page.locator('input[data-wb="emptyMass"]').count()==1
        assert page.locator('input[data-wb="emptyMoment"]').count()==1
        assert page.locator('input[data-wb="emptyMass"]').input_value()=='1,450.0'
        page.locator('input[data-wb="emptyMass"]').fill('1470')
        assert 'CUSTOM PROFILE' in page.locator('#notice').inner_text()
        page.locator('#reset-example').click()
        assert page.locator('#cg').inner_text()=='2.447'
        count+=7
        assert len(errors)==0,errors
        context.close()
    browser.close()
print(f'PASS {count} W&B mobile Chromium checks across 5 viewport sizes')
