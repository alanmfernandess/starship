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
        assert page.locator('#cg').count()==0
        assert page.locator('#cg-status').count()==0
        assert page.locator('#zfcg').count()==0
        assert page.locator('.result-head').count()==0
        assert page.locator('.primary').count()==0
        assert page.locator('.line').count()==0
        assert 'ZFW' in page.locator('.legend').inner_text()
        assert 'TOW' in page.locator('.legend').inner_text()
        assert 'WEIGHT WITHIN LIMITS' in page.locator('#mass-check').inner_text()
        assert page.locator('input[data-wb]').count()==4
        assert page.locator('#metrics').inner_text().find('1.899')!=-1
        assert page.locator('#metrics').inner_text().find('1.656')!=-1
        assert page.locator('#metrics').inner_text().find('ZFW')!=-1
        assert page.locator('#metrics').inner_text().find('TOW')!=-1
        assert '2,35' in page.locator('svg.graph').text_content()
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        # Minimal PERFORMANCE menu: three consistent destinations.
        page.locator('#menu').click()
        assert page.locator('.sheet a.action').all_inner_texts()==['FLIGHT PLAN','PERFORMANCE','WEIGHT & BALANCE']
        assert [x.split('/')[-1] for x in page.locator('.sheet a.action').evaluate_all("(xs)=>xs.map(a=>a.getAttribute('href'))")]==['flight.html','index.html?calculator=1','wb.html']
        page.locator('.close').click()
        assert page.locator('svg.graph polygon').count()==1
        count+=8
        page.locator('input[data-wb="pilot"]').fill('110')
        assert 'WEIGHT LIMIT EXCEEDED' in page.locator('#mass-check').inner_text()
        page.locator('input[data-wb="pilot"]').fill('80')
        assert 'WEIGHT WITHIN LIMITS' in page.locator('#mass-check').inner_text()
        count+=2
        assert page.locator('#edit-load').inner_text().strip()=='BAGGAGE & FUEL'
        assert page.locator('#edit-load .sub').count()==0
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
        assert '1.665,5 kg' in page.locator('.sheet').inner_text()
        assert '1.908,5 kg' in page.locator('.sheet').inner_text()
        assert 'LANDING' not in page.locator('.sheet').inner_text()
        assert 'FUEL FULL' in page.locator('.sheet').inner_text()
        assert 'study cases' not in page.locator('.sheet').inner_text()
        page.locator('.close').click()
        page.locator('#nav-settings').click()
        assert page.locator('input[data-wb="emptyMass"]').count()==1
        assert page.locator('input[data-wb="emptyMoment"]').count()==1
        assert page.locator('input[data-wb="emptyMass"]').input_value()=='1.450,0'
        page.locator('input[data-wb="emptyMass"]').fill('1470')
        assert page.locator('#notice').inner_text()=='NOT FOR FLIGHT'
        page.locator('#reset-example').click()
        assert page.locator('#envelope svg circle').count()==2
        count+=7
        # Stochastic optimizer must only generate hypothetical occupants/baggage.
        assert page.locator('#optimize').inner_text()=='OTIMIZAR'
        pre_fuel=page.evaluate("JSON.stringify([WBApp.profile.mainL,WBApp.profile.mainR,WBApp.profile.auxL,WBApp.profile.auxR,WBApp.profile.deice,WBApp.profile.emptyMass,WBApp.profile.emptyMoment])")
        page.locator('#optimize').click()
        assert page.evaluate("WBApp.optimizedMode") is True
        assert page.evaluate("WBApp.model.statuses.cgOK && WBApp.model.statuses.massOK && WBApp.model.statuses.scenariosOK") is True
        assert page.locator('#envelope svg circle').count()==2
        assert page.locator('#mass-check').inner_text().find('WEIGHT WITHIN LIMITS')!=-1
        assert page.locator('input[data-wb="pilot"]').get_attribute('readonly') is not None
        assert page.locator('input[data-wb="pax1"]').get_attribute('readonly') is not None
        assert page.locator('input[data-wb="copilot"]').get_attribute('readonly') is not None
        assert page.locator('input[data-wb="pax2"]').get_attribute('readonly') is not None
        assert page.evaluate("JSON.stringify([WBApp.profile.mainL,WBApp.profile.mainR,WBApp.profile.auxL,WBApp.profile.auxR,WBApp.profile.deice,WBApp.profile.emptyMass,WBApp.profile.emptyMoment])")==pre_fuel
        assert page.locator('#notice').inner_text()=='NOT FOR FLIGHT'
        assert page.locator('#optimize-status').count()==0
        assert 'AUTO' not in page.locator('.fields').inner_text()
        assert 'CAMPOS BLOQUEADOS' not in page.locator('.phone').inner_text()
        assert 'FUEL MANUAL' not in page.locator('.phone').inner_text()
        page.locator('#edit-load').click()
        assert page.locator('input[data-wb="nose"]').get_attribute('readonly') is not None
        assert page.locator('input[data-wb="cabin"]').get_attribute('readonly') is not None
        assert page.locator('input[data-wb="extension"]').get_attribute('readonly') is not None
        assert page.locator('input[data-wb="mainL"]').get_attribute('readonly') is None
        assert page.locator('input[data-wb="auxL"]').get_attribute('readonly') is None
        page.locator('input[data-wb="mainL"]').fill('35')
        assert page.evaluate("WBApp.profile.mainL")==35
        assert page.evaluate("WBApp.profile.mainR")==79.5
        page.locator('.close').click()
        page.locator('#optimize').click()
        assert page.evaluate("WBApp.model.statuses.cgOK && WBApp.model.statuses.massOK && WBApp.model.statuses.scenariosOK") is True
        assert page.evaluate("WBApp.profile.mainL")==35
        page.reload()
        assert page.evaluate("WBApp.optimizedMode") is True
        assert page.evaluate("WBApp.profile.mainL")==35
        assert page.locator('input[data-wb="pilot"]').get_attribute('readonly') is not None
        page.locator('#nav-settings').click()
        assert page.locator('#restore-manual').count()==1
        page.locator('#restore-manual').click()
        assert page.evaluate("WBApp.optimizedMode") is False
        assert page.evaluate("WBApp.profile.pilot")==80
        assert page.evaluate("WBApp.profile.mainL")==35
        assert page.locator('input[data-wb="pilot"]').get_attribute('readonly') is None
        count+=29
        assert len(errors)==0,errors
        context.close()
    browser.close()
print(f'PASS {count} W&B mobile Chromium checks across 5 viewport sizes')
