"""DA42 NG SimBrief / Flight Plan responsive UI smoke checks.
Mock OFP only; does not contact real SimBrief or certify performance.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

url=Path(__file__).with_name('flight.html').resolve().as_uri()
payload={
 'fetch':{'status':'Success'},
 'params':{'units':'kgs','time_generated':'2026-10-29T12:00:00Z'},
 'aircraft':{'icao_code':'DA42','name':'Diamond DA42 NG'},
 'general':{'route_distance':'420','initial_altitude':'10000','route':'SBGR DCT SBFL'},
 'origin':{'icao_code':'SBGR','elevation':'2459','plan_rwy':'10R'},
 'destination':{'icao_code':'SBFL','elevation':'16'},
 'alternates':{'alternate':[{'icao_code':'SBNF','distance':'38'}]},
 'fuel':{'plan_takeoff':'201','enroute_burn':'120','alternate_burn':'14','reserve':'35','plan_landing':'81'},
 'weights':{'est_tow':'1850','est_ldw':'1730','est_zfw':'1649'},
 'weather':{'orig_metar':'SBGR 291500Z 11012KT 9999 SCT020 28/20 Q1025',
            'orig_taf':'TAF SBGR 291100Z 2912/3012 11012KT CAVOK',
            'dest_metar':'SBFL 291500Z 24009KT 9999 25/19 Q1018'},
 'times':{'est_time_enroute':'03:05:00'}
}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,
    executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else p.chromium.executable_path,
    args=['--no-sandbox','--allow-file-access-from-files'])
 for w,h in [(320,690),(390,844),(430,932)]:
  context=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True)
  page=context.new_page()
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def fulfill(route):
   route.fulfill(status=200,content_type='application/json',body=json.dumps(payload),
                 headers={'access-control-allow-origin':'*'})
  page.route('**/xml.fetcher.php**',fulfill)
  page.goto(url)
  assert page.locator('.heading').count()==0
  assert page.locator('.topbar #back-or-menu').count()==0
  assert page.locator('.content > .page-back #back-or-menu').count()==1
  assert page.locator('#back-or-menu').inner_text()=='BACK'
  assert page.locator('.page-back button').evaluate("""(b)=>{
     const s=getComputedStyle(b);
     return s.fontSize==='13px' && s.fontWeight==='600' &&
       s.borderRadius==='13px' && s.fontFamily.includes('Arial');
  }""")
  assert page.locator('[data-view]').count()==4
  # SIMBRIEF import card must have exactly ONE input and ONE action.
  assert page.locator('.sb-import-card').count()==1
  assert page.locator('.sb-import-card input').count()==1
  assert page.locator('.sb-import-card button').count()==1
  assert page.locator('.sb-import-card h2, .sb-import-card label').count()==0
  assert page.locator('#pilot-id').get_attribute('aria-label')=='Pilot ID'
  assert page.locator('.sb-import-card button').inner_text()=='IMPORT OFP'
  assert page.locator('.sb-import-card .pill, .sb-import-card .note, .sb-import-card .message').count()==0
  assert page.locator('#import-file, #open-manual, #review-plan, #ofp-file').count()==0
  assert page.locator('.disclaimer').count()==0
  assert page.locator('.sb-import-card .primary').evaluate("(e)=>Math.abs(e.getBoundingClientRect().width-e.previousElementSibling.getBoundingClientRect().width)<2")
  assert page.locator('html').evaluate('(e)=>e.scrollWidth')<=w
  page.locator('#pilot-id').fill('123456')
  page.locator('#import-ofp').click()
  page.locator('.heading').get_by_text('PERFORMANCE OVERVIEW').wait_for(timeout=15000)
  assert page.locator('#confirm-plan, #back-plan, #variant-confirm').count()==0
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.takeoff.mass")==1850
  assert page.locator('.metric').count()==4
  # Reopening Flight Plan resumes the imported OFP, without reentering Pilot ID.
  page.reload()
  assert 'PERFORMANCE OVERVIEW' in page.locator('.heading').inner_text()
  assert page.locator('#import-ofp, #pilot-id').count()==0
  assert 'SBGR' in page.locator('.route').inner_text()
  page.locator('#open-review').click()
  assert page.locator('.content > .page-back #back-or-menu').count()==1
  page.locator('#back-or-menu').click()
  assert page.evaluate('AeroFlight.view')=='modules'
  assert page.locator('.module-card').count()==7
  page.locator('[data-view="summary"]').click()
  assert 'PERFORMANCE OVERVIEW' in page.locator('.heading').inner_text()
  page.locator('#open-review').click()
  assert page.locator('.heading').inner_text().find('IMPORTED FLIGHT PLAN')>=0
  assert page.locator('.list-title').first.inner_text()=='FLIGHT DATA'
  assert page.locator('#confirm-plan, #back-plan, #variant-confirm').count()==0
  assert page.locator('.notice').count()==0
  assert page.locator('.checklist .review-detail').count()>=9
  assert page.locator('.checklist .review-line').evaluate_all("(items)=>items.every(e=>e.scrollWidth<=e.clientWidth+1)")
  assert page.locator('.checklist .review-detail').evaluate_all("(items)=>items.every(e=>!e.open)")
  assert page.locator('[data-check-id="tora"] [data-check-confirm]').count()==0
  assert page.locator('[data-check-id="wind"] [data-check-confirm]').count()==0
  detail=page.locator('.review-detail').filter(has_text='RUNWAY WIND')
  assert detail.count()==1
  assert not detail.locator('.review-explanation').is_visible()
  detail.locator('summary').click()
  assert detail.locator('.review-explanation').is_visible()
  assert 'componente longitudinal do vento' in detail.locator('.review-explanation').inner_text()
  detail.locator('summary').click()
  assert not detail.locator('.review-explanation').is_visible()
  assert 'SBGR' in page.locator('.route').inner_text()
  assert 'SBFL' in page.locator('.route').inner_text()
  plane=page.locator('.route .plane-line .icon')
  assert plane.count()==1
  # Authentic aircraft silhouette replaces the former 3-stroke placeholder.
  assert plane.locator('path').get_attribute('d').startswith('M17.8 19.2 16 11')
  assert plane.evaluate("(e)=>getComputedStyle(e).transform")!='none'
  center=plane.bounding_box()
  route=page.locator('.route').bounding_box()
  assert abs((center['x']+center['width']/2)-(route['x']+route['width']/2))<6, (w,h,'aircraft offset',center,route)
  assert 'SBNF' in page.locator('.route-foot').inner_text()
  assert page.locator('#field-distance').input_value()=='420'
  assert page.locator('#field-takeoffWeight').input_value()=='1850'
  assert page.locator('label[for="field-alternateDistance"]').inner_text()=='ALTERNATE DIST · NM'
  # All 2-column review rows must align at their top/bottom across phone sizes.
  for left,right in [('distance','alternateDistance'),('takeoffWeight','landingWeight'),('cruiseAltitude','tripFuel')]:
   a=page.locator('#field-'+left).bounding_box()
   b=page.locator('#field-'+right).bounding_box()
   assert abs(a['y']-b['y'])<1, (w,h,left,right,'vertical misalignment',a,b)
   assert abs(a['height']-b['height'])<1, (w,h,left,right,'unequal heights',a,b)
   assert abs(a['width']-b['width'])<1, (w,h,left,right,'unequal widths',a,b)
  assert page.locator('.review-grid label').evaluate_all("(labels)=>labels.every(e=>e.scrollWidth<=e.clientWidth+1 && getComputedStyle(e).whiteSpace==='nowrap')")
  assert page.locator('#field-alternateDistance').evaluate("(e)=>getComputedStyle(e).appearance==='textfield'")

  assert 'QNH' in page.locator('.tile').all_inner_texts()[-2] or page.get_by_text('ORIGIN QNH').count()==1
  assert page.locator('#variant-confirm, #confirm-plan, #back-plan').count()==0
  assert 'CONFIRM DA42 NG' not in page.locator('main').inner_text()
  # Editing a reviewed value immediately updates performance inputs.
  page.locator('#field-takeoffWeight').fill('1845')
  page.locator('#field-takeoffWeight').press('Tab')
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.takeoff.mass")==1845
  page.locator('#field-takeoffWeight').fill('1850')
  page.locator('#field-takeoffWeight').press('Tab')
  page.locator('[data-view="summary"]').click()
  assert page.locator('.heading').inner_text().find('PERFORMANCE OVERVIEW')>=0
  assert page.locator('.metric').count()==4
  assert page.locator('.metric').nth(1).inner_text().find('120')!=-1
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.takeoff.mass")==1850
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.qnh")==1025
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.takeoff.wind")==None
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.toraVerified") is False
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.windVerified") is False
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.length")==0
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.runwayId")=='10R'
  # Summary warnings must remain concise, while full technical detail stays in Review.
  assert page.locator('.review-summary').count()==1
  assert page.locator('[data-check-id="tora"] .check-badge').inner_text()=='REQUIRED'
  assert page.locator('[data-check-id="wind"] .check-badge').inner_text()=='REQUIRED'
  assert page.locator('[data-check-id="slope"] .check-badge').inner_text()=='VERIFY'
  assert page.locator('.check-progress').get_attribute('role')=='progressbar'
  assert page.locator('.check-symbol svg').count()>=9
  assert page.locator('.checklist .check-name').evaluate_all("(items)=>items.every(e=>e.scrollWidth<=e.clientWidth+1)")
  assert page.locator('.review-summary .review-line').count()>=2
  assert page.locator('.review-summary .review-line').evaluate_all("(items)=>items.every(e=>e.scrollWidth<=e.clientWidth+1 && e.clientHeight<=76)")
  assert 'exigem verificação manual' not in page.locator('.review-summary').inner_text()
  assert page.locator('#open-review.review-action').count()==1
  assert page.locator('#open-comparison.comparison-action.card-button').count()==1
  assert page.locator('#open-comparison').inner_text()=='OFP COMPARISON'
  assert page.locator('#open-comparison').evaluate("(e)=>getComputedStyle(e).borderTopWidth==='1px'")
  assert page.locator('#open-comparison').evaluate("(e)=>e.getBoundingClientRect().height<=68")
  assert abs(page.locator('#open-comparison').bounding_box()['width']-page.locator('.review-summary').bounding_box()['width'])<2
  page.locator('#open-review').click()
  assert page.locator('.checklist').count()==1
  assert page.locator('[data-check-id="wind"] .check-badge').inner_text()=='REQUIRED'
  assert page.locator('.notice').count()==0
  page.locator('[data-view="summary"]').click()
  page.locator('#open-comparison').click()
  assert page.locator('.heading').inner_text().find('OFP COMPARISON')>=0
  page.locator('[data-tab="weight"]').click()
  assert 'TAKEOFF WEIGHT' in page.locator('.tile').last.inner_text()
  page.locator('[data-view="modules"]').click()
  assert page.locator('.module-card').count()==7
  assert page.locator('.module-card .module-icon svg').count()==7
  assert page.locator('.module-card .module-copy strong').all_inner_texts()==['FLIGHT PLAN','WEIGHT & BALANCE','TAKEOFF PERFORMANCE','CLIMB PERFORMANCE','CRUISE PERFORMANCE','LANDING PERFORMANCE','GO-AROUND PERFORMANCE']
  assert page.locator('.module-card .module-sub').count()==7
  assert page.locator('a[href*="module=runway"]').count()==0
  assert page.locator('a[href*="module=takeoff"]').count()==1
  assert page.locator('a[href="./wb.html"]').count()==1
  assert page.locator('.note').count()==0
  assert 'Os módulos abaixo' not in page.locator('main').inner_text()
  page.locator('[data-go="plan"]').click()
  assert page.locator('#import-ofp, #pilot-id').count()==0
  assert 'PERFORMANCE OVERVIEW' in page.locator('.heading').inner_text()
  # Navigate Flight Plan -> Weight & Balance -> PERFORMANCE menu -> Flight Plan.
  page.locator('[data-view="modules"]').click()
  page.locator('a[href="./wb.html"]').click()
  page.locator('#menu').click()
  page.wait_for_url('**/flight.html?tab=modules')
  assert page.locator('.module-card').count()==7
  page.locator('[data-go="plan"]').click()
  assert 'PERFORMANCE OVERVIEW' in page.locator('.heading').inner_text()
  assert page.locator('#pilot-id').count()==0
  assert page.locator('html').evaluate('(e)=>e.scrollWidth')<=w
  # End-to-end SimBrief TLR runway import: true TORA, calculated
  # headwind and gradient are applied; unknown surface blocks the answer.
  tlr=json.loads(json.dumps(payload))
  tlr['tlr']={'takeoff':{'conditions':{'airport_icao':'SBGR','planned_runway':'10R','surface_condition':'dry'},
    'runway':[{'identifier':'10R','length':'5000','length_tora':'3000',
      'true_course':'110','magnetic_course':'109','headwind_component':'9.8','gradient':'1.5'}]}}
  page.evaluate("(data)=>window.AeroFlight.acceptRaw(data,'SIMBRIEF')",tlr)
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.length")==914.4
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.wind")==9
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.slopeVerified") is True
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.surfaceVerified") is False
  page.locator('[data-view="modules"]').click()
  page.locator('a[href*="module=takeoff"]').click()
  page.wait_for_function("() => !!window.AeroCalc?.inputs?.runway")
  assert page.evaluate("window.AeroCalc.inputs.runway.runwayId")=='10R'
  assert page.evaluate("window.AeroCalc.compute('runway',window.AeroCalc.inputs.runway).error")=='RUNWAY SURFACE REQUIRED'
  # A runway-data gap must not suppress the standalone AFM takeoff distance.
  assert page.locator('#main-result').inner_text()!='—'
  assert page.locator('#runway-margin').inner_text()=='—'
  assert page.locator('#runway-max-weight').inner_text()=='—'
  page.locator('#analysis-settings').click()
  assert 'RUNWAY · 10R' in page.locator('.rw-context').inner_text()
  assert page.locator('#rw-wind-output').inner_text().startswith('+9 KT')
  page.locator('#rw-surface').click()
  page.locator('button[data-rw-pick="paved"]').click()
  page.locator('#rw-close').click()
  assert page.evaluate("window.AeroCalc.inputs.runway.surfaceVerified") is True
  assert page.evaluate("window.AeroCalc.compute('runway',window.AeroCalc.inputs.runway).error")==None
  assert page.locator('#runway-margin').inner_text()!='—'
  assert page.locator('#runway-max-weight').inner_text()!='—'
  # Import a different OFP without TLR: clear previous runway inputs.
  page.locator('#menu').click()
  page.wait_for_url('**/flight.html?tab=modules')
  page.locator('[data-go="plan"]').click()
  page.wait_for_function("() => !!window.AeroFlight?.acceptRaw")
  page.evaluate("(data)=>window.AeroFlight.acceptRaw(data,'SIMBRIEF')",payload)
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.length")==0
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.toraVerified") is False
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.windVerified") is False
  # Generic DA42 OFPs must not require a manual variant checkbox.
  generic=json.loads(json.dumps(payload))
  generic['aircraft']['name']='Diamond DA42'
  page.evaluate("(data)=>window.AeroFlight.acceptRaw(data,'SIMBRIEF')",generic)
  assert page.locator('#variant-confirm, #confirm-plan, #back-plan').count()==0
  assert 'CONFIRM DA42 NG' not in page.locator('main').inner_text()
  assert 'PERFORMANCE OVERVIEW' in page.locator('.heading').inner_text()
  # A different aircraft is still blocked automatically.
  mismatch=json.loads(json.dumps(payload))
  mismatch['aircraft']['icao_code']='B738'
  page.evaluate("(data)=>window.AeroFlight.acceptRaw(data,'SIMBRIEF')",mismatch)
  assert page.locator('#variant-confirm, #confirm-plan, #back-plan').count()==0
  assert 'AIRCRAFT MISMATCH' in page.locator('.status').inner_text()
  assert 'IMPORTED FLIGHT PLAN' in page.locator('.heading').inner_text()
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.takeoff.mass")==1850
  assert not errors,errors
  context.close()
 browser.close()
print('PASS Flight Plan / SimBrief responsive UI, mocked import, review, sync, comparison and module links.')
