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

  page.goto(FLIGHT)
  page.evaluate("(raw)=>window.AeroFlight.acceptRaw(raw,'SIMBRIEF')",OFP)
  assert 'PERFORMANCE OVERVIEW' in page.locator('.heading').inner_text()
  page.locator('#open-review').click()
  assert page.locator('[data-check-id="wind"] .check-badge').inner_text()=='REQUIRED'
  page.locator('[data-check-id="wind"] summary').click()
  wind_url=page.locator('[data-check-id="wind"] a.check-link').get_attribute('href')
  assert 'returnToReview=1' in wind_url and 'reviewItem=wind' in wind_url
  page.locator('[data-check-id="wind"] a.check-link').click()
  assert 'returnToReview=1' in page.url
  assert page.locator('#rw-save-back').count()==1
  # Nested BACK stays in RUNWAY until the pilot is done editing.
  page.locator('#rw-surface').click()
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
  assert not errors,errors
  context.close()
 browser.close()
print('PASS checklist-origin Runway/TORA/W&B BACK, independent validation, nested BACK, ordinary menu.')
