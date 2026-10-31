"""Chromium responsive UI smoke checks — Weight & Balance module.
Not an operational or certification validation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

url=Path(__file__).with_name('wb.html').resolve().as_uri()
flight_url=Path(__file__).with_name('flight.html').resolve().as_uri()
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
        assert page.locator('.topbar #menu').count()==0
        assert page.locator('.scroller > .page-back #menu').count()==1
        assert page.locator('#menu').inner_text()=='BACK'
        assert page.locator('#menu').evaluate("(b)=>b.getBoundingClientRect().height>=51")
        assert page.locator('.bottom .nav').count()==4
        assert page.locator('.bottom .nav span').all_inner_texts()==['PLAN','SUMMARY','MODULES','MORE']
        assert page.locator('.bottom .nav svg.icon').count()==4
        assert page.locator('[data-nav="modules"]').get_attribute('aria-current')=='page'
        assert page.locator('.bottom').evaluate("""(nav)=>{
          const bar=nav.getBoundingClientRect(),tabs=[...nav.querySelectorAll('.nav')];
          const r=tabs.map(n=>n.getBoundingClientRect());
          return r.length===4&&bar.height>=55 &&
            tabs.every(t=>t.getBoundingClientRect().bottom<=bar.bottom+1) &&
            r.every((x,i)=>i===0||x.left>=r[i-1].right-1) &&
            getComputedStyle(tabs[0]).fontSize==='10px'&&
            getComputedStyle(nav.querySelector('.nav .icon')).width==='20px' &&
            nav.scrollWidth<=nav.clientWidth+1;
        }"""), (w,h,'footer not responsive')
        assert page.locator('#cg-status').count()==0
        assert page.locator('#zfcg').count()==0
        assert page.locator('.result-head').count()==0
        assert page.locator('.primary').count()==0
        assert page.locator('.line').count()==0
        assert 'ZFW' in page.locator('.legend').inner_text()
        assert 'TOW' in page.locator('.legend').inner_text()
        assert 'WEIGHT WITHIN LIMITS' in page.locator('#mass-check').inner_text()
        assert page.locator('input[data-wb]').count()==4
        assert all(',' not in v for v in page.locator('input[data-wb]').evaluate_all("(xs)=>xs.map(x=>x.value)"))
        assert page.locator('.field .entry').evaluate_all("""(entries)=>entries.every(e=>{
          const a=e.querySelector('input'),b=e.querySelector('.unit');
          return !a||!b||a.getBoundingClientRect().right<=b.getBoundingClientRect().left+1;
        })""")
        assert page.locator('#metrics').inner_text().find('1.899')!=-1
        assert page.locator('#metrics').inner_text().find('1.656')!=-1
        assert page.locator('#metrics').inner_text().find('ZFW')!=-1
        assert page.locator('#metrics').inner_text().find('TOW')!=-1
        assert '2,35' in page.locator('svg.graph').text_content()
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=w
        # Minimal PERFORMANCE menu: three consistent destinations.
        page.evaluate("WBApp.sheet('modules')")
        assert page.locator('.sheet a.action').all_inner_texts()==['FLIGHT PLAN','PERFORMANCE','WEIGHT & BALANCE']
        assert page.locator('.sheet-head .close').count()==0
        assert page.locator('.sheet > .sheet-return').inner_text()=='BACK'
        assert page.locator('.sheet a.action').count()==3
        assert page.locator('.sheet').evaluate("""(s)=>{
            const buttons=[...s.querySelectorAll('a.action'),s.querySelector('.sheet-return')];
            const props=buttons.map(x=>getComputedStyle(x));
            const common=['fontFamily','fontSize','fontWeight','borderRadius','backgroundColor','borderTopColor','lineHeight'];
            return buttons.every(x=>x&&x.getBoundingClientRect().height>=51)
               &&common.every(k=>props.every(y=>y[k]===props[0][k]));
        }"""), (w,h,'W&B action and BACK must share design tokens')
        assert [x.split('/')[-1] for x in page.locator('.sheet a.action').evaluate_all("(xs)=>xs.map(a=>a.getAttribute('href'))")]==['flight.html','index.html?calculator=1','wb.html']
        page.locator('.sheet-backdrop').evaluate('(e)=>e.remove()')
        assert page.locator('svg.graph polygon').count()==1
        count+=8
        page.locator('input[data-wb="pilot"]').fill('110')
        assert 'WEIGHT LIMIT EXCEEDED' in page.locator('#mass-check').inner_text()
        page.locator('input[data-wb="pilot"]').fill('80')
        assert 'WEIGHT WITHIN LIMITS' in page.locator('#mass-check').inner_text()
        # The compact TOW/FUEL/CG card and shared performance state must
        # react to each keystroke, with no APPLY button or mode re-selection.
        before=page.locator('.loading-metric').first.inner_text()
        page.locator('input[data-wb="pilot"]').fill('79')
        current=page.locator('.loading-metric').first.inner_text()
        assert current!=before
        parse_kg=lambda text: float(text.strip().splitlines()[-1].replace('.','').replace(',','.'))
        assert abs(parse_kg(current)-parse_kg(before)+1.0)<0.001, (before,current)
        assert page.evaluate("""()=>
            Math.abs(JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.takeoff.mass-
            WBApp.model.takeoff.mass)<0.001""")
        assert page.locator('.loading-metric strong').evaluate_all("""(items)=>items.every(e=>
            e.scrollWidth<=e.clientWidth+1 && e.getBoundingClientRect().width>0)"""), (w,h,'summary overflow')
        assert page.locator('.loading-metrics').evaluate("""(row)=>{
           const a=[...row.querySelectorAll('.loading-metric')].map(x=>x.getBoundingClientRect());
           return a.length===3 && a.every((r,i)=>i===0 || r.left>=a[i-1].right+3)
           && a.every(r=>r.right<=row.getBoundingClientRect().right+1);
        }"""), (w,h,'summary columns overlap')

        assert page.locator('.loading-summary').evaluate("""(card)=>{
          const cells=[...card.querySelectorAll('.loading-metric')];
          if(cells.length!==3)return false;
          const areas=cells.map(c=>c.getBoundingClientRect()),center=r=>r.left+r.width/2;
          const equalWidths=areas.every(r=>Math.abs(r.width-areas[0].width)<1);
          const equalTops=areas.every(r=>Math.abs(r.top-areas[0].top)<1);
          const centered=cells.every(c=>{
            const label=c.querySelector('span'),number=c.querySelector('strong');
            const ls=getComputedStyle(label),ns=getComputedStyle(number);
            const lb=label.getBoundingClientRect(),nb=number.getBoundingClientRect();
            const range=document.createRange();range.selectNodeContents(number);
            const glyphs=range.getBoundingClientRect();
            return ls.textAlign==='center'&&ns.textAlign==='center'&&
              Math.abs(center(lb)-center(nb))<1&&
              Math.abs(center(nb)-center(c.getBoundingClientRect()))<1&&
              glyphs.left>=nb.left-1&&glyphs.right<=nb.right+1&&
              ns.fontVariantNumeric.includes('tabular-nums');
          });
          return equalWidths&&equalTops&&centered&&
            getComputedStyle(card.querySelector('.loading-note')).textAlign==='center'&&
            card.scrollWidth<=card.clientWidth+1;
        }"""), (w,h,'TOW/FUEL/CG center alignment and clipping')
        page.locator('input[data-wb="pilot"]').fill('80')
        assert page.locator('.loading-metric').first.inner_text()==before
        count+=2
        assert page.locator('#edit-load').inner_text().strip()=='BAGGAGE & FUEL'
        assert page.locator('#edit-load .sub').count()==0
        page.locator('#edit-load').click()
        assert page.locator('.sheet-row input').count()==8
        fuel_before=page.locator('.loading-metric').nth(1).inner_text()
        page.locator('input[data-wb="mainL"]').fill('78.5')
        assert page.locator('.loading-metric').nth(1).inner_text()!=fuel_before
        assert page.evaluate("""()=>Math.abs(
            JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.takeoff.mass-
            WBApp.model.takeoff.mass)<0.001""")
        page.locator('input[data-wb="mainL"]').fill('79.5')
        assert page.locator('.loading-metric').nth(1).inner_text()==fuel_before
        assert page.locator('[data-wb^="landing"]').count()==0
        page.locator('input[data-wb="cabin"]').fill('40')
        page.locator('input[data-wb="extension"]').fill('18')
        assert 'CABIN + EXTENSION' in page.locator('#notice').inner_text()
        page.locator('input[data-wb="cabin"]').fill('10')
        assert 'CABIN + EXTENSION' not in page.locator('#notice').inner_text()
        assert 'LANDING FUEL' not in page.locator('.sheet').inner_text()
        assert 'LANDING' not in page.locator('#notice').inner_text()
        page.locator('.sheet-backdrop').evaluate('(e)=>e.remove()')
        count+=5
        page.locator('#nav-more').click()
        assert page.locator('.sheet-head h2').inner_text()=='MORE'
        assert page.locator('#nav-more').get_attribute('aria-expanded')=='true'
        assert page.locator('#nav-more').evaluate("(e)=>e.classList.contains('active')")
        assert page.locator('.sheet button.action').all_inner_texts()==['CG ENVELOPE','FUEL & DE-ICE','AIRCRAFT PROFILE']
        assert page.locator('.sheet a.action').inner_text()=='PREFERENCES'
        page.locator('#nav-scenarios').click()
        assert page.locator('.case').count()==6
        assert '1.665,5 kg' in page.locator('.sheet').inner_text()
        assert '1.908,5 kg' in page.locator('.sheet').inner_text()
        assert 'LANDING' not in page.locator('.sheet').inner_text()
        assert 'FUEL FULL' in page.locator('.sheet').inner_text()
        assert 'study cases' not in page.locator('.sheet').inner_text()
        page.locator('.sheet-backdrop').evaluate('(e)=>e.remove()')
        page.locator('#nav-more').click()
        page.locator('#nav-settings').click()
        assert page.locator('input[data-wb="emptyMass"]').count()==1
        assert page.locator('input[data-wb="emptyMoment"]').count()==1
        assert page.locator('input[data-wb="emptyMass"]').input_value()=='1450.0'
        assert page.locator('input[data-wb="emptyMoment"]').input_value().find(',')<0
        page.locator('input[data-wb="emptyMass"]').fill('1.450,0')
        assert page.locator('input[data-wb="emptyMass"]').input_value()=='1450.0'
        page.locator('input[data-wb="emptyMass"]').fill('1,450.0')
        assert page.locator('input[data-wb="emptyMass"]').input_value()=='1450.0'
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
        # Primary/secondary actions use identical dimensions, radius and
        # typography on every supported mobile viewport without overflowing.
        assert page.locator('.optimize-row.has-manual').count()==1
        assert page.locator('#restore-simulated').inner_text()=='CARGA MANUAL'
        assert page.locator('.optimize-row').evaluate("""(row)=>{
          const buttons=[row.querySelector('#optimize'),row.querySelector('#restore-simulated')];
          if(buttons.some(b=>!b))return false;
          const [a,b]=buttons.map(x=>x.getBoundingClientRect());
          const [ca,cb]=buttons.map(x=>getComputedStyle(x));
          return Math.abs(a.width-b.width)<1 &&
            Math.abs(a.height-b.height)<1 &&
            Math.abs(a.top-b.top)<1 &&
            ca.borderRadius===cb.borderRadius &&
            ca.fontSize===cb.fontSize &&
            ca.fontWeight===cb.fontWeight &&
            a.left>=row.getBoundingClientRect().left-1 &&
            b.right<=row.getBoundingClientRect().right+1 &&
            buttons.every(x=>x.scrollWidth<=x.clientWidth+1);
        }"""), (w,h,'optimize/manual design mismatch')
        assert page.locator('html').evaluate('(e)=>e.scrollWidth')<=w
        assert page.locator('.loading-note').evaluate("(n)=>getComputedStyle(n).textAlign==='center'")
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
        page.locator('.sheet-backdrop').evaluate('(e)=>e.remove()')
        page.locator('#optimize').click()
        assert page.evaluate("WBApp.model.statuses.cgOK && WBApp.model.statuses.massOK && WBApp.model.statuses.scenariosOK") is True
        assert page.evaluate("WBApp.profile.mainL")==35
        page.reload()
        assert page.evaluate("WBApp.optimizedMode") is True
        assert page.evaluate("WBApp.profile.mainL")==35
        assert page.locator('input[data-wb="pilot"]').get_attribute('readonly') is not None
        page.locator('#nav-more').click()
        page.locator('#nav-settings').click()
        assert page.locator('#restore-manual').count()==1
        page.locator('#restore-manual').click()
        assert page.evaluate("WBApp.optimizedMode") is False
        assert page.evaluate("WBApp.profile.pilot")==80
        assert page.evaluate("WBApp.profile.mainL")==35
        assert page.locator('input[data-wb="pilot"]').get_attribute('readonly') is None
        # Full navigation loop does not change Weight & Balance values.
        saved=page.evaluate("JSON.stringify(WBApp.profile)")
        for tab,screen in [('plan','plan'),('summary','summary'),('modules','modules')]:
            page.locator('[data-nav="'+tab+'"]').click()
            page.wait_for_url('**/flight.html?tab='+tab)
            assert page.evaluate("AeroFlight.view")==screen,(tab,page.url)
            assert page.locator('.bottom .nav span').all_inner_texts()==['PLAN','SUMMARY','MODULES','MORE']
            page.go_back()
            assert page.evaluate("JSON.stringify(WBApp.profile)")==saved
            assert page.locator('.bottom .nav').count()==4
        page.locator('#nav-more').click()
        page.locator('#nav-chart').click()
        assert page.locator('.sheet').count()==0
        page.locator('#nav-more').click()
        page.locator('.sheet a.action').click()
        page.wait_for_url('**/flight.html?tab=more')
        assert page.evaluate("AeroFlight.view")=='more'
        page.go_back()
        assert page.evaluate("JSON.stringify(WBApp.profile)")==saved
        count+=29
        assert len(errors)==0,errors
        context.close()
    browser.close()
print(f'PASS {count} W&B mobile Chromium checks across 5 viewport sizes')
