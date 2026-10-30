/* Aero UI — DA42 NG flight-plan review checklist.
 * UI data-integrity checks only. CHECKED never means flight clearance.
 * All signatures are tied to the fields used by the corresponding decision.
 */
(function(root){
'use strict';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const sig=(...fields)=>JSON.stringify(fields.map(v=>v===undefined?null:v));
function build(plan,stored,wb,confirms,wbProfile,wbOptimized=false,loadingMode='manual',activeLoading=null){
 if(!plan)return [];
 const inputs=stored&&stored.inputs||{};
 const takeoff=inputs.takeoff||{};
 const runway={...(inputs.runway||{}),...takeoff};
 const o=plan.weather&&plan.weather.origin||{};
 const compatible=plan.aircraft==='DA42'&&!plan.mismatch;
 const hasOriginPA=finite(plan.originElevation)&&finite(o.qnh)&&!!root.RunwayAnalysis;
 const importedPA=hasOriginPA?root.RunwayAnalysis.pressureAltitude(plan.originElevation,o.qnh):null;
 const pa=finite(takeoff.pa)?takeoff.pa:runway.pa;
 const runwayId=runway.runwayId||plan.originRunway||'';
 const sameRunway=(!plan.originRunway||runwayId===plan.originRunway)&&
   (!plan.runway?.identifier||runwayId===plan.runway.identifier);
 const profile=typeof wbProfile==='string'?wbProfile:'';
 const data=confirms&&typeof confirms==='object'?confirms:{};
 const items=[];
 function add(id,label,icon,priority,valid,automatic,detail,signature,action,href,confirmText){
   const done=compatible&&valid&&(automatic||data[id]===signature);
   const status=done?'checked':priority;
   items.push({id,label,icon,status,detail,signature,
    manual:compatible&&valid&&!automatic,
    confirmed:done&&!automatic,action:action||'',href:href||'',confirmText:confirmText||'CONFIRM VERIFIED'});
 }
 const runLink='./index.html?calculator=1&module=takeoff&reviewRunway=1';
 const takeLink='./index.html?calculator=1&module=takeoff';
 const wbLink='./wb.html';
 add('variant','DA42 NG','plane','verify',
   compatible,false,
   compatible?'Confirme a variante DA42 NG e a aplicabilidade do AFM, da configuração e do limite de massa desta aeronave.':'O OFP não corresponde ao DA42; a sincronização permanece bloqueada.',
   sig(plan.aircraft,plan.aircraftName,plan.aircraftVerified,takeoff.maxMass,plan.takeoffWeight),
   '', '', 'CONFIRM VARIANT');
 const altitudeValid=compatible&&finite(pa)&&pa>=0&&pa<=10000;
 const altitudeAutomatic=hasOriginPA&&finite(importedPA)&&importedPA>=0&&importedPA<=10000;
 add('pressure','PRESSURE ALT','mountain','verify',altitudeValid,altitudeAutomatic,
   finite(importedPA)&&importedPA<0?
     'A altitude-pressão de origem está abaixo de 0 ft e o motor usa o limite inferior de tabela. Confirme a aplicabilidade da tabela AFM antes de reconhecer.':
     'Verifique elevação, QNH e altitude-pressão aplicável. Não confunda limite da tabela com altitude-pressão real.',
   sig(plan.origin,plan.originElevation,o.qnh,importedPA,takeoff.pa,runway.paMode,runway.elevation,runway.qnh),
   'OPEN PRESSURE ALT',runLink,'CONFIRM TABLE LIMIT');
 const toraValid=compatible&&sameRunway&&runway.toraVerified===true&&runway.lengthEstimated!==true&&
   finite(runway.length)&&runway.length>0&&runway.length<=5000;
 add('tora','TORA','runway','required',toraValid,true,
   'A TORA disponível deve corresponder à pista e ao sentido usados. Comprimento físico estimado não equivale a TORA verificada.',
   sig(plan.origin,runwayId,runway.length,runway.toraVerified,runway.lengthEstimated),
   'OPEN RUNWAY',takeLink);
 const windValid=compatible&&sameRunway&&runway.windVerified===true&&finite(runway.wind)&&
   runway.wind>=-10&&runway.wind<=20;
 add('wind','RUNWAY WIND','wind','required',windValid,true,
   'Confirme o componente longitudinal do vento para a pista selecionada. METAR e orientação magnética sem conversão não estabelecem o componente com segurança.',
   sig(plan.origin,runwayId,runway.wind,runway.windVerified,runway.windSource,o.raw),
   'OPEN RUNWAY',runLink);
 const slopeValid=compatible&&sameRunway&&runway.slopeVerified===true&&finite(runway.slope)&&
   runway.slope>=0&&runway.slope<=5;
 add('slope','RUNWAY SLOPE','slope','verify',slopeValid,true,
   'Confirme a inclinação da pista e a convenção do modelo: uphill slope, 0–5%. Um valor presumido de 0% não é verificação.',
   sig(plan.origin,runwayId,runway.slope,runway.slopeVerified),
   'OPEN RUNWAY',runLink);
 const surfaceValid=compatible&&sameRunway&&runway.surfaceVerified===true&&
   ['paved','grass5','grass10','grass25'].includes(runway.surface);
 add('surface','RUNWAY SURFACE','runway','verify',surfaceValid,true,
   'Selecione o tipo de superfície e as condições de pista aplicáveis. O OFP não comprova automaticamente PAVED versus GRASS.',
   sig(plan.origin,runwayId,runway.surface,runway.surfaceVerified,runway.wet,runway.soft),
   'OPEN RUNWAY',runLink);
 // WBEngine.ok means structurally valid inputs, NOT that the mass/CG are
 // within the loading envelope. Simulated optimizer loads cannot validate
 // the OFP manifest, even if their numerical TOW happens to be identical.
 const wbAvailable=!!(wb&&wb.ok&&wb.takeoff&&finite(wb.takeoff.cg)&&finite(wb.takeoff.mass));
 const wbWithinLimits=wbAvailable&&wb.statuses?.massOK===true&&wb.statuses?.cgOK===true;
 const useWB=loadingMode!=='simbrief';
 const simulated=loadingMode==='optimized';
 const wbValid=useWB&&wbWithinLimits&&(!simulated||wbOptimized);
 const cgDetail=loadingMode==='simbrief'?
  'CG NOT PROVIDED · OFP supplies mass/fuel, not station loads. Select MANUAL or OPTIMIZED to model a CG.':
  !wbValid?'CHECK MASS / CG · Complete the selected W&B profile.':
  simulated?'SIMULATED CG · Model within the available envelope.':'CHECK CG · Confirm the loading stations and envelope.';
 add('cg','CG','target','verify',wbValid,simulated,cgDetail,
   sig(loadingMode,plan.aircraft,profile,wb?.takeoff?.cg,wb?.takeoff?.mass,wb?.ok,wbOptimized),
   'OPEN WEIGHT & BALANCE',wbLink,'CONFIRM CG');
 const weatherAvailable=typeof o.raw==='string'&&o.raw.trim().length>0;
 add('weather','WEATHER · OFP SNAPSHOT','cloud','review',compatible&&weatherAvailable,false,
   'O METAR/TAF do OFP é um registro de planejamento, não meteorologia atual. CHECKED significa apenas que o snapshot foi lido; dados meteorológicos operacionais devem ser verificados independentemente.',
   sig(plan.generated,plan.origin,plan.originRunway,o.raw,o.taf,o.qnh,o.oat,runway.wind,runway.windSource,takeoff.oat),
   'VIEW OFP WEATHER','#weather-ofp','ACKNOWLEDGE SNAPSHOT');
 const tw=plan.takeoffWeight;
 const massValid=compatible&&finite(tw)&&tw>=1700&&tw<=1999;
 const calculatorMatch=finite(takeoff.mass);
 const simbriefOk=massValid&&calculatorMatch&&Math.abs(takeoff.mass-tw)<=1&&
   tw<=(finite(takeoff.maxMass)?takeoff.maxMass:1900);
 const wbOk=wbValid&&calculatorMatch&&Math.abs(wb.takeoff.mass-takeoff.mass)<=1&&
  wb.takeoff.mass>=1700&&wb.takeoff.mass<=1900;
 const resolved=loadingMode==='simbrief'?simbriefOk:wbOk;
 const detail=loadingMode==='simbrief'?
   'SIMBRIEF · TOW is the active source. Fuel is already included. CG requires separate station data.':
   loadingMode==='optimized'?
   'OPTIMIZED · Simulated station loads; within mass/CG limits, with performance masses synchronized.':
   'MANUAL · Station loads and fuel determine TOW / CG; performance masses are synchronized.';
 add('takeoffWeight','TAKEOFF WEIGHT','weight',massValid?'review':'required',resolved,true,
   detail,sig(loadingMode,plan.takeoffWeight,profile,takeoff.mass,wb?.takeoff?.mass,wbOptimized),
   'OPEN WEIGHT & BALANCE',wbLink);
 if(!runwayId){
   add('runwayId','RUNWAY IDENTIFICATION','runway','required',false,false,
     'O OFP não identificou a pista de decolagem. Gere ou importe um OFP com pista definida e confira os dados de pista.',
     sig(plan.origin,plan.originRunway,runwayId),'','');
 }
 // The selected loading source, not the OFP alone, owns landing mass.
 // SimBrief uses OFP LDW; MANUAL / OPTIMIZED use modeled TOW - trip burn.
 const burn=finite(plan.tripFuel)&&plan.tripFuel>=0?plan.tripFuel:
  finite(plan.takeoffWeight)&&finite(plan.landingWeight)&&plan.takeoffWeight>=plan.landingWeight?
   plan.takeoffWeight-plan.landingWeight:null;
 const modeledLanding=wbValid&&finite(burn)&&finite(wb?.takeoff?.mass)&&wb.takeoff.mass>burn?
  wb.takeoff.mass-burn:null;
 const activeValid=activeLoading?.mode===loadingMode&&activeLoading.valid===true;
 const landingMass=loadingMode==='simbrief'?plan.landingWeight:
  activeValid?activeLoading.landing:modeledLanding;
 const landingSourceValid=loadingMode==='simbrief'?compatible:
  wbValid&&(activeLoading===null||activeValid);
 const known=landingSourceValid&&finite(landingMass)&&landingMass>0;
 const inTable=known&&landingMass>=1700&&landingMass<=1999;
 const outLow=known&&landingMass<1700;
 const landingInputs=inputs.landing||{};
 const synced=inTable&&finite(landingInputs.mass)&&Math.abs(landingInputs.mass-landingMass)<=1;
 const landingPriority=outLow?'out-of-table':!known||landingMass>1999?'required':'review';
 const landingDetail=outLow?
  'OUT OF TABLE · '+landingMass.toFixed(1)+' KG · AFM 1700–1999 KG. Landing distance unavailable; no extrapolation.':
  !known?'LANDING WEIGHT REQUIRED · '+(loadingMode==='simbrief'?'CHECK OFP LDW.':'CHECK W&B AND TRIP FUEL.') :
  landingMass>1999?'LANDING WEIGHT ABOVE PUBLISHED LIMIT · CHECK LOAD.':
  synced?'LANDING WEIGHT · '+landingMass.toFixed(1)+' KG · '+loadingMode.toUpperCase()+'.':
  'SYNC LANDING WEIGHT · '+landingMass.toFixed(1)+' KG · '+loadingMode.toUpperCase()+'.';
 add('landingWeight','LANDING WEIGHT','weight',landingPriority,synced,true,
  landingDetail,sig(loadingMode,landingMass,landingInputs.mass,plan.tripFuel,plan.takeoffWeight,plan.landingWeight,profile,wbOptimized),
  loadingMode==='simbrief'?'OPEN FLIGHT PLAN':'OPEN WEIGHT & BALANCE',
  loadingMode==='simbrief'?'./flight.html?review=1':wbLink);
 if(!hasOriginPA||!finite(o.oat)||o.oat<0||o.oat>50){
   add('originWeather','ORIGIN WEATHER DATA','cloud','required',false,false,
     'Verifique QNH, elevação e OAT de origem. Os dados importados não permitem sincronização atmosférica completa com a calculadora.',
     sig(plan.originElevation,o.qnh,o.oat),'','');
 }
 return items;
}
const fingerprint=plan=>sig(plan?.source,plan?.origin,plan?.destination,plan?.generated,plan?.route,
 plan?.originRunway,plan?.aircraft,plan?.aircraftName);
const api={build,fingerprint};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FlightChecklist=api;
})(typeof window!=='undefined'?window:globalThis);
