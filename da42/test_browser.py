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
        assert page.locator('#main-result').inner_text()!='—'
        page.locator('input[data-key="mass"]').fill('2000')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="mass"]').fill('1800')
        assert page.locator('#main-result').inner_text()=='638'
        all_checks+=31
        page.locator('#menu').click()
        expected_modules=[
            'TAKEOFF',
            'CLIMB',
            'ONE ENGINE CLIMB / DESCENT',
            'CRUISE',
            'LANDING',
            'ABNORMAL LANDING',
            'GO-AROUND',
            'TIME · FUEL · DISTANCE TO CLIMB',
            'CRUISE PERFORMANCE',
            'RUNWAY ANALYSIS'
        ]
        assert page.locator('.sheet button[data-module] strong').all_inner_texts()==expected_modules
        assert page.locator('.sheet a.option[href="./wb.html"] strong').inner_text()=='WEIGHT & BALANCE'
        assert page.locator('.sheet .option').count()==11
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
        page.locator('#menu').click()
        page.locator('button[data-module="oei"]').click()
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
        assert page.locator('#oei-isa-toggle').inner_text()=='ISA'
        def verify_cards_aligned():
            pa=page.locator('#val-pa').bounding_box()
            oat=page.locator('#val-oat').bounding_box()
            pa_label=page.locator('label[for="val-pa"]').bounding_box()
            oat_label=page.locator('label[for="val-oat"]').bounding_box()
            oat_card=page.locator('#val-oat').locator('xpath=../..').bounding_box()
            isa_button=page.locator('#oei-isa-toggle').bounding_box()
            assert abs(pa['y']-oat['y'])<=2, (w,h,'numeric input misalignment',pa,oat)
            assert abs(pa_label['y']-oat_label['y'])<=2, (w,h,'label misalignment',pa_label,oat_label)
            assert isa_button['x']>=oat_card['x'] and isa_button['x']+isa_button['width']<=oat_card['x']+oat_card['width'],(w,h,'ISA toggle outside OAT card')
        verify_cards_aligned()
        assert 'VYSE 85 KIAS' in page.locator('#banner').inner_text()
        page.locator('input[data-key="mass"]').fill('1999')
        assert page.locator('#main-result').inner_text()=='138'
        page.locator('#oei-isa-toggle').click()
        assert page.locator('#oei-isa-toggle').inner_text()=='OAT'
        assert page.locator('input[data-key="oat"]').get_attribute('readonly') is not None
        verify_cards_aligned()
        assert page.locator('#main-result').inner_text()=='140'
        page.locator('input[data-key="pa"]').fill('18000')
        assert page.locator('#main-result').inner_text()=='-169'
        assert page.locator('#result-name').inner_text()=='RATE OF DESCENT'
        assert page.locator('#secondary-result').inner_text().startswith('-')
        verify_vertical_graph('descida')
        assert 'NEGATIVO' in page.locator('#banner').inner_text()
        page.locator('input[data-key="pa"]').fill('4000')
        page.locator('#oei-isa-toggle').click()
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
        page.locator('#menu').click()
        page.locator('button[data-module="cruise"]').click()
        assert page.locator('#main-result').inner_text()=='164'
        assert page.locator('#secondary-result').inner_text()=='0 °C'
        assert page.locator('.field.readonly .power-value').inner_text()=='2'
        cruise_fonts=page.evaluate("""() => {
            const input=getComputedStyle(document.querySelector('#val-load'));
            const fixed=getComputedStyle(document.querySelector('.field.readonly .power-value'));
            return [input.fontSize,input.fontWeight,input.lineHeight,input.letterSpacing,fixed.fontSize,fixed.fontWeight,fixed.lineHeight,fixed.letterSpacing];
        }""")
        assert cruise_fonts[:4]==cruise_fonts[4:],(w,h,'fixed-field typography drift',cruise_fonts)
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
        page.locator('#menu').click()
        page.locator('button[data-module="abnormal"]').click()
        assert page.locator('#main-result').inner_text()=='761'
        assert page.locator('#secondary-result').inner_text()=='453 m'
        assert page.locator('.field').count()==4
        assert page.locator('#abnormal-isa-toggle').inner_text()=='ISA'
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
        # Module 09: AFM 5.3.9 cumulative climb (2,000 -> 16,000 ft).
        page.locator('#menu').click()
        assert page.locator('button[data-module="timeclimb"]').count()==1
        page.locator('button[data-module="timeclimb"]').click()
        assert page.locator('.field').count()==4
        assert page.locator('input[data-key="start"]').input_value()=='2,000'
        assert page.locator('input[data-key="target"]').input_value()=='16,000'
        assert page.locator('#main-result').inner_text()=='15.0'
        assert page.locator('#secondary-result').inner_text()=='4.2 US gal'
        assert page.locator('#distance-result').inner_text()=='26.0 NM'
        assert page.locator('#plot-area svg.time-climb-plot').count()==1
        curve=page.locator('#plot-area path.time-climb-curve')
        assert curve.count()==1
        assert ' C' in curve.get_attribute('d')
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        page.locator('input[data-key="oat"]').fill('21')
        assert page.locator('#main-result').inner_text()=='16.5'
        assert page.locator('#distance-result').inner_text()=='28.6 NM'
        page.locator('input[data-key="oat"]').fill('11')
        page.locator('input[data-key="mass"]').fill('1999')
        assert page.locator('#main-result').inner_text()=='17.0'
        assert page.locator('#secondary-result').inner_text()=='4.6 US gal'
        assert page.locator('#distance-result').inner_text()=='30.0 NM'
        page.locator('input[data-key="mass"]').fill('2000')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="mass"]').fill('1900')
        page.locator('input[data-key="start"]').fill('16000')
        assert page.locator('#main-result').inner_text()=='—'
        page.locator('input[data-key="start"]').fill('2000')
        assert page.locator('#main-result').inner_text()=='15.0'
        assert len(errors)==0,errors
        all_checks+=24
        # Cruise Performance §5.3.10 — published 1999kg power/FF/TAS grids.
        page.locator('#menu').click()
        assert page.locator('button[data-module="cruiseperf"]').count()==1
        page.locator('button[data-module="cruiseperf"]').click()
        assert page.locator('.field').count()==4
        assert page.locator('input[data-key="mass"]').count()==0
        assert page.locator('.field.readonly .power-value').inner_text()=='1,999'
        assert page.locator('#main-result').inner_text()=='156'
        assert page.locator('#secondary-result').inner_text()=='13.0 US gal/h'
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
        # Runway Analysis — inverse distance-limited takeoff mass.
        page.locator('#menu').click()
        page.locator('button[data-module="runway"]').click()
        assert page.locator('.field').count()==4
        assert page.locator('#main-result').inner_text()=='1,855'
        assert page.locator('#secondary-result').inner_text()=='37.5 m'
        assert page.locator('#runway-required').inner_text()=='863 m'
        assert page.locator('#runway-ground').inner_text()=='533 m'
        assert page.locator('#plot-area path.runway-distance-curve').count()==1
        assert ' C' in page.locator('#plot-area path.runway-distance-curve').get_attribute('d')
        assert page.locator('.runway-speeds').inner_text().count('KIAS')==3
        assert 'DISTANCE SUFFICIENT' in page.locator('#banner').inner_text()
        page.locator('input[data-key="mass"]').fill('1900')
        assert page.locator('#main-result').inner_text()=='1,855'
        assert page.locator('#secondary-result').inner_text()=='-30.0 m'
        assert 'INSUFFICIENT DISTANCE' in page.locator('#banner').inner_text()
        page.locator('input[data-key="mass"]').fill('1800')
        page.locator('input[data-key="length"]').fill('600')
        assert page.locator('#main-result').inner_text()=='—'
        assert 'NO TABLE MASS FITS' in page.locator('#banner').inner_text()
        page.locator('input[data-key="length"]').fill('900')
        assert page.locator('#main-result').inner_text()=='1,855'
        # RUNWAY is a transactional in-sheet dialog: no parent state changes until APPLY.
        page.locator('#analysis-settings').click()
        assert page.locator('#rw-takeoff').count()==1
        assert page.locator('#rw-weight').count()==1
        assert page.locator('#rw-pressure').count()==1
        assert page.locator('#rw-wind').get_attribute('type')=='range'
        assert page.locator('#rw-wind').get_attribute('min')=='-10'
        assert page.locator('#rw-wind').get_attribute('max')=='20'
        assert page.locator('#rw-slope').get_attribute('step')=='0.5'
        assert 'MAX WEIGHT' in page.locator('#rw-weight').inner_text()
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
        page.locator('#rw-cancel').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.procedure")=='normal'
        page.locator('#analysis-settings').click()
        page.locator('#rw-takeoff').click()
        page.locator('button[data-rw-pick="short"]').click()
        page.locator('#rw-apply').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.procedure")=='short'
        page.locator('#analysis-settings').click()
        page.locator('#rw-takeoff').click()
        page.locator('button[data-rw-pick="normal"]').click()
        page.locator('#rw-apply').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.procedure")=='normal'
        page.locator('#analysis-settings').click()
        page.locator('#rw-weight').click()
        assert page.locator('button[data-rw-pick="1999"]').count()==1
        page.locator('button[data-rw-pick="1999"]').click()
        assert page.locator('#rw-authorize').count()==1
        assert page.evaluate("window.AeroCalc.inputs.runway.maxMass")==1900
        page.locator('#rw-apply').click()
        assert 'MÄM 42-678' in page.locator('.rw-error').inner_text()
        page.locator('#rw-authorize').check()
        page.locator('#rw-apply').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.maxMass")==1999
        assert page.evaluate("window.AeroCalc.inputs.runway.mam678") is True
        page.locator('#analysis-settings').click()
        page.locator('#rw-weight').click()
        page.locator('button[data-rw-pick="1900"]').click()
        page.locator('#rw-apply').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.maxMass")==1900
        page.locator('#analysis-settings').click()
        page.locator('#rw-pressure').click()
        assert page.locator('button[data-rw-pick="qnh"]').count()==1
        page.locator('button[data-rw-pick="qnh"]').click()
        assert page.locator('#rw-elevation').count()==1
        assert page.locator('#rw-qnh').count()==1
        assert page.locator('#val-pa').get_attribute('readonly') is None
        page.locator('#rw-apply').click()
        assert page.locator('#val-pa').get_attribute('readonly') is not None
        page.locator('#analysis-settings').click()
        page.locator('#rw-pressure').click()
        page.locator('button[data-rw-pick="direct"]').click()
        page.locator('#rw-apply').click()
        assert page.locator('#val-pa').get_attribute('readonly') is None
        page.locator('#analysis-settings').click()
        page.locator('#rw-wind').evaluate("el => { el.value='-5'; el.dispatchEvent(new Event('input',{bubbles:true})) }")
        assert page.evaluate("window.AeroCalc.inputs.runway.wind")==0
        assert 'TAILWIND' in page.locator('#rw-wind-output').inner_text()
        page.locator('#rw-cancel').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.wind")==0
        page.locator('#analysis-settings').click()
        page.locator('#rw-wind').evaluate("el => { el.value='12'; el.dispatchEvent(new Event('input',{bubbles:true})) }")
        page.locator('#rw-apply').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.wind")==12
        page.locator('#analysis-settings').click()
        page.locator('#rw-wind').evaluate("el => { el.value='0'; el.dispatchEvent(new Event('input',{bubbles:true})) }")
        page.locator('#rw-apply').click()
        assert page.evaluate("window.AeroCalc.inputs.runway.wind")==0
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        assert len(errors)==0, errors
        all_checks+=83
        ctx.close()
    browser.close()
    print(f'{all_checks} mobile Chromium checks passed at 5 viewport sizes.')
