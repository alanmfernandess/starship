/* Aero UI Master Design 1.0 — SimBrief / flight-plan shell.
 * Experimental engineering tool. No assumed certified flight clearance.
 */
(function(){
'use strict';
const C=window.SimBriefCore,Checklist=window.FlightChecklist,Load=window.LoadingProfile,storageKey='aero-ui-da42-v1',flightKey='aero-ui-flight-plan-v1',idKey='aero-ui-simbrief-id-v1';
const root=document.getElementById('app'),checkKey='aero-ui-flight-plan-checks-v1';
let view='plan',compareTab='fuel',pilotId='',plan=null,reviewed=false,loading=false,err='';
let backTrail=[];
const icons={
 menu:'M4 7h16M4 12h12M4 17h8',settings:'M4 6h16M4 12h16M4 18h16',next:'m9 5 7 7-7 7',
 plan:'M3 3h18v18H3zM7 8h10M7 12h10M7 16h6',summary:'M4 20V11M10 20V5M16 20v-9M22 20V8',
 modules:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
 more:'M5 12h.1M12 12h.1M19 12h.1',
 plane:'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
 back:'m15 18-6-6 6-6',
 warning:'M12 3 2 21h20L12 3zM12 9v5M12 17h.01',
 download:'M12 3v13m-5-5 5 5 5-5M4 21h16',
 check:'m4 12 5 5L20 6',
 chart:'M3 18h18M5 15l5-5 4 3 5-8',
 clipboard:'M8 4h-2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M9 3h6v4H9zM9 12h6M9 16h6',
 scale:'M12 3v18M7 21h10M5 7h14M5 7l-3 6h6L5 7zM19 7l-3 6h6L19 7z',
 planeTakeoff:'M2 19h20M5 15l5-2-2.5-5 2-1 5 4 4.2-1.4a2 2 0 0 1 2.6 1.6L4 17z',
 trend:'M3 17l6-6 4 4 8-8M15 7h6v6',
 gauge:'M5 17a9 9 0 1 1 14 0M12 14l4-5M7 18h10',
 planeLanding:'M2 19h20M5 7l5 2 2.5-4 2 1-1 5 6 3a2 2 0 0 1-1 3L4 10z',
 rotate:'M3 11a9 9 0 1 0 3-6M3 4v7h7',
 mountain:'M2 20 9 6l4 7 3-4 6 11H2zM7 14l3-3 3 3',
 runway:'M10 2 6 22M14 2l4 20M12 2v4M12 10v4M12 18v4M3 22h18',
 wind:'M3 8h11a3 3 0 1 0-3-3M2 12h17a2 2 0 1 1-2 3M4 17h8a3 3 0 1 1-3 3',
 slope:'M3 20h18L21 7 3 20zM14 11v9M11 14h3',
 target:'M12 2v4M12 18v4M2 12h4M18 12h4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
 cloud:'M7 19h11a4 4 0 0 0 .5-8A6 6 0 0 0 7 9a5 5 0 0 0 0 10z',
 weight:'M9 8a3 3 0 1 1 6 0M8 9h8l3 12H5L8 9z'
};
const icon=n=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(icons[n]||icons.next)+'"/></svg>';
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[x]));
const fmt=(n,d=0)=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}).format(n):'—';
const metric=(title,n,unit,source)=>'<div class="metric"><div><div class="eyebrow">'+esc(title)+'</div><div class="source">'+esc(source||'')+'</div></div><div class="value">'+(typeof n==='number'?fmt(n):esc(n||'—'))+' <span>'+esc(unit||'')+'</span></div></div>';
const row=(name,v,unit)=>'<div class="data-row"><span>'+esc(name)+'</span><strong>'+esc(v===null||v===undefined||v===''?'—':typeof v==='number'?fmt(v,1):v)+' '+esc(unit||'')+'</strong></div>';
function wbResult(){
 try{
  const data=JSON.parse(localStorage.getItem('da42-wb-profile-v1')||'null');
  return data&&window.WBEngine?window.WBEngine.calculate(data):null;
 }catch{return null}
}
function getAppInputs(){try{return JSON.parse(localStorage.getItem(storageKey)||'null')||{}}catch{return {}}}
function checkRecord(){
 if(!plan||!Checklist)return {};
 try{
  const record=JSON.parse(sessionStorage.getItem(checkKey)||'null');
  return record&&record.version===1&&record.plan===Checklist.fingerprint(plan)&&record.items&&typeof record.items==='object'?record.items:{};
 }catch{return {}}
}
function saveCheck(id,signature,revoke){
 const items={...checkRecord()};
 if(revoke)delete items[id];else items[id]=signature;
 try{sessionStorage.setItem(checkKey,JSON.stringify({version:1,plan:Checklist.fingerprint(plan),items}))}catch{}
}
function reviewItems(){
 if(!plan||!Checklist)return [];
 let profile='';
 try{profile=localStorage.getItem('da42-wb-profile-v1')||''}catch{}
 return Checklist.build(plan,getAppInputs(),wbResult(),checkRecord(),profile,localStorage.getItem('da42-wb-optimized-v1')==='true',Load?Load.mode(localStorage,plan):'manual');
}
function checklistCard(context){
 const all=reviewItems();
 if(!all.length)return '';
 const priority={required:0,verify:1,review:2,checked:3};
 const items=[...all].sort((a,b)=>priority[a.status]-priority[b.status]);
 const pending=items.filter(x=>x.status!=='checked').length,done=items.length-pending;
 const counts={required:0,verify:0,review:0,checked:done};
 for(const item of items)if(item.status!=='checked')counts[item.status]++;
 const tokens=['required','verify','review'].filter(x=>counts[x]).map(x=>'<span class="check-count status-'+x+'"><b>'+counts[x]+'</b> '+x.toUpperCase()+'</span>').join('');
 const rows=items.map(item=>{
  const checked=item.status==='checked',state=checked?'CHECKED':item.status.toUpperCase();
  const mark='<span class="check-square" aria-hidden="true">'+(checked?icon('check'):'')+'</span>';
  const move=item.href?item.href==='#weather-ofp'?
    '<button type="button" class="check-link" data-open-weather="1">'+esc(item.action)+'</button>':
    '<a class="check-link" href="'+esc(item.href+(item.href.includes('?')?'&':'?')+'returnToReview=1&reviewItem='+encodeURIComponent(item.id))+'">'+esc(item.action)+'</a>':'';
  const confirm=item.manual?
    '<button type="button" class="check-confirm" data-check-confirm="'+esc(item.id)+'" data-check-sig="'+esc(item.signature)+'" data-check-revoke="'+(item.confirmed?'1':'0')+'">'+(item.confirmed?'REVOKE CONFIRMATION':esc(item.confirmText))+'</button>':'';
  return '<details class="review-detail check-item status-'+item.status+'" data-check-id="'+esc(item.id)+'">'+
   '<summary class="review-line" aria-label="'+esc(item.label+' · '+state)+'">'+mark+
   '<span class="check-symbol">'+icon(item.icon)+'</span><span class="check-name">'+esc(item.label)+'</span>'+
   '<span class="check-badge">'+state+'</span><span class="check-arrow">'+icon('next')+'</span></summary>'+
   '<div class="check-expanded"><p class="review-explanation">'+esc(item.detail)+'</p>'+
   ((move||confirm)?'<div class="check-actions">'+move+confirm+'</div>':'')+'</div></details>';
 }).join('');
 const percent=Math.round(done/items.length*100);
 return '<section class="tile review-summary checklist" aria-label="Data validation checklist">'+
  '<div class="review-heading"><strong>'+(pending?pending+' ITEMS TO REVIEW':'ALL '+items.length+' ITEMS CHECKED')+'</strong>'+
  '<span class="check-heading-icon">'+icon(pending?'warning':'check')+'</span></div>'+
  '<div class="check-overview"><span>'+done+' / '+items.length+' CHECKED</span><span>'+percent+'%</span></div>'+
  '<div class="check-progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+items.length+'" aria-valuenow="'+done+'" aria-label="Verified data items"><span style="width:'+percent+'%"></span></div>'+
  (tokens?'<div class="check-counts">'+tokens+'</div>':'')+'<div class="review-lines">'+rows+'</div>'+
  (context==='summary'?'<button id="open-review" class="review-action" type="button"><span>REVIEW DATA</span>'+icon('next')+'</button>':'')+
  '<p class="check-note">CHECKED = DATA REVIEWED FOR THIS CHECK · NOT FLIGHT CLEARANCE</p></section>';
}
function performance(){
 if(!reviewed||!plan||plan.mismatch)return null;
 const app=getAppInputs(),takeoff=app.inputs?.takeoff;
 if(!takeoff||!window.TakeoffTables)return null;
 const takeoffInput=window.RunwayAnalysis?.modelInput?window.RunwayAnalysis.modelInput(takeoff,takeoff.mass):{...takeoff};
 takeoffInput.wind=takeoff.wind;
 const data=window.TakeoffTables.compute(takeoffInput);
 return data.error?{error:data.error}:data;
}
function badge(){return '<span class="pill">'+(plan?esc(plan.source==='MANUAL'?'MANUAL PLAN':'SIMBRIEF OFP'):'SIMBRIEF')+'</span>'}
function routeCard(){
 if(!plan)return '';
 return '<section class="tile"><div class="brand"><span class="eyebrow">FLIGHT PLAN · '+esc(plan.aircraft)+'</span>'+badge()+'</div>'+
  '<div class="route"><div class="apt">'+esc(plan.origin)+'</div><div class="plane-line">'+icon('plane')+'</div><div class="apt">'+esc(plan.destination)+'</div></div>'+
  '<div class="route-foot"><div><span class="eyebrow">ALTERNATE</span><strong>'+esc(plan.alternate||'NOT SET')+'</strong></div><div><span class="eyebrow">MISSION DISTANCE</span><strong>'+fmt(plan.distance)+' NM</strong></div></div></section>';
}
function inputField(key,label,value,step){
 return '<div><label for="field-'+esc(key)+'">'+esc(label)+'</label><input class="text-input" id="field-'+esc(key)+'" data-review="'+esc(key)+'" type="number" inputmode="decimal" step="'+(step||'any')+'" value="'+(typeof value==='number'?value:'')+'" placeholder="—"></div>';
}
function planPage(){
 return '<section class="tile sb-import-card" aria-label="Import flight plan">'+
  '<input id="pilot-id" class="text-input" type="text" aria-label="Pilot ID" inputmode="numeric" pattern="[0-9]*" maxlength="7" placeholder="PILOT ID" value="'+esc(pilotId)+'" autocomplete="off" aria-required="true">'+
  '<button id="import-ofp" class="primary" type="button" '+(loading?'disabled aria-busy="true"':'')+'>'+(loading?'IMPORTING…':'IMPORT OFP')+'</button>'+
  (err?'<p class="message warn" role="alert">'+esc(err)+'</p>':'')+
  '</section>';
}
function reviewPage(){
 if(!plan)return planPage();
 const incompatible=plan.mismatch||plan.aircraft!=='DA42';
 let items= '<section class="tile"><div class="brand"><span class="title">IMPORTED FLIGHT PLAN</span><span class="pill">REVIEW</span></div>'+
 '<div class="status '+(incompatible?'warn':'ok')+'">'+esc(plan.source==='MANUAL'?'MANUAL PLAN':incompatible?'AIRCRAFT MISMATCH · SYNC BLOCKED':'OFP READ SUCCESSFULLY')+'</div></section>'+routeCard();
 items+='<section class="tile"><div class="list-title">FLIGHT DATA</div><div class="review-grid">'+
 inputField('distance','MISSION DISTANCE · NM',plan.distance)+inputField('alternateDistance','ALTERNATE DIST · NM',plan.alternateDistance)+
 inputField('takeoffWeight','TAKEOFF WEIGHT · KG',plan.takeoffWeight)+inputField('landingWeight','LANDING WEIGHT · KG',plan.landingWeight)+
 inputField('cruiseAltitude','CRUISE ALT · FT',plan.cruiseAltitude)+inputField('tripFuel','TRIP FUEL · KG',plan.tripFuel)+
 '</div>'+row('AIRCRAFT',plan.aircraftName||plan.aircraft)+row('ROUTE',plan.route||'NOT PROVIDED')+
 row('PLAN ENDURANCE',plan.flightTime||'NOT PROVIDED')+
 row('ORIGIN QNH',plan.weather?.origin?.qnh,'HPA')+
 row('ORIGIN OAT',plan.weather?.origin?.oat,'°C')+
 row('RUNWAY',plan.originRunway||'NOT PROVIDED')+'</section>';
 items+='<section class="tile" id="weather-ofp"><div class="list-title">WEATHER · OFP SNAPSHOT</div>'+weatherRows()+'</section>';
 items+=checklistCard('review');
 return items;
}
function weatherRows(){
 const reports=[['ORIGIN',plan.origin,plan.weather?.origin],['DESTINATION',plan.destination,plan.weather?.destination],['ALTERNATE',plan.alternate||'—',plan.weather?.alternate]];
 return reports.map(([label,airport,v])=>'<div class="data-row" style="display:block"><div class="action-row"><span>'+esc(label)+'</span><strong>'+esc(airport)+'</strong></div>'+
 '<div class="sub" style="overflow-wrap:anywhere;margin-top:7px">METAR: '+esc(v?.raw||'NOT AVAILABLE')+'</div>'+
 '<div class="sub" style="overflow-wrap:anywhere;margin-top:5px">TAF: '+esc(v?.taf||'NOT AVAILABLE')+'</div></div>').join('');
}
function summaryPage(){
 if(!plan)return '<div class="note">Importe um OFP ou preencha o plano manualmente antes de visualizar o resumo.</div><button id="go-plan" class="primary stretch">IMPORT FLIGHT PLAN</button>';
 const p=performance(),wb=wbResult();
 const takeoff=getAppInputs().inputs?.takeoff?.mass??plan.takeoffWeight;
 let body=routeCard();
 body+='<div class="metrics">'+metric('TAKEOFF WEIGHT',takeoff,'KG',reviewed?'AERO UI INPUT / OFP':'SIMBRIEF / PLAN')+
 metric('TRIP FUEL',plan.tripFuel,'KG',plan.source==='MANUAL'?'MANUAL':'SIMBRIEF OFP')+
 metric('LANDING WEIGHT',plan.landingWeight,'KG','SIMBRIEF / PLAN')+
 metric('TAKEOFF DIST',p&&!p.error?p.main:null,'M',p&&!p.error?'AERO UI · REVIEW WIND':'REVIEW INPUTS')+'</div>';
 if(p?.error)body+='<div class="notice">TAKEOFF PERFORMANCE: '+esc(p.error)+' · Abra o módulo para completar os dados.</div>';
 body+='<section class="tile"><div class="list-title">PERFORMANCE MODULES</div>'+
 row('RUNWAY MARGIN',(()=>{const r=getAppInputs().inputs?.runway||{};
   return r.toraVerified===false||r.windVerified===false||r.surfaceVerified===false||r.slopeVerified===false?
    'DATA REQUIRED':r.runwayId?'RWY '+r.runwayId:'NOT SET';
  })())+
 row('CLIMB / OEI','AFM MODEL AVAILABLE')+
 row('WEIGHT & BALANCE',Load?.mode(localStorage,plan)?.toUpperCase()||'MANUAL')+
 row('ALTERNATE',''+(plan.alternate||'NOT SET'))+'</section>';
 body+=checklistCard('summary');
 body+='<button id="open-comparison" class="card-button comparison-action" type="button"><span>OFP COMPARISON</span>'+icon('next')+'</button>';
 return body;
}
function comparisonPage(){
 if(!plan)return summaryPage();
 const wb=wbResult(),p=performance();
 const activeMode=Load?.mode(localStorage,plan)||'manual';
 const loading=Load?.loading(plan,activeMode==='simbrief'?null:wb,activeMode);
 const comparisons=C.compare(plan,p,wb);
 const tabs=['fuel','weight','runway','weather'];
 let body=routeCard()+'<div class="tabs" role="tablist" aria-label="OFP comparison categories">'+
 tabs.map(k=>'<button class="tab" role="tab" data-tab="'+k+'" aria-selected="'+(compareTab===k)+'">'+({fuel:'FUEL',weight:'WEIGHT',runway:'RUNWAY',weather:'WX'}[k])+'</button>').join('')+'</div>'+
 '<section class="tile"><div class="list-title">OFP VS AERO UI</div>';
 const head='<div class="compare-grid"><span class="eyebrow">PARAMETER</span><span class="eyebrow" style="text-align:right">OFP</span><span class="eyebrow" style="text-align:right">AERO UI</span></div>';
 const comp=(label,ofp,aero,unit)=>'<div class="compare-grid"><strong>'+esc(label)+'</strong><span class="ofp">'+(typeof ofp==='number'?fmt(ofp,1):esc(ofp||'—'))+' '+esc(unit||'')+'</span>'+
 '<span class="aero">'+(typeof aero==='number'?fmt(aero,1):esc(aero||'—'))+' '+esc(unit||'')+'</span></div>';
 body+=head;
 if(compareTab==='fuel'){
  body+=comp('TRIP FUEL',plan.tripFuel,null,'KG')+comp('ALTERNATE FUEL',plan.alternateFuel,null,'KG')+
   comp('FINAL RESERVE',plan.reserveFuel,null,'KG')+comp('LANDING FUEL',plan.landingFuel,null,'KG');
  body+='<p class="sub">FUEL / RANGE / ENDURANCE Aero UI engine ainda não implementado. Dados de combustível exibidos são do OFP, não recálculo independente.</p>';
 }else if(compareTab==='weight'){
  body+=comp('TAKEOFF WEIGHT',plan.takeoffWeight,loading?.tow,'KG')+
  comp('ZERO FUEL WEIGHT',plan.zeroFuelWeight,loading?.zfw,'KG')+
  comp('LANDING WEIGHT',plan.landingWeight,loading?.landing,'KG')+
  comp('TAKEOFF CG',null,loading?.cg,'M');
  body+='<p class="sub">ACTIVE LOAD · '+esc(Load?.mode(localStorage,plan)||'MANUAL').toUpperCase()+'</p>';
 }else if(compareTab==='runway'){
  body+=comp('TAKEOFF DIST',null,p&&!p.error?p.main:null,'M')+
  comp('GROUND ROLL',null,p&&!p.error?p.secondary:null,'M')+
  comp('TORA',null,null,'M');
  body+='<p class="sub">O OFP não equivale automaticamente às tabelas AFM. Verifique vento, pista, TORA e configuração.</p>';
 }else{
  const o=plan.weather?.origin||{};
  body+=comp('QNH',o.qnh,getAppInputs().inputs?.runway?.qnh,'HPA')+
  comp('OAT',o.oat,getAppInputs().inputs?.takeoff?.oat,'°C')+
  comp('WIND',o.windDir===null?null:o.windDir+'°/'+o.windSpeed+' KT',null,'');
  body+='<p class="sub">METAR/TAF são registros do OFP. Não representam meteorologia atualizada.</p>';
 }
 body+='</section>';
 return body;
}
function moduleCard(name,sub,iconName,url){
 const body='<span class="module-icon">'+icon(iconName)+'</span>'+
 '<span class="module-copy"><strong>'+esc(name)+'</strong><span class="module-sub">'+esc(sub)+'</span></span>'+
 '<span class="module-chevron">'+icon('next')+'</span>';
 return url?'<a class="card-button module-card" href="'+url+'">'+body+'</a>':
 '<button type="button" class="card-button module-card" data-go="plan">'+body+'</button>';
}
function modulesPage(){
 return '<section class="module-list" aria-label="Performance modules">'+
 moduleCard('FLIGHT PLAN','SimBrief · OFP','clipboard',null)+
 moduleCard('WEIGHT & BALANCE','Loading · CG','scale','./wb.html')+
 moduleCard('TAKEOFF PERFORMANCE','Distance · Runway','planeTakeoff','./index.html?calculator=1&module=takeoff')+
 moduleCard('CLIMB PERFORMANCE','Both engines · OEI · Profile','trend','./index.html?calculator=1&module=climb')+
 moduleCard('CRUISE PERFORMANCE','TAS · Fuel flow','gauge','./index.html?calculator=1&module=cruiseperf')+
 moduleCard('LANDING PERFORMANCE','Normal · Abnormal','planeLanding','./index.html?calculator=1&module=landing')+
 moduleCard('GO-AROUND PERFORMANCE','Climb · VREF','rotate','./index.html?calculator=1&module=goaround')+
 '</section>';
}
function morePage(){
 return '<section class="tile"><div class="list-title">AERO UI · MASTER DESIGN 1.0</div>'+
  row('IMPORT SOURCE','SIMBRIEF JSON V2')+row('APP','EXPERIMENTAL ENGINEERING')+
  row('PILOT ID','SAVED LOCALLY')+
  '</section><button class="secondary stretch" id="clear-plan">CLEAR IMPORTED FLIGHT PLAN</button>'+
  '<p class="sub">O Pilot ID e o último plano normalizado ficam apenas neste navegador. O arquivo completo do OFP não é enviado a um servidor Aero UI.</p>'+
  '<div class="notice">NOT FOR FLIGHT · Esta ferramenta e seus cálculos preliminares não constituem autorização operacional, despacho, peso/balanceamento certificado, nem substituem AFM, meteorologia oficial ou planejamento aprovado.</div>';
}
function heading(){
 const names={plan:['FLIGHT PLAN','SIMBRIEF'],review:['IMPORTED FLIGHT PLAN','REVIEW'],summary:['PERFORMANCE OVERVIEW','AERO UI'],comparison:['OFP COMPARISON','SUMMARY'],modules:['PERFORMANCE MODULES','AERO UI'],more:['PREFERENCES','AERO UI']};
 const d=names[view]||names.plan;
 return view==='plan'?'':'<div class="heading"><span>'+d[0]+'</span><span class="accent">'+d[1]+'</span></div>';
}
function render(){
 const page=view==='plan'?planPage():view==='review'?reviewPage():view==='summary'?summaryPage():view==='comparison'?comparisonPage():view==='modules'?modulesPage():morePage();
 root.innerHTML='<div class="phone"><header class="topbar"><span class="topbar-placeholder" aria-hidden="true"></span><h1>DA42 NG</h1><button id="open-more" aria-label="Settings">'+icon('settings')+'</button></header>'+
 '<main class="content" id="scroll-content">'+heading()+page+(view==='plan'?'':'<p class="disclaimer">EXPERIMENTAL PERFORMANCE · NOT FOR FLIGHT</p>')+'<div class="page-back"><button id="back-or-menu" type="button" aria-label="Back">BACK</button></div></main>'+
 '<nav class="bottom" aria-label="Main navigation">'+[['plan','PLAN'],['summary','SUMMARY'],['modules','MODULES'],['more','MORE']].map(([k,label])=>
 '<button type="button" class="nav '+((view===k||view==='review'&&k==='plan'||view==='comparison'&&k==='summary')?'active':'')+'" data-view="'+k+'" aria-label="'+label+'">'+icon(k)+'<span>'+label+'</span></button>').join('')+'</nav></div>';
 bind();
}
function show(v,returning=false){
 if(!returning&&v!==view){
  backTrail.push(view);
  if(backTrail.length>24)backTrail.shift();
 }
 view=v;err='';render();
}
function goBack(){
 // Navigation is history-aware within Flight Plan, with deterministic
 // fallbacks for direct URLs and reloaded sessions.
 if(backTrail.length){return show(backTrail.pop(),true)}
 if(view==='comparison'||view==='review')return show(plan?'summary':'plan',true);
 if(view==='summary'||view==='plan'){
  if(view==='plan'&&/[?&]returnToWB=1(?:&|$)/.test(location.search||'')){
   location.assign('./wb.html');return;
  }
  return show('modules',true);
 }
 if(view==='more')return show('modules',true);
 if(view==='modules'){location.assign('./index.html?calculator=1');return}
 return show('modules',true);
}
function setStatus(message,isError){loading=false;err=isError?message:'';view='plan';render()}
function acceptRaw(raw,source){
 const next=C.normalize(raw);next.source=source;
 plan=next;reviewed=false;backTrail=[];
  if(Load)try{Load.setMode(localStorage,'simbrief',next)}catch{}
  try{sessionStorage.removeItem(checkKey)}catch{}
 try{sessionStorage.setItem(flightKey,JSON.stringify(plan));sessionStorage.removeItem(flightKey+'-synced')}catch{}
 if(Load)try{if(source==='SIMBRIEF')Load.savePlan(localStorage,plan);else Load.clearPlan(localStorage)}catch{}
 // The import itself triggers synchronization; there is no second confirmation.
 // Incompatible aircraft remain visible for inspection but never update inputs.
 if(next.mismatch||next.aircraft!=='DA42'){show('review');return}
 applyPlan();
}
async function importPilot(){
 const id=pilotId.trim();
 if(!/^\d{1,7}$/.test(id)){setStatus('Pilot ID deve conter de 1 a 7 dígitos.',true);return}
 loading=true;err='';render();
 try{
  const url='https://www.simbrief.com/api/xml.fetcher.php?userid='+encodeURIComponent(id)+'&client=aero-ui-da42&json=v2';
  const response=await fetch(url,{mode:'cors',headers:{Accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw Error('SimBrief retornou HTTP '+response.status+'. Verifique o Pilot ID e se há um OFP gerado.');
  const raw=await response.json();
  acceptRaw(raw,'SIMBRIEF');
  try{localStorage.setItem(idKey,id)}catch{}
 }catch(e){
  const message=e instanceof TypeError?'SIMBRIEF INDISPONÍVEL · REDE / CORS':'IMPORT FAILED · '+String(e.message||e);
  setStatus(message,true);
 }finally{loading=false}
}

function applyPlan(navigate=true){
 if(!plan)return false;
 if(plan.mismatch||plan.aircraft!=='DA42'){
  err='AIRCRAFT MISMATCH · OFP DA42 REQUIRED';
  if(navigate)show('review');
  return false;
 }
 const prepared=C.proposedInputs(plan,getAppInputs().inputs||{});
 let persisted=getAppInputs();
 if(!persisted||typeof persisted!=='object')persisted={};
 if(!persisted.inputs||typeof persisted.inputs!=='object')persisted.inputs={};
 for(const [name,fields] of Object.entries(prepared.inputs)){
  persisted.inputs[name]={...(persisted.inputs[name]||{}),...fields};
 }
 // Only one takeoff state feeds distance and available-runway calculations.
 const takeoff=persisted.inputs.takeoff||{};
 const runway=persisted.inputs.runway||{};
 const unified={...takeoff,...runway};
 for(const key of ['wind','pa','oat','mass','isa']){
  if(Object.prototype.hasOwnProperty.call(takeoff,key))unified[key]=takeoff[key];
 }
 // QNH fields come from the same OFP, and runway-specific values remain
 // authoritative for TORA and pressure-altitude mode.
 persisted.inputs.takeoff={...unified};
 persisted.inputs.runway={...unified};
 persisted.current=persisted.current==='runway'?'takeoff':persisted.current;
 try{
  localStorage.setItem(storageKey,JSON.stringify(persisted));
  sessionStorage.setItem(flightKey,JSON.stringify(plan));
  sessionStorage.setItem(flightKey+'-synced','1');
  if(Load&&plan.source==='SIMBRIEF')Load.savePlan(localStorage,plan);
 }catch(e){
  err='Não foi possível salvar os dados no navegador.';
  if(navigate)render();
  return false;
 }
 if(Load)try{Load.sync(localStorage,plan,wbResult(),Load.mode(localStorage,plan))}catch{}
 reviewed=true;err='';
 if(navigate)show('summary');
 return true;
}
function bind(){
 root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view==='plan'&&plan?(reviewed?'summary':'review'):b.dataset.view));
 root.querySelectorAll('[data-go="plan"]').forEach(b=>b.onclick=()=>show(plan?(reviewed?'summary':'review'):'plan'));
 const more=root.querySelector('#open-more');if(more)more.onclick=()=>show('more');
 const back=root.querySelector('#back-or-menu');if(back)back.onclick=goBack;
 const pilot=root.querySelector('#pilot-id');if(pilot){
  pilot.oninput=()=>{pilotId=pilot.value.replace(/\D/g,'').slice(0,7);pilot.value=pilotId};
  pilot.onkeydown=e=>{if(e.key==='Enter')importPilot()};
 }
 const importButton=root.querySelector('#import-ofp');if(importButton)importButton.onclick=importPilot;
 root.querySelectorAll('[data-review]').forEach(inp=>inp.onchange=()=>{
  const key=inp.dataset.review;const n=C.val(inp.value.trim());
  const maxima={distance:20000,alternateDistance:20000,takeoffWeight:1999,landingWeight:1999,cruiseAltitude:50000,tripFuel:10000};
  if(n!==null&&(n<0||n>maxima[key])){err='Valor fora dos limites de entrada: '+key;render();return}
  plan[key]=n;err='';
  // Editing reviewed flight data updates the existing performance inputs,
  // without a separate confirmation action or a full-screen rerender.
  if(!plan.mismatch&&plan.aircraft==='DA42'){
   if(!applyPlan(false)){render();return}
  }else{
   try{sessionStorage.setItem(flightKey,JSON.stringify(plan))}catch{}
  }
 });
 const go=root.querySelector('#go-plan');if(go)go.onclick=()=>show('plan');
 const reviewAgain=root.querySelector('#open-review');if(reviewAgain)reviewAgain.onclick=()=>show('review');
 const compare=root.querySelector('#open-comparison');if(compare)compare.onclick=()=>show('comparison');
 root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{compareTab=b.dataset.tab;render()});
 root.querySelectorAll('[data-check-confirm]').forEach(b=>b.onclick=()=>{
  const id=b.dataset.checkConfirm,target=reviewItems().find(x=>x.id===id);
  if(!target||!target.manual||target.signature!==b.dataset.checkSig)return;
  const y=root.querySelector('#scroll-content')?.scrollTop||0;
  saveCheck(id,target.signature,b.dataset.checkRevoke==='1');
  render();
  const pane=root.querySelector('#scroll-content'),expanded=root.querySelector('[data-check-id="'+id+'"]');
  if(expanded)expanded.open=true;
  if(pane)pane.scrollTop=y;
 });
 root.querySelectorAll('[data-open-weather]').forEach(b=>b.onclick=()=>{
  if(view!=='review')show('review');
  root.querySelector('#weather-ofp')?.scrollIntoView({block:'start'});
 });
 const clear=root.querySelector('#clear-plan');if(clear)clear.onclick=()=>{
  plan=null;reviewed=false;err='';backTrail=[];
   try{sessionStorage.removeItem(checkKey)}catch{}
  try{sessionStorage.removeItem(flightKey);sessionStorage.removeItem(flightKey+'-synced')}catch{}
  if(Load)try{Load.clearPlan(localStorage);Load.setMode(localStorage,'manual',null)}catch{}
  show('plan');
 };
}
try{pilotId=localStorage.getItem(idKey)||''}catch{}
try{
 const stored=JSON.parse(sessionStorage.getItem(flightKey)||'null');
 if(stored&&stored.origin&&stored.destination){
  plan=stored;
  reviewed=stored.aircraft==='DA42'&&!stored.mismatch&&sessionStorage.getItem(flightKey+'-synced')==='1';
 }
}catch{}
if(!plan&&Load)try{
 const retained=Load.plan(sessionStorage,localStorage);
 if(retained){plan=retained;reviewed=false}
}catch{}
// Returning from Performance/W&B resumes the imported OFP summary.
if(/[?&]import=1(?:&|$)/.test(location.search||''))view='plan';
else if(plan)view=/[?&]review=1(?:&|$)/.test(location.search||'')?'review':reviewed?'summary':'review';
window.AeroFlight={get plan(){return plan},get view(){return view},normalize:C.normalize,acceptRaw,applyPlan,get performance(){return performance()}};
render();
// A checklist-origin return always resumes the review checklist, not the OFP summary.
// The checklist itself recomputes from saved performance and W&B data on every render.
if(plan&&view==='review'&&/[?&]review=1(?:&|$)/.test(location.search||'')){
 const match=(location.search||'').match(/[?&]reviewItem=([a-zA-Z0-9]+)(?:&|$)/);
 const card=root.querySelector('.checklist');
 if(card){
  if(match){
   const row=Array.from(card.querySelectorAll('[data-check-id]')).find(x=>x.dataset.checkId===match[1]);
   if(row)row.classList.add('check-return-item');
  }
  card.scrollIntoView({block:'start'});
 }
}
if('serviceWorker' in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
