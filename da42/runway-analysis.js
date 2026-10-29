/* DA42 NG — runway distance analysis and distance-limited mass.
 * Reuses the published AFM §5.3.6 takeoff-table engine unchanged.
 * This is NOT an aircraft-certified MATOW, takeoff clearance, balanced
 * field analysis, accelerate-stop calculation or obstacle assessment.
 * Conservative assumption: TORA itself must exceed BOTH takeoff ground
 * roll and the table's distance over 50 ft; NO clearway/TODA credit.
 * Mass ceiling 1900 kg unless the operator EXPLICITLY selects the
 * MÄM 42-678 1999kg configuration (requires approved W&B/supplement).
 */
(function(root){
'use strict';
const MIN_MASS=1700;
const STANDARD_MAX=1900,OPTION_MAX=1999;
function pressureAltitude(elev,qnh){
 if(!Number.isFinite(elev)||!Number.isFinite(qnh)||qnh<=0)return NaN;
 // ISA altimetry, not density altitude: station pressure from QNH
 // using the standard barometric altimeter equation.
 const h=elev/3.280839895;
 const ratio=1-h/44330.76923;
 if(ratio<=0)return NaN;
 const station=qnh*Math.pow(ratio,5.2558797);
 return 44330.76923*(1-Math.pow(station/1013.25,1/5.2558797))*3.280839895;
}
function effectivePa(v){return v.paMode==='qnh'?pressureAltitude(v.elevation,v.qnh):v.pa}
function modelInput(v,mass){
 return {pa:effectivePa(v),oat:v.oat,mass,wind:v.wind??0,
  procedure:v.procedure||'normal',surface:v.surface||'paved',
  wet:!!v.wet,soft:!!v.soft,slope:v.slope??0,isa:!!v.isa};
}
function validate(v){
 if(!v||!Number.isFinite(v.length)||v.length<=0||v.length>5000)return 'TORA INVÁLIDA (1–5000 M)';
 if(v.paMode&& !['direct','qnh'].includes(v.paMode))return 'MODO DE PRESSÃO INVÁLIDO';
 if(v.paMode==='qnh'&&(!Number.isFinite(v.elevation)||v.elevation< -1000||v.elevation>10000||
  !Number.isFinite(v.qnh)||v.qnh<870||v.qnh>1085))return 'ELEVAÇÃO / QNH INVÁLIDOS';
 if(!Number.isFinite(effectivePa(v))||effectivePa(v)<0||effectivePa(v)>10000)return 'PRESSURE ALT FORA DAS TABELAS';
 if(!Number.isFinite(v.mass)||v.mass<MIN_MASS||v.mass>OPTION_MAX)return 'MASSA FORA DAS TABELAS';
 if(v.maxMass!==STANDARD_MAX&&v.maxMass!==OPTION_MAX)return 'CONFIGURAÇÃO DE MASSA INVÁLIDA';
 if(v.maxMass===OPTION_MAX&&!v.mam678)return 'MÄM 42-678 NÃO CONFIRMADA';
 const t=root.TakeoffTables;
 if(!t||typeof t.compute!=='function')return 'TABELA TAKEOFF INDISPONÍVEL';
 const source=t.validate(modelInput(v,v.mass));
 return source;
}
function checkDistance(t,available){
 return !t.error&&Number.isFinite(t.main)&&Number.isFinite(t.secondary)&&
  t.main<=available+1e-8&&t.secondary<=available+1e-8;
}
function compute(v){
 const error=validate(v);if(error)return {error};
 const table=root.TakeoffTables,length=v.length,cap=v.maxMass;
 const required=table.compute(modelInput(v,v.mass));
 if(required.error)return {error:required.error};
 const low=table.compute(modelInput(v,MIN_MASS));
 if(low.error)return {error:'SEM DADOS TABULADOS EM 1700 KG'};
 const hasAny=checkDistance(low,length);
 let maxMass=null,tableLimit=false;
 if(hasAny){
  const upper=table.compute(modelInput(v,cap));
  if(checkDistance(upper,length)){maxMass=cap;tableLimit=true}
  else{
   let left=MIN_MASS,right=cap;
   for(let n=0;n<48;n++){
    const mid=(left+right)/2,r=table.compute(modelInput(v,mid));
    if(checkDistance(r,length))left=mid;
    else right=mid;
   }
   // Never report an integer kg whose modeled distance exceeds the
   // declared runway. Check each rounded-down candidate independently.
   maxMass=Math.floor(left+1e-8);
   while(maxMass>=MIN_MASS&&!checkDistance(table.compute(modelInput(v,maxMass)),length))maxMass--;
   if(maxMass<MIN_MASS)maxMass=null;
  }
 }
 const meets=checkDistance(required,length);
 const exceedsMass=v.mass>cap;
 const status=exceedsMass?'MASS LIMIT EXCEEDED':
  !hasAny?'NO SUPPORTED MASS FITS':
  meets?'DISTANCE SUFFICIENT':'INSUFFICIENT DISTANCE';
 const vy=(v.procedure||'normal')==='short'?85:v.mass>1900?92:90;
 return {main:maxMass,secondary:length-required.main,primaryLabel:'MAX TAKEOFF WEIGHT',
  status,meets,exceedsMass,runwayLength:length,required:required.main,
  ground:required.secondary,remaining:length-required.main,
  groundRemaining:length-required.secondary,maxMass,
  maximumConfigured:cap,limitedByConfig:tableLimit,
  belowPublishedMinimum:!hasAny,verifiedByDistanceOnly:true,
  massMargin:maxMass===null?null:maxMass-v.mass,pa:effectivePa(v),
  speed:{...required.speed,vy},
  procedure:v.procedure||'normal',referenceMass:MIN_MASS,
  configurationRequiresSupplement:cap===OPTION_MAX,
  minimumOnlyGrass:v.surface==='grass25',experimental:true};
}
const api={MIN_MASS,STANDARD_MAX,OPTION_MAX,pressureAltitude,effectivePa,modelInput,
 validate,checkDistance,compute};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.RunwayAnalysis=api;
})(typeof window!=='undefined'?window:globalThis);
