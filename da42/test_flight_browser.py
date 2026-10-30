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
  page.locator('#confirm-plan').wait_for(timeout=15000)
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
  assert page.locator('#variant-confirm').count()==0
  assert 'CONFIRM DA42 NG' not in page.locator('main').inner_text()
  page.locator('#confirm-plan').click()
  assert page.locator('.heading').inner_text().find('PERFORMANCE OVERVIEW')>=0
  assert page.locator('.metric').count()==4
  assert page.locator('.metric').nth(1).inner_text().find('120')!=-1
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.takeoff.mass")==1850
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.runway.qnh")==1025
  assert page.evaluate("JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.takeoff.wind")==None
  page.locator('#open-comparison').click()
  assert page.locator('.heading').inner_text().find('OFP COMPARISON')>=0
  page.locator('[data-tab="weight"]').click()
  assert 'TAKEOFF WEIGHT' in page.locator('.tile').last.inner_text()
  page.locator('[data-view="modules"]').click()
  assert page.locator('a[href*="module=runway"]').count()==1
  assert page.locator('a[href="./wb.html"]').count()==1
  page.locator('[data-view="plan"]').click()
  assert page.locator('#import-ofp').count()==1
  assert page.locator('html').evaluate('(e)=>e.scrollWidth')<=w
  # Generic DA42 OFPs must not require a manual variant checkbox.
  generic=json.loads(json.dumps(payload))
  generic['aircraft']['name']='Diamond DA42'
  page.evaluate("(data)=>window.AeroFlight.acceptRaw(data,'SIMBRIEF')",generic)
  assert page.locator('#variant-confirm').count()==0
  assert 'CONFIRM DA42 NG' not in page.locator('main').inner_text()
  assert page.locator('#confirm-plan').is_enabled()
  page.locator('#confirm-plan').click()
  assert 'PERFORMANCE OVERVIEW' in page.locator('.heading').inner_text()
  # A different aircraft is still blocked automatically.
  mismatch=json.loads(json.dumps(payload))
  mismatch['aircraft']['icao_code']='B738'
  page.evaluate("(data)=>window.AeroFlight.acceptRaw(data,'SIMBRIEF')",mismatch)
  assert page.locator('#variant-confirm').count()==0
  assert 'AIRCRAFT MISMATCH' in page.locator('.status').inner_text()
  assert page.locator('#confirm-plan').is_disabled()
  assert not errors,errors
  context.close()
 browser.close()
print('PASS Flight Plan / SimBrief responsive UI, mocked import, review, sync, comparison and module links.')
