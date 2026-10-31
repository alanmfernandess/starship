"""Every visible BACK goes to the single MODULES card menu, across all apps."""
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
  def menu():
   page.wait_for_function("() => window.AeroFlight?.view==='modules'")
   assert page.locator('.module-list .module-card').count()==7
   assert page.locator('.module-list .module-card .module-copy strong').all_inner_texts()==[
    'FLIGHT PLAN','WEIGHT & BALANCE','TAKEOFF PERFORMANCE',
    'CLIMB PERFORMANCE','CRUISE PERFORMANCE','LANDING PERFORMANCE',
    'GO-AROUND PERFORMANCE']
   assert page.locator('.bottom .nav span').all_inner_texts()==['PLAN','SUMMARY','MODULES','MORE']
   assert page.locator('html').evaluate('(e)=>e.scrollWidth')<=width
  def goto_menu():
   page.wait_for_url('**/flight.html?tab=modules')
   menu()

  # Flight Plan: empty import, imported overview, review/checklist, OFP
  # comparison, settings, and the menu itself all have the same BACK target.
  page.goto(FLIGHT)
  page.locator('#back-or-menu').click()
  menu()
  page.locator('#back-or-menu').click()
  menu()
  page.goto(FLIGHT)
  page.evaluate("(raw)=>AeroFlight.acceptRaw(raw,'SIMBRIEF')",OFP)
  assert page.evaluate('AeroFlight.view')=='summary'
  page.locator('#back-or-menu').click()
  menu()
  assert page.evaluate("""()=>!!JSON.parse(localStorage.getItem('aero-ui-last-simbrief-ofp-v1'))""")
  for tab in ['summary','more']:
   page.goto(FLIGHT+'?tab='+tab)
   assert page.evaluate('AeroFlight.view')==tab
   page.locator('#back-or-menu').click()
   menu()
  page.goto(FLIGHT+'?tab=summary')
  page.locator('#open-review').click()
  assert page.evaluate('AeroFlight.view')=='review'
  page.locator('#back-or-menu').click()
  menu()
  page.goto(FLIGHT+'?tab=summary')
  page.locator('#open-comparison').click()
  assert page.evaluate('AeroFlight.view')=='comparison'
  page.locator('#back-or-menu').click()
  menu()

  # Checklist-deep-linked calculator: BACK must NOT resume review.
  page.goto(FLIGHT+'?review=1')
  assert page.evaluate('AeroFlight.view')=='review'
  page.locator('[data-check-id="cg"] summary').click()
  page.locator('[data-check-id="cg"] a.check-link').click()
  page.wait_for_url('**/wb.html?returnToReview=1&reviewItem=cg')
  assert page.locator('#menu').count()==1
  page.locator('#menu').click()
  goto_menu()

  # W&B edit sheet BACK is also global; profile remains stored.
  page.goto(WB)
  page.locator('#edit-load').click()
  assert page.locator('.sheet .sheet-return').count()==1
  page.locator('.sheet .sheet-return').click()
  goto_menu()
  page.goto(WB)
  page.locator('#nav-more').click()
  page.locator('.sheet .sheet-return').click()
  goto_menu()
  page.goto(WB)
  page.locator('#menu').click()
  goto_menu()

  # Every performance calculator BACK, from direct entry or checklist.
  for name in ['takeoff','climb','cruiseperf','landing','goaround',
               'oei','runway','timeclimb','cruise','abnormal']:
   page.goto(CALC+'?calculator=1&module='+name)
   assert page.locator('#menu').count()==1
   page.locator('#menu').click()
   goto_menu()

  # Modal BACK never returns to its parent calculator.
  for sheet in ['modules','chart','history','settings','more']:
   page.goto(CALC+'?calculator=1&module=takeoff')
   page.evaluate('(which)=>AeroCalc.showSheet(which)',sheet)
   page.locator('.sheet .sheet-return').click()
   goto_menu()

  # Runway main BACK and nested option BACK both lead to MODULES.
  page.goto(CALC+'?calculator=1&module=takeoff')
  page.locator('#analysis-settings').click()
  page.locator('#rw-save-back').click()
  goto_menu()
  page.goto(CALC+'?calculator=1&module=takeoff')
  page.locator('#analysis-settings').click()
  page.locator('#rw-surface').click()
  assert page.locator('#rw-back').count()==1
  page.locator('#rw-back').click()
  goto_menu()
  assert not errors,errors
  context.close()
 browser.close()
print('PASS deterministic BACK->MODULES for Flight Plan, checklist, W&B, all performance modules and nested runway.')
