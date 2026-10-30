/* Aero UI Master Design 1.0 — SimBrief / flight-plan shell.
 * Experimental engineering tool. No assumed certified flight clearance.
 */
(function(){
'use strict';
const C=window.SimBriefCore,storageKey='aero-ui-da42-v1',flightKey='aero-ui-flight-plan-v1',idKey='aero-ui-simbrief-id-v1';
const root=document.getElementById('app');
let view='plan',compareTab='fuel',pilotId='',plan=null,reviewed=false,loading=false,err='';
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
 chart:'M3 18h18M5 15l5-5 4 3 5-8'
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
function hints(){
 if(!plan)return [];
 const p=C.proposedInputs(plan,getAppInputs().inputs||{});
 const messages=[...p.warnings];
 const wb=wbResult();
 if(!wb)messages.push('WEIGHT & BALANCE não configurado para esta aeronave. Comparação de CG pendente.');
 else if(wb.ok&&typeof plan.takeoffWeight==='number'&&Math.abs(wb.takeoff.mass-plan.takeoffWeight)>1)
  messages.push('TAKEOFF WEIGHT diverge do perfil WEIGHT & BALANCE. Verifique a carga e o combustível por tanque.');
 return messages;
}
function shortWarning(message){
 if(message.includes('variante NG'))return 'DA42 NG · VERIFY VARIANT';
 if(message.includes('não corresponde ao DA42'))return 'AIRCRAFT · MISMATCH';
 if(message.includes('PRESSURE ALT abaixo'))return 'PRESSURE ALT · 0 FT TABLE';
 if(message.includes('PRESSURE ALT da origem'))return 'PRESSURE ALT · CHECK';
 if(message.includes('WIND COMPONENT'))return 'RUNWAY / CG · VERIFY';
 if(message.includes('METAR/TAF'))return 'WEATHER · OFP SNAPSHOT';
 if(message.includes('METAR de origem'))return 'ORIGIN WEATHER · CHECK';
 if(message.includes('OAT da origem'))return 'OAT · CHECK';
 if(message.includes('WEIGHT & BALANCE não configurado'))return 'WEIGHT & BALANCE · SETUP';
 if(message.includes('TAKEOFF WEIGHT diverge'))return 'TAKEOFF WEIGHT · REVIEW';
 if(message.includes('TAKEOFF WEIGHT fora'))return 'TAKEOFF WEIGHT · OUT OF RANGE';
 if(message.includes('LANDING WEIGHT ausente'))return 'LANDING WEIGHT · CHECK';
 return 'INPUT DATA · REVIEW';
}
function performance(){
 if(!reviewed||!plan||plan.mismatch)return null;
 const app=getAppInputs(),takeoff=app.inputs?.takeoff;
 if(!takeoff||!window.TakeoffTables)return null;
 const data=window.TakeoffTables.compute(takeoff);
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
 items+='<section class="tile"><div class="list-title">WEATHER · OFP SNAPSHOT</div>'+weatherRows()+'</section>';
 const warnings=hints();
 if(warnings.length)items+='<div class="notice"><strong>'+warnings.length+' ITEMS TO REVIEW</strong><div>'+warnings.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div></div>';
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
 const p=performance(),wb=wbResult(),warnings=hints();
 const takeoff=getAppInputs().inputs?.takeoff?.mass??plan.takeoffWeight;
 let body=routeCard();
 body+='<div class="metrics">'+metric('TAKEOFF WEIGHT',takeoff,'KG',reviewed?'AERO UI INPUT / OFP':'SIMBRIEF / PLAN')+
 metric('TRIP FUEL',plan.tripFuel,'KG',plan.source==='MANUAL'?'MANUAL':'SIMBRIEF OFP')+
 metric('LANDING WEIGHT',plan.landingWeight,'KG','SIMBRIEF / PLAN')+
 metric('TAKEOFF DIST',p&&!p.error?p.main:null,'M',p&&!p.error?'AERO UI · REVIEW WIND':'REVIEW INPUTS')+'</div>';
 if(p?.error)body+='<div class="notice">TAKEOFF PERFORMANCE: '+esc(p.error)+' · Abra o módulo para completar os dados.</div>';
 body+='<section class="tile"><div class="list-title">PERFORMANCE MODULES</div>'+
 row('RUNWAY ANALYSIS','OPEN MODULE TO VERIFY TORA')+
 row('CLIMB / OEI','AFM MODEL AVAILABLE')+
 row('WEIGHT & BALANCE',wb?.ok?'LOADING PROFILE AVAILABLE':'PROFILE REQUIRED')+
 row('ALTERNATE',''+(plan.alternate||'NOT SET'))+'</section>';
 if(warnings.length)body+='<section class="tile review-summary">'+
  '<div class="review-heading"><strong>'+warnings.length+' ITEMS TO REVIEW</strong>'+icon('warning')+'</div>'+
  '<div class="review-lines">'+warnings.map(x=>'<div class="review-line">'+esc(shortWarning(x))+'</div>').join('')+'</div>'+
  '<button id="open-review" class="review-action" type="button"><span>REVIEW DATA</span>'+icon('next')+'</button></section>';
 body+='<button id="open-comparison" class="card-button comparison-action" type="button"><span>OFP COMPARISON</span>'+icon('next')+'</button>';
 return body;
}
function comparisonPage(){
 if(!plan)return summaryPage();
 const wb=wbResult(),p=performance();
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
  body+=comp('TAKEOFF WEIGHT',plan.takeoffWeight,wb?.ok?wb.takeoff.mass:null,'KG')+
  comp('ZERO FUEL WEIGHT',plan.zeroFuelWeight,wb?.ok?wb.zeroFuel.mass:null,'KG')+
  comp('LANDING WEIGHT',plan.landingWeight,null,'KG')+
  comp('TAKEOFF CG',null,wb?.ok?wb.takeoff.cg:null,'M');
  body+='<p class="sub">WEIGHT & BALANCE preserva seu perfil independente e a distribuição real por tanque. Valores divergentes exigem revisão.</p>';
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
 body+='</section><button class="secondary stretch" id="back-summary">BACK TO SUMMARY</button>';
 return body;
}
function modulesPage(){
 const modules=[
 ['WEIGHT & BALANCE','./wb.html'],
 ['TAKEOFF PERFORMANCE','./index.html?calculator=1&module=takeoff'],
 ['RUNWAY ANALYSIS','./index.html?calculator=1&module=runway'],
 ['CLIMB PERFORMANCE','./index.html?calculator=1&module=climb'],
 ['ONE ENGINE INOPERATIVE','./index.html?calculator=1&module=oei'],
 ['CRUISE PERFORMANCE','./index.html?calculator=1&module=cruiseperf'],
 ['LANDING PERFORMANCE','./index.html?calculator=1&module=landing'],
 ['GO-AROUND PERFORMANCE','./index.html?calculator=1&module=goaround'],
 ['TIME TO CLIMB','./index.html?calculator=1&module=timeclimb']
 ];
 return '<div class="note">Os módulos abaixo utilizam os motores originais do Aero UI. Condições importadas são sincronizadas após confirmação; revise sempre os demais parâmetros.</div>'+
 modules.map(([name,url])=>'<a class="card-button" href="'+url+'"><span>'+esc(name)+'</span>'+icon('next')+'</a>').join('');
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
 root.innerHTML='<div class="phone"><header class="topbar"><button id="back-or-menu" aria-label="Open menu">'+icon('menu')+'</button><h1>DA42 NG</h1><button id="open-more" aria-label="Settings">'+icon('settings')+'</button></header>'+
 '<main class="content" id="scroll-content">'+heading()+page+(view==='plan'?'':'<p class="disclaimer">EXPERIMENTAL PERFORMANCE · NOT FOR FLIGHT</p>')+'</main>'+
 '<nav class="bottom" aria-label="Main navigation">'+[['plan','PLAN'],['summary','SUMMARY'],['modules','MODULES'],['more','MORE']].map(([k,label])=>
 '<button type="button" class="nav '+((view===k||view==='review'&&k==='plan'||view==='comparison'&&k==='summary')?'active':'')+'" data-view="'+k+'" aria-label="'+label+'">'+icon(k)+'<span>'+label+'</span></button>').join('')+'</nav></div>';
 bind();
}
function show(v){view=v;err='';render()}
function setStatus(message,isError){loading=false;err=isError?message:'';view='plan';render()}
function acceptRaw(raw,source){
 const next=C.normalize(raw);next.source=source;
 plan=next;reviewed=false;
 try{sessionStorage.setItem(flightKey,JSON.stringify(plan));sessionStorage.removeItem(flightKey+'-synced')}catch{}
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
 try{
  localStorage.setItem(storageKey,JSON.stringify(persisted));
  sessionStorage.setItem(flightKey,JSON.stringify(plan));
  sessionStorage.setItem(flightKey+'-synced','1');
 }catch(e){
  err='Não foi possível salvar os dados no navegador.';
  if(navigate)render();
  return false;
 }
 reviewed=true;err='';
 if(navigate)show('summary');
 return true;
}
function bind(){
 root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));
 const more=root.querySelector('#open-more');if(more)more.onclick=()=>show('more');
 const menu=root.querySelector('#back-or-menu');if(menu)menu.onclick=()=>show(view==='review'?'plan':view==='comparison'?'summary':'modules');
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
 const backSum=root.querySelector('#back-summary');if(backSum)backSum.onclick=()=>show('summary');
 root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{compareTab=b.dataset.tab;render()});
 const clear=root.querySelector('#clear-plan');if(clear)clear.onclick=()=>{
  plan=null;reviewed=false;err='';
  try{sessionStorage.removeItem(flightKey);sessionStorage.removeItem(flightKey+'-synced')}catch{}
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
window.AeroFlight={get plan(){return plan},get view(){return view},normalize:C.normalize,acceptRaw,applyPlan,get performance(){return performance()}};
render();
if('serviceWorker' in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
