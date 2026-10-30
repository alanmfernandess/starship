"""Contextual checklist BACK navigation regression.
Mock OFP and simulated pilot actions; no certified performance assumptions.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=Path(__file__).parent
FLIGHT=(BASE/'flight.html').resolve().as_uri()
CALC=(BASE/'index.html').resolve().as_uri()
WB=(BASE/'wb.html').resolve().as_uri()
OFP={
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
            'dest_metar':'SBFL 291500Z 24009KT 9999 25/19 Q1018'}
}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,
   executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else p.chromium.executable_path,
   args=['--no-sandbox','--allow-file-access-from-files'])
 for width,height in [(320,690),(390,844),(430,932)]:
  context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
  page=context.new_page()
  errors=[]
  page.on('pageerror',lambda exc:errors.append(str(exc)))
  # Ordinary navigation must keep its original BACK -> performance menu.
  page.goto(CALC+'?calculator=1&module=takeoff')
  page.locator('#menu').click()
  assert page.locator('.sheet .menu-option').count()==7
  page.goto(WB)
  page.locator('#menu').click()
  assert page.locator('.sheet a.action').count()==3
  page.locator('.close').click()
  # SimBrief must never be a dead/disabled selector: without an OFP it
  # opens the import page instead of silently doing nothing.
  assert page.locator('[data-loading-source="simbrief"]').is_enabled()
  page.locator('[data-loading-source="simbrief"]').click()
  page.wait_for_url('**/flight.html?import=1&returnToWB=1')
  assert page.evaluate('AeroFlight.view')=='plan'
  page.locator('#back-or-menu').click()
  page.wait_for_url('**/wb.html')
  assert page.locator('.scroller > .page-back #menu').count()==1

  page.goto(FLIGHT)
  page.evaluate("(raw)=>window.AeroFlight.acceptRaw(raw,'SIMBRIEF')",OFP)
  # A second tab has a separate sessionStorage but must recover the
  # last valid imported SimBrief OFP from localStorage.
  second=context.new_page()
  second.goto(WB)
  assert second.evaluate('WBApp.mode')=='simbrief'
  assert second.locator('[data-loading-source="simbrief"]').is_enabled()
  assert second.locator('.loading-metric').first.inner_text().find('1.850')!=-1
  assert second.locator('.loading-metric').nth(1).inner_text().find('201')!=-1
  assert second.evaluate("""()=>
    !!JSON.parse(localStorage.getItem('aero-ui-last-simbrief-ofp-v1'))""")
  second.close()
  assert 'PERFORMANCE OVERVIEW' in page.locator('.heading').inner_text()
  page.locator('#open-review').click()
  assert page.locator('[data-check-id="wind"] .check-badge').inner_text()=='REQUIRED'
  page.locator('[data-check-id="wind"] summary').click()
  wind_url=page.locator('[data-check-id="wind"] a.check-link').get_attribute('href')
  assert 'returnToReview=1' in wind_url and 'reviewItem=wind' in wind_url
  page.locator('[data-check-id="wind"] a.check-link').click()
  assert 'returnToReview=1' in page.url
  assert page.locator('#rw-save-back').count()==1
  assert page.locator('.runway-ui .rw-footer #rw-save-back').count()==1
  # Nested BACK stays in RUNWAY until the pilot is done editing.
  page.locator('#rw-surface').click()
  assert page.locator('.runway-ui .rw-footer #rw-back').inner_text()=='BACK'
  page.locator('#rw-back').click()
  assert page.locator('#rw-save-back').count()==1
  page.locator('#rw-wind').evaluate("(e)=>{e.value='5';e.dispatchEvent(new Event('input',{bubbles:true}))}")
  page.locator('#rw-save-back').click()
  page.wait_for_url('**/flight.html?review=1&reviewItem=wind')
  assert 'IMPORTED FLIGHT PLAN' in page.locator('.heading').inner_text()
  assert page.locator('[data-check-id="wind"] .check-badge').inner_text()=='CHECKED'
  assert page.locator('[data-check-id="tora"] .check-badge').inner_text()=='REQUIRED'
  assert page.locator('[data-check-id="wind"]').evaluate("(e)=>e.classList.contains('check-return-item')")
  assert page.locator('#scroll-content').evaluate("(e)=>e.scrollTop")>0
  # A normal Takeoff header BACK, when entered through another checklist
  # item, also returns straight to the checklist.
  page.locator('[data-check-id="tora"] summary').click()
  page.locator('[data-check-id="tora"] a.check-link').click()
  assert 'returnToReview=1' in page.url
  assert page.locator('#rw-save-back').count()==0
  page.locator('#menu').click()
  page.wait_for_url('**/flight.html?review=1&reviewItem=tora')
  assert page.locator('[data-check-id="tora"] .check-badge').inner_text()=='REQUIRED'
  assert page.locator('[data-check-id="wind"] .check-badge').inner_text()=='CHECKED'
  # Weight & Balance header BACK returns to same checklist, without
  # automatically confirming a human-reviewed CG.
  page.locator('[data-check-id="cg"] summary').click()
  page.locator('[data-check-id="cg"] a.check-link').click()
  assert 'returnToReview=1' in page.url
  page.locator('#menu').click()
  page.wait_for_url('**/flight.html?review=1&reviewItem=cg')
  assert 'IMPORTED FLIGHT PLAN' in page.locator('.heading').inner_text()
  assert page.locator('[data-check-id="cg"] .check-badge').inner_text()!='CHECKED'
  assert page.locator('[data-check-id="cg"]').evaluate("(e)=>e.classList.contains('check-return-item')")
  assert page.locator('[data-check-id="wind"] .check-badge').inner_text()=='CHECKED'
  # SimBrief is authoritative by selection, without requiring simulated
  # passenger stations to match its TOW numerically.
  assert page.locator('[data-check-id="takeoffWeight"] .check-badge').inner_text()=='CHECKED'
  page.locator('[data-check-id="takeoffWeight"] summary').click()
  page.locator('[data-check-id="takeoffWeight"] a.check-link').click()
  page.wait_for_url('**/wb.html?returnToReview=1&reviewItem=takeoffWeight')
  page.locator('.loading-source.active').wait_for()
  assert page.evaluate("WBApp.mode")=='simbrief'
  assert page.locator('.loading-source.active').inner_text()=='SIMBRIEF'
  assert page.locator('.loading-metric').count()==3
  assert page.locator('.loading-metric').nth(0).inner_text().find('1.850')!=-1
  assert page.locator('.loading-metric').nth(1).inner_text().find('201')!=-1
  assert page.locator('.loading-note').inner_text()=='FUEL · SPLIT ASSUMED'
  page.locator('#edit-load').click()
  assert page.locator('#sheet-mainL').input_value()=='79.5'
  assert page.locator('#sheet-mainR').input_value()=='79.5'
  assert page.locator('#sheet-auxL').input_value()=='21.0'
  assert page.locator('#sheet-auxR').input_value()=='21.0'
  assert page.locator('#sheet-mainL').get_attribute('readonly') is not None
  page.locator('.close').click()
  # Switch source: simulated W&B becomes active, and performance weights
  # follow the model rather than enforcing any equality with the OFP.
  page.locator('[data-loading-source="optimized"]').click()
  assert page.evaluate('WBApp.optimizedMode') is True
  assert page.evaluate("WBApp.mode")=='optimized'
  assert page.locator('#restore-simulated').count()==1
  assert 'SIMULATED' in page.locator('.loading-note').inner_text()
  assert page.evaluate("Math.abs(JSON.parse(localStorage.getItem('aero-ui-da42-v1')).inputs.takeoff.mass-WBApp.model.takeoff.mass)<0.001")
  page.locator('#menu').click()
  page.wait_for_url('**/flight.html?review=1&reviewItem=takeoffWeight')
  assert page.locator('[data-check-id="takeoffWeight"] .check-badge').inner_text()=='CHECKED'
  assert page.locator('[data-check-id="cg"] .check-badge').inner_text()=='CHECKED'
  page.locator('[data-check-id="takeoffWeight"] summary').click()
  page.locator('[data-check-id="takeoffWeight"] a.check-link').click()
  page.locator('#restore-simulated').click()
  assert page.evaluate('WBApp.optimizedMode') is False
  assert page.evaluate('WBApp.mode')=='manual'
  assert page.locator('#restore-simulated').count()==0
  page.locator('#menu').click()
  page.wait_for_url('**/flight.html?review=1&reviewItem=takeoffWeight')
  assert not errors,errors
  context.close()
 browser.close()
print('PASS checklist-origin Runway/TORA/W&B BACK, independent validation, nested BACK, ordinary menu.')
