/* Aero UI / DA42 NG — SimBrief OFP import and conservative, typed data mapping.
 * Plan data is not AFM performance. Never silently substitute OFP weights or fuel
 * for aircraft-specific Weight & Balance or missing runway conditions.
 */
(function(root){
'use strict';
const get=(o,k)=>o&&typeof o==='object'?o[k]:undefined;
const val=(x)=>{if(x===null||x===undefined||x===''||typeof x==='object')return null;
 const n=Number(x);return Number.isFinite(n)?n:null};
const text=(x)=>typeof x==='string'?x.trim():'';
const upper=(x)=>text(x).toUpperCase();
const number=(n,min,max)=>n!==null&&n>=min&&n<=max?n:null;
const one=(x)=>Array.isArray(x)?x[0]||{}:x&&typeof x==='object'?x:{};
const kilo=(v,units)=>v===null?null:units==='LBS'?v*0.45359237:units==='KGS'?v:null;
const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
const duration=(v)=>{const s=text(String(v??''));if(/^\d{1,2}:\d\d(?::\d\d)?$/.test(s))return s.slice(0,5);
 const n=val(v);if(n===null||n<0||n>86400)return null;return String(Math.floor(n/3600)).padStart(2,'0')+':'+String(Math.floor(n%3600/60)).padStart(2,'0')};
function metar(raw){
 const line=text(raw).slice(0,500);
 const wind=line.match(/\b(\d{3}|VRB)(\d{2,3})(?:G\d{2,3})?KT\b/);
 const temp=line.match(/\b(M?\d{2})\/(M?\d{2})\b/);
 const qnh=line.match(/\bQ(\d{4})\b/),alt=line.match(/\bA(\d{4})\b/);
 const oat=temp?(temp[1][0]==='M'?-Number(temp[1].slice(1)):Number(temp[1])):null;
 const pressure=qnh?Number(qnh[1]):alt?Number(alt[1])/100*33.8638866667:null;
 return {raw:line,windDir:wind&&wind[1]!=='VRB'?Number(wind[1]):null,
  windSpeed:wind?Number(wind[2]):null,oat, qnh:pressure?Math.round(pressure*100)/100:null};
}
/* SimBrief optional TLR data: lengths are in feet (not TORA in metres).
 * Do not substitute physical runway length for a missing length_tora.
 * Never derive runway magnetic heading directly from a runway number.
 */
function runwayIdent(id){
 const v=upper(id).replace(/^RWY\s*/,'');
 const m=v.match(/^([0-3]?\d)([LRC]?)$/);
 if(!m)return '';
 const n=Number(m[1]);
 return n>=1&&n<=36?String(n).padStart(2,'0')+m[2]:'';
}
function runwayData(raw,planRunway,weather){
 const dep=raw.tlr?.takeoff;
 const declared=runwayIdent(planRunway);
 const tlrPlan=runwayIdent(dep?.conditions?.planned_runway);
 const planned=declared||tlrPlan;
 const airport=upper(raw.origin?.icao_code||raw.origin?.icao);
 const tlrAirport=upper(dep?.conditions?.airport_icao);
 const airportMatch=!tlrAirport||tlrAirport===airport;
 const candidates=Array.isArray(dep?.runway)?dep.runway:dep?.runway?[dep.runway]:[];
 const match=candidates.find(x=>runwayIdent(x?.identifier)===planned);
 const runway=planned&&airportMatch&&(!declared||!tlrPlan||tlrPlan===declared)?match:null;
 const unitName=upper(raw.params?.tlr_length_units||raw.params?.length_units||dep?.conditions?.length_units||dep?.conditions?.length_unit);
 const asMetres=unitName==='M'||unitName==='METERS'||unitName==='METRES';
 const asFeet=!unitName||unitName==='FT'||unitName==='FEET';
 const factor=asMetres?1:asFeet?0.3048:null;
 const distance=x=>{const rawLength=number(val(x),1,16404.2);
  return rawLength!==null&&factor!==null?Math.floor(rawLength*factor*10)/10:null};
 const tora=distance(runway?.length_tora);
 const length=distance(runway?.length);
 const trueCourse=number(val(runway?.true_course),0,360);
 const magneticCourse=number(val(runway?.magnetic_course),0,360);
 const hw=number(val(runway?.headwind_component),-100,100);
 const wDir=number(val(weather?.windDir),0,360),wSpeed=number(val(weather?.windSpeed),0,200);
 let component=null,windSource='';
 // A TLR runway component is already runway-specific; otherwise METAR winds
 // are true, so only combine them with TLR TRUE course, never runway number.
 if(hw!==null){component=hw;windSource='OFP TLR'}
 else if(trueCourse!==null&&wDir!==null&&wSpeed!==null){
  component=wSpeed*Math.cos((wDir-trueCourse)*Math.PI/180);
  windSource='OFP METAR + TRUE COURSE';
 }
 const conservative=component===null?null:Math.floor(component+1e-10);
 const gradient=number(val(runway?.gradient),0,5);
 const condition=upper(dep?.conditions?.surface_condition);
 return {identifier:planned,tlrMatched:!!runway,tora,length,lengthUnits:unitName||'FT (DEFAULT)',source:tora===null?'':'OFP TLR',
  trueCourse,magneticCourse,headwind:conservative,windSource,
  crosswind:conservative===null||wSpeed===null||wDir===null||trueCourse===null?null:
   Math.round(wSpeed*Math.sin((wDir-trueCourse)*Math.PI/180)*10)/10,
  slope:gradient,condition:condition==='DRY'||condition==='WET'?condition:'',
  // PAVED vs GRASS is not established by SimBrief's dry/wet condition.
  surface:null};
}
function normalize(raw){
 if(!raw||typeof raw!=='object')throw Error('OFP inválido: conteúdo não é um objeto.');
 if(raw.fetch&&raw.fetch.status&&upper(raw.fetch.status)!=='SUCCESS')throw Error('SimBrief: '+text(raw.fetch.status).slice(0,130));
 const g=raw.general||{},p=raw.params||{},ac=raw.aircraft||{},origin=raw.origin||{},dest=raw.destination||{},
       alt=one(raw.alternates?.alternate??raw.alternates),f=raw.fuel||{},w=raw.weights||{},weather=raw.weather||{},times=raw.times||{};
 const units=upper(p.units);
 const weight=(x)=>kilo(val(x),units);
 const type=upper(ac.icao_code||ac.icao||raw.atc?.aircraft_type);
 const name=text(ac.name);
 const mismatch=type!==''&&type!=='DA42'||(/DA42/i.test(name)&&!/NG|D42|DA42/i.test(name)&&type!=='DA42');
 const aircraftVerified=type==='DA42'&&/NG/i.test(name);
 const originCode=upper(origin.icao_code||origin.icao),destinationCode=upper(dest.icao_code||dest.icao);
 if(!/^[A-Z0-9]{4}$/.test(originCode)||!/^[A-Z0-9]{4}$/.test(destinationCode))
  throw Error('OFP sem códigos ICAO válidos para origem e destino.');
 if(units!=='KGS'&&units!=='LBS')throw Error('Unidade de WEIGHT não reconhecida no OFP.');
 const altnCode=upper(alt.icao_code||alt.icao);
 const generated=text(p.time_generated||p.time_gen||raw.fetch?.time||'');
 const altMet=Array.isArray(weather.altn_metar)?weather.altn_metar[0]:text(weather.altn_metar);
 const altTaf=Array.isArray(weather.altn_taf)?weather.altn_taf[0]:text(weather.altn_taf);
 const result={
  source:'SIMBRIEF',origin:originCode,destination:destinationCode,alternate:/^[A-Z0-9]{4}$/.test(altnCode)?altnCode:'',
  aircraft:type||name||'UNKNOWN',aircraftName:name,aircraftVerified,mismatch,generated,units,
  originRunway:runwayIdent(origin.plan_rwy),destinationRunway:runwayIdent(dest.plan_rwy),
  runway:runwayData(raw,origin.plan_rwy,metar(weather.orig_metar)),
  originElevation:number(val(origin.elevation),-1500,15000),destinationElevation:number(val(dest.elevation),-1500,15000),
  route:text(g.route).slice(0,1200),distance:number(val(g.route_distance),0,20000),
  alternateDistance:number(val(alt.distance),0,20000),cruiseAltitude:number(val(g.initial_altitude),0,50000),
  flightTime:duration(times.est_time_enroute),takeoffWeight:weight(w.est_tow),landingWeight:weight(w.est_ldw),
  zeroFuelWeight:weight(w.est_zfw),plannedFuel:weight(f.plan_takeoff),blockFuel:weight(f.plan_ramp),
  tripFuel:weight(f.enroute_burn),alternateFuel:weight(f.alternate_burn),
  reserveFuel:weight(f.reserve),landingFuel:weight(f.plan_landing),
  weather:{
   origin:{...metar(weather.orig_metar),taf:text(weather.orig_taf).slice(0,1200)},
   destination:{...metar(weather.dest_metar),taf:text(weather.dest_taf).slice(0,1200)},
   alternate:{...metar(altMet),taf:text(altTaf).slice(0,1200)}
  }
 };
 if(result.takeoffWeight!==null&&(result.takeoffWeight<0||result.takeoffWeight>150000))throw Error('TAKEOFF WEIGHT inválido no OFP.');
 if(result.tripFuel!==null&&(result.tripFuel<0||result.tripFuel>150000))throw Error('TRIP FUEL inválido no OFP.');
 return result;
}
function proposedInputs(plan,existing){
 const result={};const warnings=[],o=plan.weather?.origin||{},d=plan.weather?.destination||{};
 const tw=plan.takeoffWeight,lw=plan.landingWeight;
 if(!plan.aircraftVerified)warnings.push('O OFP não especifica a variante NG. Verifique a compatibilidade dos dados antes do uso.');
 if(plan.mismatch)warnings.push('O código de aeronave do OFP não corresponde ao DA42. Sincronização bloqueada.');
 if(tw===null||tw<1700||tw>1999)warnings.push('TAKEOFF WEIGHT fora do domínio da calculadora (1700–1999 KG).');
 else for(const key of ['takeoff','climb','oei','runway'])result[key]={mass:tw};
 if(lw!==null&&lw>=1700&&lw<=1999)for(const key of ['landing','abnormal','goaround'])result[key]={...(result[key]||{}),mass:lw};
 else warnings.push('LANDING WEIGHT ausente ou fora do domínio. Valores anteriores preservados.');
 if(finite(plan.cruiseAltitude)&&plan.cruiseAltitude<=18000) {
  result.cruise={pa:plan.cruiseAltitude};
  result.cruiseperf={pa:plan.cruiseAltitude};
  result.climb={...(result.climb||{}),profileTarget:plan.cruiseAltitude};
 }
 if(finite(plan.originElevation)&&finite(o.qnh)&&finite(o.oat)){
  const pa=root.RunwayAnalysis?root.RunwayAnalysis.pressureAltitude(plan.originElevation,o.qnh):null;
  if(finite(pa)&&pa<=10000&&pa>=-1000) {
   result.runway={...(result.runway||{}),paMode:'qnh',elevation:plan.originElevation,qnh:o.qnh};
   for(const k of ['takeoff','climb','oei'])result[k]={...(result[k]||{}),pa:Math.max(0,pa)};
   if(pa<0)warnings.push('PRESSURE ALT abaixo de 0 FT: TAKEOFF e CLIMB usarão limite 0 FT; verificar aplicabilidade.');
  }else warnings.push('PRESSURE ALT da origem fora do domínio. Ajuste manual necessário.');
  if(o.oat>=0&&o.oat<=50)for(const k of ['takeoff','runway','climb','oei'])result[k]={...(result[k]||{}),oat:o.oat,isa:false};
  else warnings.push('OAT da origem fora do domínio de TAKEOFF. Ajuste manual necessário.');
 }else warnings.push('METAR de origem ou elevação/QNH indisponível. Não foi possível sincronizar condições atmosféricas.');
 if(finite(plan.destinationElevation)&&finite(d.qnh)&&finite(d.oat)) {
  const pa=root.RunwayAnalysis?root.RunwayAnalysis.pressureAltitude(plan.destinationElevation,d.qnh):null;
  if(finite(pa)&&pa>=0&&pa<=10000&&d.oat>=-20&&d.oat<=50)
   for(const k of ['landing','abnormal','goaround'])result[k]={...(result[k]||{}),pa,oat:d.oat,isa:false};
 }
 // A fresh OFP must never silently retain TORA/wind/surface/slope from
 // the previous airport. A missing field blocks this RUNWAY analysis until
 // the pilot enters and verifies it in the existing RUNWAY controls.
 const rw=plan.runway||{};
 const runwayFields={
  runwayId:rw.identifier||'',runwaySource:'SIMBRIEF OFP',
  length:Number.isFinite(rw.tora)?rw.tora:Number.isFinite(rw.length)?rw.length:0,
  runwayLength:Number.isFinite(rw.length)?rw.length:null,
  lengthEstimated:!Number.isFinite(rw.tora)&&Number.isFinite(rw.length),
  toraVerified:Number.isFinite(rw.tora),
  wind:Number.isFinite(rw.headwind)&&rw.headwind>=-10&&rw.headwind<=20?rw.headwind:0,
  windVerified:Number.isFinite(rw.headwind)&&rw.headwind>=-10&&rw.headwind<=20,
  windSource:rw.windSource||'',
  slope:Number.isFinite(rw.slope)?rw.slope:0,
  slopeVerified:Number.isFinite(rw.slope),
  surface:'paved',surfaceVerified:false,wet:false,soft:false
 };
 result.runway={...(result.runway||{}),...runwayFields};
 // The same runway-specific component feeds TAKEOFF. When unknown, clear the
 // old wind instead of carrying an assumed headwind from a previous mission.
 result.takeoff={...(result.takeoff||{}),wind:runwayFields.windVerified?runwayFields.wind:null};
 if(!rw.identifier)warnings.push('RUNWAY não identificada no OFP.');
 if(!runwayFields.toraVerified)warnings.push('TORA indisponível no OFP. Informe a TORA da pista selecionada.');
 if(!runwayFields.windVerified)warnings.push('WIND COMPONENT não resolvido para a pista. Verifique o vento e o rumo verdadeiro.');
 if(!runwayFields.slopeVerified)warnings.push('RUNWAY SLOPE não disponível no OFP. Confirme o aclive.');
 warnings.push('RUNWAY SURFACE não verificada. Confirme PAVED ou GRASS.');
 warnings.push('CG exige verificação no Weight & Balance.');
 warnings.push('METAR/TAF do OFP são históricos de planejamento, não dados meteorológicos em tempo real.');
 return {inputs:result,warnings};
}
function compare(plan,calculated,wb){
 const diffs=[];
 function compareOne(label,ofp,aero,unit){
  if(!finite(ofp)||!finite(aero))return;
  const delta=aero-ofp;
  diffs.push({label,ofp,aero,unit,delta});
 }
 if(wb?.ok){
  compareOne('TAKEOFF WEIGHT',plan.takeoffWeight,wb.takeoff?.mass,'KG');
  compareOne('ZERO FUEL WEIGHT',plan.zeroFuelWeight,wb.zeroFuel?.mass,'KG');
 }
 return diffs;
}
const api={normalize,metar,runwayIdent,runwayData,proposedInputs,compare,val,kilo,duration};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.SimBriefCore=api;
})(typeof window!=='undefined'?window:globalThis);
