/* Aero UI DA42 NG — single active loading source for simulator studies.
 * SimBrief TOW includes takeoff fuel; never add it to TOW a second time.
 * OFP fuel alone does not specify tank distribution or an aircraft CG.
 */
(function(root){
'use strict';
const MODE_KEY='da42-loading-mode-v1';
const OFP_KEY='aero-ui-flight-plan-v1';
const STORE_KEY='aero-ui-da42-v1';
const PROFILE_KEY='da42-wb-profile-v1';
const OPT_KEY='da42-wb-optimized-v1';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const parse=s=>{try{return JSON.parse(s||'null')}catch{return null}};
function plan(storage){const p=parse(storage.getItem(OFP_KEY));return p&&p.aircraft==='DA42'&&!p.mismatch?p:null}
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
 const trip=p&&finite(p.takeoffWeight)&&finite(p.landingWeight)?
  p.takeoffWeight-p.landingWeight:null;
 const landing=ok&&finite(trip)&&trip>=0?wb.takeoff.mass-trip:null;
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
 if(finite(item.landing)&&item.landing>=1700&&item.landing<=1900)
  for(const name of ['landing','abnormal','goaround'])
   data.inputs[name]={...(data.inputs[name]||{}),mass:item.landing};
 storage.setItem(STORE_KEY,JSON.stringify(data));
 return item;
}
const api={MODE_KEY,OFP_KEY,STORE_KEY,PROFILE_KEY,OPT_KEY,capacity,totalCapacity,
 plan,mode,setMode,distribute,loading,sync};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.LoadingProfile=api;
})(typeof window!=='undefined'?window:globalThis);
