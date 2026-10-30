/* Aero UI DA42 NG — single active loading source for simulator studies.
 * SimBrief TOW includes takeoff fuel; never add it to TOW a second time.
 * OFP fuel alone does not specify tank distribution or an aircraft CG.
 */
(function(root){
'use strict';
const MODE_KEY='da42-loading-mode-v1';
const OFP_KEY='aero-ui-flight-plan-v1';
const LAST_OFP_KEY='aero-ui-last-simbrief-ofp-v1';
const STORE_KEY='aero-ui-da42-v1';
const PROFILE_KEY='da42-wb-profile-v1';
const OPT_KEY='da42-wb-optimized-v1';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const parse=s=>{try{return JSON.parse(s||'null')}catch{return null}};
function usablePlan(p){
 return !!(p&&p.aircraft==='DA42'&&!p.mismatch&&p.source==='SIMBRIEF'&&
  typeof p.origin==='string'&&typeof p.destination==='string'&&
  finite(p.takeoffWeight));
}
// The session OFP is authoritative when present. A persisted imported OFP is
// a deliberate cross-tab fallback, never a synthesized flight plan.
function plan(session,local){
 const active=parse(session.getItem(OFP_KEY));
 if(active)return usablePlan(active)?active:null;
 if(!local)return null;
 const saved=parse(local.getItem(LAST_OFP_KEY));
 return usablePlan(saved)?saved:null;
}
function savePlan(local,p){
 if(!usablePlan(p))return false;
 local.setItem(LAST_OFP_KEY,JSON.stringify(p));
 return true;
}
function clearPlan(local){local.removeItem(LAST_OFP_KEY)}
function mode(storage,p){
 const v=storage.getItem(MODE_KEY);
 if(!p)return v==='optimized'?'optimized':'manual';
 return ['simbrief','manual','optimized'].includes(v)?v:'simbrief';
}
function setMode(storage,value,p){if(!['simbrief','manual','optimized'].includes(value)||value==='simbrief'&&!p)return false;storage.setItem(MODE_KEY,value);return true}
const capacity=Object.freeze({mainL:79.5,mainR:79.5,auxL:42,auxR:42});
const totalCapacity=Object.values(capacity).reduce((a,b)=>a+b,0);
function distribute(total){
 if(!finite(total)||total<0)return {ok:false,reason:'FUEL NOT PROVIDED',total};
 if(total>totalCapacity+1e-7)return {ok:false,reason:'FUEL EXCEEDS TANK CAPACITY',total,capacity:totalCapacity};
 // Symmetric mains-first is a modelled assumption, never claimed as an OFP
 // per-tank quantity or exact COWS configuration.
 const main=Math.min(total,capacity.mainL+capacity.mainR);
 const aux=Math.max(0,total-main);
 return {ok:true,assumed:true,total,capacity:totalCapacity,
  tanks:{mainL:main/2,mainR:main/2,auxL:aux/2,auxR:aux/2}};
}
function loading(p,wb,selected){
 const fuel=p?distribute(p.plannedFuel):null;
 if(selected==='simbrief'){
  return {mode:selected,tow:p&&finite(p.takeoffWeight)?p.takeoffWeight:null,
   landing:p&&finite(p.landingWeight)?p.landingWeight:null,
   zfw:p&&finite(p.zeroFuelWeight)?p.zeroFuelWeight:null,
   fuel, cg:null, cgVerified:false,
   valid:!!p&&finite(p.takeoffWeight)&&p.takeoffWeight>=1700&&p.takeoffWeight<=1900,
   limitation:!fuel?.ok?fuel?.reason:null};
 }
 const ok=!!(wb?.ok&&wb?.statuses?.massOK&&wb?.statuses?.cgOK&&
  finite(wb?.takeoff?.mass)&&wb.takeoff.mass>=1700&&wb.takeoff.mass<=1900);
 // MANUAL / OPTIMIZED: selected TOW minus planned en-route fuel burn.
 // Without a tripFuel field, an OFP TOW-LDW delta is a fallback.
 const trip=p&&finite(p.tripFuel)&&p.tripFuel>=0?p.tripFuel:
  p&&finite(p.takeoffWeight)&&finite(p.landingWeight)&&p.takeoffWeight>=p.landingWeight?
   p.takeoffWeight-p.landingWeight:null;
 const landing=ok&&finite(trip)&&trip>=0&&wb.takeoff.mass>trip?
   wb.takeoff.mass-trip:null;
 return {mode:selected,tow:wb?.ok?wb.takeoff.mass:null,
  landing:finite(landing)?landing:null,zfw:wb?.ok?wb.zeroFuel.mass:null,
  fuel:wb?.ok?{ok:true,total:wb.fuel.usableTotal,tanks:{
   mainL:wb.profile.mainL,mainR:wb.profile.mainR,auxL:wb.profile.auxL,auxR:wb.profile.auxR
  }}:null,cg:wb?.ok?wb.takeoff.cg:null,cgVerified:ok,valid:ok,limitation:null};
}
function sync(storage,p,wb,selected){
 const item=loading(p,wb,selected);
 if(!item.valid)return item;
 const data=parse(storage.getItem(STORE_KEY))||{};
 data.inputs=data.inputs&&typeof data.inputs==='object'?data.inputs:{};
 for(const name of ['takeoff','runway','climb','oei']){
  data.inputs[name]={...(data.inputs[name]||{}),mass:item.tow};
 }
 // Never retain stale landing mass when the source changes.
 // Out-of-table masses remain exact; the AFM landing engine rejects them.
 for(const name of ['landing','abnormal','goaround'])
  data.inputs[name]={...(data.inputs[name]||{}),
   mass:finite(item.landing)&&item.landing>0?item.landing:null};
 storage.setItem(STORE_KEY,JSON.stringify(data));
 return item;
}
const api={MODE_KEY,OFP_KEY,LAST_OFP_KEY,STORE_KEY,PROFILE_KEY,OPT_KEY,capacity,totalCapacity,
 plan,savePlan,clearPlan,mode,setMode,distribute,loading,sync};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.LoadingProfile=api;
})(typeof window!=='undefined'?window:globalThis);
