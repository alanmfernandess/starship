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
        assert page.locator('.module-heading .name').inner_text()=='TAKEOFF PERFORMANCE'
        assert page.locator('#analysis-settings').count()==1
        assert page.locator('#takeoff-procedure, #takeoff-runway').count()==0
        assert page.locator('#takeoff-isa-toggle').inner_text()=='ISA'
        assert page.locator('input[data-key="length"]').count()==1
        assert page.locator('#plot-area').inner_text().find('50 FT')!=-1
        assert page.locator('#runway-margin').count()==1
        assert page.locator('#runway-max-weight').count()==1
        page.locator('#analysis-settings').click()
        page.locator('#rw-takeoff').click()
        page.locator('button[data-rw-pick="short"]').click()
        page.locator('#rw-save-back').click()
        assert page.evaluate("window.AeroCalc.inputs.takeoff.procedure")=='short'
        assert int(page.locator('#main-result').inner_text())<638
        page.locator('#analysis-settings').click()
        page.locator('#rw-takeoff').click()
        page.locator('button[data-rw-pick="normal"]').click()
        page.locator('#rw-save-back').click()
        assert page.locator('#main-result').inner_text()=='638'
        page.locator('#takeoff-isa-toggle').click()
        assert page.locator('#takeoff-isa-toggle').inner_text()=='OAT'
        assert page.locator('input[data-key="oat"]').get_attribute('readonly') is not None
        page.locator('input[data-key="pa"]').fill('1000')
        assert page.locator('#main-result').inner_text()!='—'
        page.locator('#takeoff-isa-toggle').click()
        page.locator('input[data-key="pa"]').fill('0')
        page.locator('#analysis-settings').click()
        assert page.locator('#rw-slope').get_attribute('type')=='range'
        page.locator('#rw-slope').evaluate("(el)=>{el.value='2.5';el.dispatchEvent(new Event('input',{bubbles:true}))}")
        assert page.locator('#rw-slope-output').inner_text()=='2,5%'
        page.locator('#rw-save-back').click()
        assert int(page.locator('#main-result').inner_text())>638
        page.locator('#analysis-settings').click()
        page.locator('#rw-slope').evaluate("(el)=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))}")
        page.locator('#rw-surface').click()
        page.locator('button[data-rw-pick="grass5"]').click()
        page.locator('#rw-save-back').click()
        assert int(page.locator('#main-result').inner_text())>638
        page.locator('#analysis-settings').click()
        page.locator('#rw-surface').click()
        page.locator('button[data-rw-pick="paved"]').click()
        page.locator('#rw-save-back').click()
        assert page.locator('#main-result').inner_text()=='638'
        page.locator('input[data-key="mass"]').fill('1999')
        page.locator('input[data-key="mass"]').blur()
        assert page.locator('input[data-key="mass"]').input_value()=='1999'
        assert page.locator('#main-result').inner_text()!='—'
        page.locator('input[data-key="mass"]').fill('2000')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="mass"]').fill('1800')
        assert page.locator('#main-result').inner_text()=='638'
        all_checks+=31
        page.locator('#menu').click()
        expected_modules=[
            'TAKEOFF PERFORMANCE',
            'CLIMB PERFORMANCE',
            'CRUISE PERFORMANCE',
            'LANDING PERFORMANCE',
            'GO-AROUND PERFORMANCE'
        ]
        assert page.locator('.sheet button[data-module] strong').all_inner_texts()==expected_modules
        assert page.locator('.sheet a.option[href="./wb.html"] strong').inner_text()=='WEIGHT & BALANCE'
        assert page.locator('.sheet .option').count()==7
        assert page.locator('.sheet a.option[href="./flight.html"] strong').inner_text()=='FLIGHT PLAN'
        assert page.locator('.sheet .option .sub').count()==0
        assert page.locator('.sheet .option').evaluate_all("(xs)=>xs.every(x=>x.querySelectorAll('strong').length===1)")
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        all_checks+=6
        page.locator('button[data-module="climb"]').click()
        assert page.locator('#main-result').inner_text()=='1,148'
        assert page.locator('#secondary-result').inner_text()=='5.8 m/s'
        def verify_vertical_graph(direction):
            chart=page.locator('#plot-area svg.vertical-rate-plot')
            assert chart.count()==1,(w,h,'missing vertical-rate plot')
            start=float(chart.get_attribute('data-baseline-y'))
            end=float(chart.get_attribute('data-end-y'))
            assert chart.get_attribute('data-direction')==direction,(w,h,chart.get_attribute('data-direction'),direction)
            if direction=='subida':assert end<start,(w,h,'chart must ascend',start,end)
            elif direction=='descida':assert end>start,(w,h,'chart must descend',start,end)
            else:assert end==start,(w,h,'zero ROC must be level',start,end)
            assert '1 MIN' in chart.text_content()
            curve=chart.locator('path.vertical-curve')
            assert curve.count()==1,(w,h,'missing Aero UI spline')
            pathdata=curve.get_attribute('d')
            assert pathdata.count(' C')==1 and ' L' not in pathdata,(w,h,'curve must be a cubic, not straight segments',pathdata)
        verify_vertical_graph('subida')
        assert page.locator('#climb-flaps').inner_text()=='FLAPS UP'
        assert page.locator('#climb-isa-toggle').inner_text()=='ISA'
        page.locator('#climb-flaps').click()
        assert page.locator('#climb-flaps').inner_text()=='FLAPS APP'
        assert page.locator('#main-result').inner_text()=='1,120'
        page.locator('#climb-flaps').click()
        page.locator('input[data-key="mass"]').fill('1999')
        assert page.locator('#main-result').inner_text()=='975'
        assert 'VY 92 KIAS' in page.locator('#banner').inner_text()
        page.locator('#climb-flaps').click()
        assert page.locator('#main-result').inner_text()=='950'
        assert 'VY 85 KIAS' in page.locator('#banner').inner_text()
        page.locator('#climb-isa-toggle').click()
        assert page.locator('#main-result').inner_text()=='953'
        assert page.locator('input[data-key="oat"]').get_attribute('readonly') is not None
        page.locator('#climb-flaps').click()
        assert page.locator('#main-result').inner_text()=='982'
        page.locator('input[data-key="pa"]').fill('2000')
        assert page.locator('#main-result').inner_text()=='956'
        page.locator('input[data-key="pa"]').fill('18000')
        assert page.locator('#main-result').inner_text()=='512'
        page.locator('#climb-isa-toggle').click()
        page.locator('input[data-key="oat"]').fill('50')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="pa"]').fill('0')
        page.locator('input[data-key="oat"]').fill('10')
        page.locator('input[data-key="mass"]').fill('2000')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="mass"]').fill('1900')
        assert page.locator('#main-result').inner_text()=='1,070'
        all_checks+=25
        page.evaluate("() => Object.assign(window.AeroCalc.inputs.climb,{pa:0,oat:15,mass:1800,isa:false,flaps:'up'})")
        page.locator('#climb-mode-oei').click()
        assert page.locator('.oei-note').count()==1
        assert page.locator('.climb-profile').count()==0
        assert page.locator('#main-result').inner_text()=='211'
        assert page.locator('#secondary-result').inner_text()=='1.07 m/s'
        verify_vertical_graph('subida')
        assert page.locator('.field').count()==4
        assert page.locator('.power-note').count()==0
        assert 'ONE ENGINE (REMAINING)' not in page.locator('.fields').inner_text()
        # Fixed engine-power value must use the same Aero UI typography as inputs.
        typography=page.evaluate("""() => {
            const fields=['#val-pa','.field.readonly .power-value'];
            return fields.map(selector=>{
                const cs=getComputedStyle(document.querySelector(selector));
                return {
                    fontSize:cs.fontSize,
                    fontWeight:cs.fontWeight,
                    lineHeight:cs.lineHeight,
                    letterSpacing:cs.letterSpacing,
                    fontFamily:cs.fontFamily,
                    fontVariantNumeric:cs.fontVariantNumeric
                };
            });
        }""")
        assert typography[0]==typography[1],(w,h,'engine power font mismatch',typography)
        assert page.locator('#climb-isa-toggle').inner_text()=='ISA'
        def verify_cards_aligned():
            pa=page.locator('#val-pa').bounding_box()
            oat=page.locator('#val-oat').bounding_box()
            pa_label=page.locator('label[for="val-pa"]').bounding_box()
            oat_label=page.locator('label[for="val-oat"]').bounding_box()
            oat_card=page.locator('#val-oat').locator('xpath=../..').bounding_box()
            isa_button=page.locator('#climb-isa-toggle').bounding_box()
            assert abs(pa['y']-oat['y'])<=2, (w,h,'numeric input misalignment',pa,oat)
            assert abs(pa_label['y']-oat_label['y'])<=2, (w,h,'label misalignment',pa_label,oat_label)
            assert isa_button['x']>=oat_card['x'] and isa_button['x']+isa_button['width']<=oat_card['x']+oat_card['width'],(w,h,'ISA toggle outside OAT card')
        verify_cards_aligned()
        assert 'VYSE 85 KIAS' in page.locator('#banner').inner_text()
        page.locator('input[data-key="mass"]').fill('1999')
        assert page.locator('#main-result').inner_text()=='138'
        page.locator('#climb-isa-toggle').click()
        assert page.locator('#climb-isa-toggle').inner_text()=='OAT'
        assert page.locator('input[data-key="oat"]').get_attribute('readonly') is not None
        verify_cards_aligned()
        assert page.locator('#main-result').inner_text()=='140'
        page.locator('input[data-key="pa"]').fill('18000')
        assert page.locator('#main-result').inner_text()=='-169'
        assert page.locator('#result-name').inner_text()=='RATE OF DESCENT'
        assert page.locator('#secondary-result').inner_text().startswith('-')
        verify_vertical_graph('descida')
        assert 'NEGATIVE ROC' in page.locator('#banner').inner_text()
        page.locator('input[data-key="pa"]').fill('4000')
        page.locator('#climb-isa-toggle').click()
        page.locator('input[data-key="oat"]').fill('50')
        assert page.locator('#main-result').inner_text()=='0'
        verify_vertical_graph('altitude constante')
        assert '< 50' in page.locator('#banner').inner_text()
        page.locator('input[data-key="pa"]').fill('6000')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="oat"]').fill('40')
        assert page.locator('#main-result').inner_text()=='0'
        page.locator('input[data-key="mass"]').fill('2000')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="mass"]').fill('1900')
        page.locator('input[data-key="pa"]').fill('0')
        page.locator('input[data-key="oat"]').fill('10')
        assert page.locator('#main-result').inner_text()=='180'
        all_checks+=39
        page.locator('#climb-mode-both').click()
        assert page.locator('.oei-note').count()==0
        assert page.locator('.climb-profile').count()==1
        page.locator('#menu').click()
        assert page.locator('button[data-module="cruise"]').count()==0
        page.locator('.sheet .close').click()
        all_checks+=5
        # Landing: same four-card Aero UI, proportional airborne + ground-roll chart.
        # AFM §5.3.11: Landing 4 cards, ISA and runway corrections.
        page.locator('#menu').click()
        page.locator('button[data-module="landing"]').click()
        assert page.locator('#main-result').inner_text()=='557'
        assert page.locator('#secondary-result').inner_text()=='330 m'
        assert page.locator('.field').count()==4
        assert page.locator('#landing-isa-toggle').inner_text()=='ISA'
        assert 'TOTAL 557 m' in page.locator('#plot-area').inner_text()
        page.locator('#landing-isa-toggle').click()
        assert page.locator('#main-result').inner_text()=='554'
        assert page.locator('input[data-key="oat"]').get_attribute('readonly') is not None
        page.locator('#landing-isa-toggle').click()
        assert page.locator('#main-result').inner_text()=='557'
        page.locator('#landing-runway').click()
        assert page.locator('#runway-wet').inner_text()=='WET PAVEMENT · OFF'
        assert page.locator('#runway-slope').get_attribute('min')=='0'
        assert page.locator('#runway-slope').get_attribute('max')=='5'
        page.locator('#runway-wet').click()
        assert page.locator('#main-result').inner_text()=='641'
        page.locator('#landing-runway').click()
        page.locator('#runway-wet').click()
        assert page.locator('#main-result').inner_text()=='557'
        page.locator('#landing-runway').click()
        page.locator('button[data-surface="grass10"]').click()
        assert page.locator('#main-result').inner_text()=='607'
        page.locator('#landing-runway').click()
        page.locator('button[data-surface="paved"]').click()
        assert page.locator('#main-result').inner_text()=='557'
        page.locator('input[data-key="wind"]').fill('0')
        assert page.locator('#main-result').inner_text()=='600'
        page.locator('input[data-key="mass"]').fill('1900')
        assert page.locator('#main-result').inner_text()=='620'
        page.locator('input[data-key="pa"]').fill('10001')
        assert page.locator('#main-result').inner_text()=='—'
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        all_checks+=25
        # AFM §5.3.11: abnormal APP/UP table, strict no-data cells.
        page.locator('input[data-key="pa"]').fill('0')
        page.locator('input[data-key="mass"]').fill('1800')
        page.locator('input[data-key="wind"]').fill('10')
        page.locator('#landing-mode-abnormal').click()
        assert page.locator('#landing-mode-abnormal').get_attribute('aria-pressed')=='true'
        assert page.locator('#main-result').inner_text()=='761'
        assert page.locator('#secondary-result').inner_text()=='453 m'
        assert page.locator('.field').count()==4
        assert page.locator('#landing-isa-toggle').inner_text()=='ISA'
        assert page.locator('#landing-runway').count()==1
        assert 'TOTAL 761 m' in page.locator('#plot-area').inner_text()
        page.locator('input[data-key="wind"]').fill('0')
        assert page.locator('#main-result').inner_text()=='820'
        page.locator('input[data-key="mass"]').fill('1900')
        assert page.locator('#main-result').inner_text()=='855'
        assert 'PROCEDIMENTO ANORMAL' in page.locator('#banner').inner_text()
        page.locator('input[data-key="mass"]').fill('1999')
        page.locator('input[data-key="oat"]').fill('50')
        page.locator('input[data-key="pa"]').fill('6000')
        assert page.locator('#main-result').inner_text()=='—'
        assert 'CÉLULA NÃO PUBLICADA' in page.locator('#banner').inner_text()
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        all_checks+=16
        # AFM §5.3.12: Go-Around; full 1700–1999kg, OAT & ISA and no-data cells.
        page.locator('#menu').click()
        page.locator('button[data-module="goaround"]').click()
        assert page.locator('.field').count()==4
        assert page.locator('input[data-key]').count()==3
        assert page.locator('#main-result').inner_text()=='547'
        assert page.locator('#secondary-result').inner_text()=='2.78 m/s'
        assert '3.8°' in page.locator('.secondary-extra').inner_text()
        assert page.locator('#goaround-isa-toggle').inner_text()=='OAT'
        assert page.locator('input[data-key="oat"]').get_attribute('readonly') is not None
        assert page.locator('.field.readonly .power-value').inner_text()=='84'
        assert page.locator('#plot-area svg.vertical-rate-plot').count()==1
        assert ' C' in page.locator('#plot-area path.vertical-curve').get_attribute('d')
        assert page.locator('#plot-area svg.vertical-rate-plot').get_attribute('data-direction')=='subida'
        page.locator('input[data-key="mass"]').fill('1999')
        assert page.locator('#main-result').inner_text()=='454'
        assert '3.1°' in page.locator('.secondary-extra').inner_text()
        assert page.locator('.field.readonly .power-value').inner_text()=='86'
        page.locator('input[data-key="mass"]').fill('1805')
        assert page.locator('#main-result').inner_text()=='615'
        assert '4.3°' in page.locator('.secondary-extra').inner_text()
        assert page.locator('.field.readonly .power-value').inner_text()=='84'
        page.locator('input[data-key="mass"]').fill('1700')
        assert page.locator('#main-result').inner_text()=='690'
        assert not page.locator('.secondary-extra').is_visible()
        page.locator('input[data-key="pa"]').fill('2000')
        assert page.locator('#main-result').inner_text()=='659'
        assert page.locator('input[data-key="oat"]').input_value()=='11'
        page.locator('#goaround-isa-toggle').click()
        assert page.locator('#goaround-isa-toggle').inner_text()=='ISA'
        assert page.locator('input[data-key="oat"]').get_attribute('readonly') is None
        assert page.locator('#main-result').inner_text()=='658'
        page.locator('input[data-key="mass"]').fill('1999')
        page.locator('input[data-key="pa"]').fill('6000')
        page.locator('input[data-key="oat"]').fill('50')
        assert page.locator('#main-result').inner_text()=='—'
        assert 'CÉLULA NÃO PUBLICADA' in page.locator('#banner').inner_text()
        page.locator('input[data-key="pa"]').fill('10001')
        assert page.locator('#main-result').inner_text()=='—'
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        assert len(errors)==0,errors
        all_checks+=30
        # AFM §5.3.9 profile shares CLIMB inputs; independent engine retained.
        page.locator('#menu').click()
        assert page.locator('button[data-module="timeclimb"]').count()==0
        page.evaluate("() => Object.assign(window.AeroCalc.inputs.climb,{pa:2000,oat:11,mass:1900,isa:false,flaps:'up',profileTarget:16000,engineMode:'both'})")
        page.locator('button[data-module="climb"]').click()
        assert page.locator('#climb-mode-both').get_attribute('aria-pressed')=='true'
        assert page.locator('#profile-time').inner_text()=='15.0 MIN'
        assert page.locator('#profile-fuel').inner_text()=='4.2 US GAL'
        assert page.locator('#profile-distance').inner_text()=='26.0 NM'
        assert page.locator('#val-profileTarget').input_value()=='16000'
        page.locator('input[data-key="oat"]').fill('21')
        assert page.locator('#profile-time').inner_text()=='16.5 MIN'
        page.locator('input[data-key="oat"]').fill('11')
        page.locator('#climb-flaps').click()
        assert page.locator('.profile-caution').count()==1
        assert page.locator('#profile-time').inner_text()=='—'
        page.locator('#climb-flaps').click()
        assert page.locator('#profile-time').inner_text()=='15.0 MIN'
        all_checks+=15
        # Cruise Performance §5.3.10 — published 1999kg power/FF/TAS grids.
        page.locator('#menu').click()
        assert page.locator('button[data-module="cruiseperf"]').count()==1
        page.locator('button[data-module="cruiseperf"]').click()
        assert page.locator('.field').count()==4
        assert page.locator('input[data-key="mass"]').count()==0
        assert page.locator('.field.readonly .power-value').inner_text()=='1999'
        assert page.locator('#main-result').inner_text()=='156'
        assert page.locator('#secondary-result').inner_text()=='13.0 US gal/h'
        assert page.locator('#val-pa').input_value()=='10000'
        assert page.locator('.module-heading .accent').count()==0
        page.locator('#val-pa').focus()
        page.locator('#val-pa').blur()
        assert page.locator('#val-pa').input_value()=='10000'
        assert page.locator('.field .entry').evaluate_all("""(rows)=>rows.every(r=>{
          const input=r.querySelector('input');
          const output=r.querySelector('output');
          if(!input||!output)return true;
          const a=input.getBoundingClientRect(),b=output.getBoundingClientRect();
          const c=document.createElement('canvas').getContext('2d');
          const st=getComputedStyle(input);c.font=st.font;
          return a.right<=b.left+1 && c.measureText(input.value).width<=a.width+3;
        })"""),(w,h,'cruise entry alignment')
        assert all(',' not in v for v in page.locator('.field input').evaluate_all("(els)=>els.map(e=>e.value)"))
        assert page.locator('#cruise-config').inner_text()=='STANDARD'
        assert page.locator('#plot-area svg.cruise-performance-plot').count()==1
        assert page.locator('#plot-area path.cruise-performance-curve').count()>=1
        assert ' C' in page.locator('#plot-area path.cruise-performance-curve').first.get_attribute('d')
        page.locator('input[data-key="load"]').fill('92')
        assert page.locator('#main-result').inner_text()=='172'
        assert page.locator('#secondary-result').inner_text()=='16.5 US gal/h'
        page.locator('#cruise-config').click()
        assert page.locator('#cruise-config').inner_text()=='OÄM −2%'
        assert page.locator('#main-result').inner_text()=='169'
        assert page.locator('#secondary-result').inner_text()=='16.5 US gal/h'
        page.locator('#cruise-config').click()
        assert page.locator('#main-result').inner_text()=='172'
        page.locator('#temp-mode-toggle').click()
        assert page.locator('#val-oat').input_value()=='0.0'
        page.locator('input[data-key="oat"]').fill('30')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="load"]').fill('90')
        assert page.locator('#main-result').inner_text()=='174'
        assert page.locator('#secondary-result').inner_text()=='16.1 US gal/h'
        page.locator('input[data-key="pa"]').fill('18000')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="load"]').fill('75')
        assert page.locator('#main-result').inner_text()=='168'
        assert page.locator('#secondary-result').inner_text()=='13.0 US gal/h'
        page.locator('input[data-key="pa"]').fill('19000')
        assert page.locator('#main-result').inner_text()=='—'
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        assert len(errors)==0,errors
        all_checks+=29
        # Unified Takeoff Performance retains independent runway analysis.
        page.locator('#menu').click()
        assert page.locator('button[data-module="runway"]').count()==0
        page.locator('button[data-module="takeoff"]').click()
        assert page.locator('.field').count()==4
        assert page.locator('.takeoff-tora').count()==1
        assert page.locator('#runway-margin').count()==1
        assert page.locator('#runway-max-weight').count()==1
        assert page.locator('.runway-speeds').inner_text().count('KIAS')==3
        assert page.locator('#main-result').inner_text()!='—'
        assert page.evaluate("window.AeroCalc.inputs.takeoff === window.AeroCalc.inputs.runway")
        assert page.evaluate("window.AeroCalc.compute('runway',window.AeroCalc.inputs.takeoff).error")==None
        page.locator('input[data-key="mass"]').fill('1900')
        assert page.locator('#main-result').inner_text()!='—'
        page.locator('input[data-key="mass"]').fill('1800')
        page.locator('input[data-key="length"]').fill('600')
        assert page.locator('#main-result').inner_text()!='—'
        assert page.locator('#runway-margin').count()==1
        page.locator('input[data-key="length"]').fill('900')
        assert page.locator('#main-result').inner_text()!='—'
        # RUNWAY edits are applied on BACK; there is no separate APPLY step.
        page.locator('#analysis-settings').click()
        assert page.locator('#rw-takeoff').count()==1
        assert page.locator('#rw-weight').count()==1
        assert page.locator('#rw-pressure').count()==1
        assert page.locator('#rw-wind').get_attribute('type')=='range'
        assert page.locator('#rw-save-back').inner_text()=='BACK'
        assert page.locator('#rw-apply, #rw-cancel').count()==0
        assert page.locator('#rw-wind').get_attribute('min')=='-10'
        assert page.locator('#rw-wind').get_attribute('max')=='20'
        assert page.locator('#rw-slope').get_attribute('step')=='0.5'
        assert 'MAX WEIGHT' in page.locator('#rw-weight').inner_text()
        assert page.locator('.runway-ui .rw-note').count()==0
        assert page.locator('#rw-authorize').count()==0
        assert page.locator('#rw-weight .rw-value').inner_text()=='1900 KG'
        assert page.locator('#rw-weight .rw-value').evaluate("(e)=>getComputedStyle(e).whiteSpace")=='nowrap'
        assert page.locator('#rw-weight .rw-value').evaluate("(e)=>e.scrollWidth<=e.clientWidth")
        page.locator('#rw-surface').click()
        assert page.locator('.rw-picker').count()==4
        assert page.locator('.rw-picker').all_inner_texts()==['PAVED · DRY','GRASS · 5 CM','GRASS · 5–10 CM','GRASS · 25 CM']
        assert page.locator('.rw-picker').evaluate_all("(cards)=>cards.every(c=>c.querySelectorAll('strong').length===1 && c.querySelectorAll('small, .sub').length===0)")
        page.locator('#rw-back').click()
        page.locator('#rw-takeoff').click()
        assert page.locator('.rw-picker').evaluate_all("(cards)=>cards.every(c=>c.querySelectorAll('strong').length===1 && c.querySelectorAll('small, .sub').length===0)")
        assert page.locator('button[data-rw-pick="normal"]').count()==1
        assert page.locator('button[data-rw-pick="short"]').count()==1
        page.locator('button[data-rw-pick="short"]').click()
        assert 'SHORT · APP' in page.locator('#rw-takeoff').inner_text()
        assert page.evaluate("window.AeroCalc.inputs.runway.procedure")=='normal'
        page.locator('#rw-save-back').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.procedure")=='short'
        page.locator('#analysis-settings').click()
        page.locator('#rw-takeoff').click()
        page.locator('button[data-rw-pick="short"]').click()
        page.locator('#rw-save-back').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.procedure")=='short'
        page.locator('#analysis-settings').click()
        page.locator('#rw-takeoff').click()
        page.locator('button[data-rw-pick="normal"]').click()
        page.locator('#rw-save-back').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.procedure")=='normal'
        page.locator('#analysis-settings').click()
        assert page.locator('#rw-weight .rw-value').inner_text()=='1900 KG'
        page.locator('#rw-weight').click()
        assert page.locator('.rw-picker').all_inner_texts()==['1900 KG','1999 KG']
        assert page.locator('#rw-authorize').count()==0
        page.locator('button[data-rw-pick="1999"]').click()
        assert page.locator('#rw-weight .rw-value').inner_text()=='1999 KG'
        assert page.locator('#rw-weight .rw-value').evaluate("(e)=>e.scrollWidth<=e.clientWidth")
        assert page.locator('#rw-authorize').count()==0
        assert page.evaluate("window.AeroCalc.inputs.runway.maxMass")==1900
        page.locator('#rw-save-back').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.maxMass")==1999
        assert '1,999 KG' in page.locator('#analysis-settings').inner_text()
        page.locator('#analysis-settings').click()
        page.locator('#rw-weight').click()
        page.locator('button[data-rw-pick="1900"]').click()
        page.locator('#rw-save-back').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.maxMass")==1900
        page.locator('#analysis-settings').click()
        assert page.locator('#rw-weight .rw-value').inner_text()=='1900 KG'
        page.locator('#rw-pressure').click()
        assert page.locator('button[data-rw-pick="qnh"]').count()==1
        page.locator('button[data-rw-pick="qnh"]').click()
        assert page.locator('#rw-elevation').count()==1
        assert page.locator('#rw-qnh').count()==1
        assert page.locator('#val-pa').get_attribute('readonly') is None
        page.locator('#rw-save-back').click()
        assert page.locator('#val-pa').get_attribute('readonly') is not None
        # QNH above standard at sea level: negative PA is physically valid.
        page.locator('#analysis-settings').click()
        page.locator('#rw-elevation').fill('0')
        page.locator('#rw-qnh').fill('1030')
        page.locator('#rw-save-back').click()
        assert page.locator('#main-result').inner_text()!='—'
        assert page.locator('#val-pa').input_value().startswith('-')
        assert '0 FT TABLE' in page.locator('#banner').inner_text()
        assert page.evaluate("window.AeroCalc.compute('runway',window.AeroCalc.inputs.runway).paBelowChart") is True
        assert page.evaluate("window.AeroCalc.compute('runway',window.AeroCalc.inputs.runway).tablePa")==0
        page.locator('#analysis-settings').click()
        page.locator('#rw-qnh').fill('1000')
        page.locator('#rw-save-back').click()
        assert page.locator('#main-result').inner_text()!='—'
        assert float(page.locator('#val-pa').input_value().replace(',',''))>0
        assert '0 FT TABLE' not in page.locator('#banner').inner_text()
        page.locator('#analysis-settings').click()
        page.locator('#rw-qnh').fill('1013.25')
        page.locator('#rw-save-back').click()
        assert page.locator('#main-result').inner_text()!='—'
        page.locator('#analysis-settings').click()
        page.locator('#rw-pressure').click()
        page.locator('button[data-rw-pick="direct"]').click()
        page.locator('#rw-save-back').click()
        assert page.locator('#val-pa').get_attribute('readonly') is None
        page.locator('#analysis-settings').click()
        page.locator('#rw-wind').evaluate("el => { el.value='-5'; el.dispatchEvent(new Event('input',{bubbles:true})) }")
        assert page.evaluate("window.AeroCalc.inputs.runway.wind")==10
        assert 'TAILWIND' in page.locator('#rw-wind-output').inner_text()
        page.locator('#rw-save-back').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.wind")==-5
        page.locator('#analysis-settings').click()
        page.locator('#rw-wind').evaluate("el => { el.value='12'; el.dispatchEvent(new Event('input',{bubbles:true})) }")
        page.locator('#rw-save-back').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.wind")==12
        page.locator('#analysis-settings').click()
        page.locator('#rw-wind').evaluate("el => { el.value='0'; el.dispatchEvent(new Event('input',{bubbles:true})) }")
        page.locator('#rw-save-back').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.wind")==0
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        assert len(errors)==0, errors
        all_checks+=93
        ctx.close()
    browser.close()
    print(f'{all_checks} mobile Chromium checks passed at 5 viewport sizes.')
