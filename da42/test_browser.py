"""Chromium responsive smoke/regression tests. Runs via page.set_content in sandbox."""
from pathlib import Path
from playwright.sync_api import sync_playwright
url=Path(__file__).with_name('index.html').resolve().as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else p.chromium.executable_path,args=['--no-sandbox','--allow-file-access-from-files'])
    all_checks=0
    for w,h in [(320,690),(390,667),(390,844),(430,932),(706,1200)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,device_scale_factor=1)
        page=ctx.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url)
        assert page.locator('#main-result').inner_text()=='638',(w,h,'takeoff')
        assert page.locator('#secondary-result').inner_text()=='406 m'
        assert page.locator('html').evaluate('(el)=>el.scrollWidth') <=w,(w,h,'horizontal overflow')
        assert page.locator('.phone').evaluate('(el)=>el.clientWidth')<=w
        assert len(errors)==0, errors
        all_checks+=5
        assert page.locator('#takeoff-procedure').inner_text()=='NORMAL · UP'
        assert page.locator('#takeoff-isa-toggle').inner_text()=='ISA'
        assert page.locator('#plot-area').inner_text().find('50 FT')!=-1
        page.locator('#takeoff-procedure').click()
        assert page.locator('#takeoff-procedure').inner_text()=='SHORT · APP'
        assert int(page.locator('#main-result').inner_text())<638
        page.locator('#takeoff-procedure').click()
        assert page.locator('#main-result').inner_text()=='638'
        page.locator('#takeoff-isa-toggle').click()
        assert page.locator('#takeoff-isa-toggle').inner_text()=='OAT'
        assert page.locator('input[data-key="oat"]').get_attribute('readonly') is not None
        page.locator('input[data-key="pa"]').fill('1000')
        assert page.locator('#main-result').inner_text()!='—'
        page.locator('#takeoff-isa-toggle').click()
        page.locator('input[data-key="pa"]').fill('0')
        page.locator('#takeoff-runway').click()
        assert page.locator('.sheet').get_by_text('RUNWAY SURFACE').count()==0
        slope=page.locator('#runway-slope')
        assert slope.get_attribute('type')=='range'
        assert slope.get_attribute('min')=='0'
        assert slope.get_attribute('max')=='5'
        assert slope.get_attribute('step')=='0.5'
        assert page.locator('.slope-limits').inner_text().split()==['0%', '5%']
        assert page.locator('#slope-value').inner_text()=='0%'
        slope.evaluate("(el)=>{el.value='2.5';el.dispatchEvent(new Event('input',{bubbles:true}))}")
        assert page.locator('#slope-value').inner_text()=='2,5%'
        assert int(page.locator('#main-result').inner_text())>638
        slope.evaluate("(el)=>{el.value='5';el.dispatchEvent(new Event('input',{bubbles:true}))}")
        assert page.locator('#slope-value').inner_text()=='5%'
        assert page.locator('#runway-slope').input_value()=='5'
        slope.evaluate("(el)=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))}")
        assert page.locator('#main-result').inner_text()=='638'
        assert page.locator('button[data-surface="grass5"]').count()==1
        page.locator('button[data-surface="grass5"]').click()
        assert 'GRASS' in page.locator('#takeoff-runway').inner_text()
        assert int(page.locator('#main-result').inner_text())>638
        page.locator('#takeoff-runway').click()
        page.locator('button[data-surface="paved"]').click()
        assert page.locator('#main-result').inner_text()=='638'
        page.locator('input[data-key="mass"]').fill('1999')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="mass"]').fill('1800')
        assert page.locator('#main-result').inner_text()=='638'
        all_checks+=31
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
        # Cruise-only ΔISA/OAT mode. Keep deviation fixed when PA changes.
        page.locator('input[data-key="load"]').fill('80')
        assert page.locator('#temp-mode-toggle').inner_text()=='ΔISA'
        page.locator('#temp-mode-toggle').click()
        assert page.locator('#temp-mode-toggle').inner_text()=='OAT'
        page.locator('input[data-key="oat"]').fill('0')
        assert page.locator('#secondary-result').inner_text()=='0 °C'
        assert page.locator('#main-result').inner_text()=='164'
        page.locator('input[data-key="oat"]').fill('10')
        assert page.locator('#secondary-result').inner_text()=='10 °C'
        page.locator('input[data-key="pa"]').fill('8000')
        assert page.locator('#secondary-result').inner_text()=='10 °C'
        page.locator('input[data-key="pa"]').fill('18000')
        assert page.locator('#secondary-result').inner_text()=='10 °C'
        assert page.locator('#main-result').inner_text()!='—',page.locator('#banner').inner_text()
        page.locator('input[data-key="load"]').fill('92')
        assert page.locator('#main-result').inner_text()!='—'
        page.locator('input[data-key="oat"]').fill('-10')
        assert page.locator('#main-result').inner_text()!='—'
        page.locator('input[data-key="oat"]').fill('30')
        assert page.locator('#main-result').inner_text()!='—'
        page.locator('input[data-key="oat"]').fill('31')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="oat"]').fill('10')
        page.locator('input[data-key="pa"]').fill('18001')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="pa"]').fill('18000')
        assert page.locator('#main-result').inner_text()!='—'
        page.locator('#temp-mode-toggle').click()
        assert page.locator('#temp-mode-toggle').inner_text()=='ΔISA'
        page.locator('#temp-mode-toggle').click()
        assert page.locator('input[data-key="oat"]').input_value()=='10.0'
        page.locator('#temp-mode-toggle').click()
        page.locator('input[data-key="oat"]').fill('30')
        assert page.locator('#main-result').inner_text()=='—'
        assert len(errors)==0,errors
        all_checks+=28
        # Landing: same four-card Aero UI, proportional airborne + ground-roll chart.
        page.locator('#menu').click()
        page.locator('button[data-module="landing"]').click()
        assert page.locator('#main-result').inner_text()=='480'
        assert page.locator('#secondary-result').inner_text()=='248 m'
        assert page.locator('.field').count()==4
        assert page.locator('#temp-mode-toggle').count()==0
        assert page.locator('#plot-area').inner_text().find('TOUCHDOWN')!=-1
        assert page.locator('#plot-area').inner_text().find('232 m')!=-1
        assert page.locator('#plot-area').inner_text().find('TOTAL 480 m')!=-1
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        page.locator('input[data-key="wind"]').fill('0')
        assert int(page.locator('#main-result').inner_text())>480
        page.locator('input[data-key="mass"]').fill('1900')
        assert int(page.locator('#main-result').inner_text())>500
        page.locator('input[data-key="pa"]').fill('10001')
        assert page.locator('#main-result').inner_text()=='—'
        assert len(errors)==0,errors
        all_checks+=12
        # Module 06: Abnormal Landing / Flaps UP or APP, same segmented graph.
        page.locator('#menu').click()
        page.locator('button[data-module="abnormal"]').click()
        assert page.locator('#main-result').inner_text()=='722'
        assert page.locator('#secondary-result').inner_text()=='418 m'
        assert page.locator('.field').count()==4
        assert page.locator('#temp-mode-toggle').count()==0
        assert '304 m' in page.locator('#plot-area').inner_text()
        assert 'TOUCHDOWN' in page.locator('#plot-area').inner_text()
        assert 'TOTAL 722 m' in page.locator('#plot-area').inner_text()
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        page.locator('input[data-key="wind"]').fill('0')
        assert int(page.locator('#main-result').inner_text())>722
        page.locator('input[data-key="mass"]').fill('1900')
        assert 'PROCEDIMENTO ANORMAL' in page.locator('#banner').inner_text()
        all_checks+=10
        # Module 07: Go-Around; strictly two AFM masses, no ISA/PA extrapolation.
        page.locator('#menu').click()
        page.locator('button[data-module="goaround"]').click()
        assert page.locator('.field').count()==4
        assert page.locator('input[data-key]').count()==0
        assert page.locator('#main-result').inner_text()=='7.5'
        assert page.locator('#secondary-result').inner_text()=='612 ft/min'
        assert '4.3°' in page.locator('.secondary-extra').inner_text()
        assert page.locator('#mass-toggle').inner_text()=='1,805'
        page.locator('#mass-toggle').click()
        assert page.locator('#main-result').inner_text()=='6.7'
        assert page.locator('#secondary-result').inner_text()=='547 ft/min'
        assert '3.8°' in page.locator('.secondary-extra').inner_text()
        assert page.locator('#mass-toggle').inner_text()=='1,900'
        assert 'PROCEDIMENTO ANORMAL' in page.locator('#banner').inner_text()
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        assert len(errors)==0,errors
        all_checks+=13
        ctx.close()
    browser.close()
    print(f'{all_checks} mobile Chromium checks passed at 5 viewport sizes.')
