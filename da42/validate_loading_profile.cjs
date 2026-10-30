'use strict';
const assert=require('node:assert/strict');
const Load=require('./loading-profile.js');
const W=require('./wb-engine.js');
function storage(){
 const map=new Map();
 return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
}
const db=storage();
const p={aircraft:'DA42',source:'SIMBRIEF',origin:'SBGL',destination:'SBSP',
 takeoffWeight:1850,zeroFuelWeight:1649,plannedFuel:201,landingWeight:1730};
assert.equal(Load.mode(db,p),'simbrief','new OFP defaults to SIMBRIEF');
const second=storage();
assert.equal(Load.plan(second,db),null,'no import yet');
assert.equal(Load.savePlan(db,p),true);
assert.equal(Load.plan(second,db).takeoffWeight,1850,'cross-tab OFP fallback');
assert.equal(Load.plan(db,db).origin,'SBGL');
second.setItem(Load.OFP_KEY,JSON.stringify({...p,aircraft:'B738'}));
assert.equal(Load.plan(second,db),null,'incompatible active OFP must block stale fallback');
second.removeItem(Load.OFP_KEY);
assert.equal(Load.savePlan(db,{...p,source:'MANUAL'}),false,'manual plan cannot impersonate SimBrief');
assert.equal(Load.plan(second,db).source,'SIMBRIEF');

assert.equal(Load.mode(db,null),'manual','without OFP, editable manual loading is default');
assert.equal(Load.distribute(514).ok,false,'impossible fuel cannot be loaded into the DA42');
assert.equal(Load.distribute(null).ok,false,'missing fuel must remain unknown');
assert.equal(Load.totalCapacity,243);
const fuel=Load.distribute(201);
assert.deepEqual(fuel.tanks,{mainL:79.5,mainR:79.5,auxL:21,auxR:21});
assert.equal(Object.values(fuel.tanks).reduce((a,b)=>a+b,0),201);
assert.ok(fuel.assumed,'per-tank values are modelled assumptions, not OFP measurements');
const wb=W.calculate(W.EXAMPLE);
assert.ok(wb.ok&&wb.statuses.massOK&&wb.statuses.cgOK);
db.setItem(Load.STORE_KEY,JSON.stringify({current:'takeoff',inputs:{
 takeoff:{mass:1800,pa:2000,wind:7},runway:{mass:1800,length:900,toraVerified:true},
 climb:{mass:1800,power:92},landing:{mass:1700,oat:15}
}}));
let load=Load.sync(db,p,wb,'simbrief');
assert.equal(load.tow,1850);
assert.equal(load.fuel.total,201);
assert.equal(load.cg,null,'OFP has no confirmed station CG');
const get=()=>JSON.parse(db.getItem(Load.STORE_KEY)).inputs;
for(const key of ['takeoff','runway','climb','oei'])assert.equal(get()[key].mass,1850);
assert.equal(get().takeoff.pa,2000);
assert.equal(get().runway.length,900);
assert.equal(get().runway.toraVerified,true);
assert.equal(get().landing.mass,1730);
assert.ok(Load.setMode(db,'manual',p));
load=Load.sync(db,p,wb,'manual');
assert.ok(load.valid);
for(const key of ['takeoff','runway','climb','oei'])assert.equal(get()[key].mass,wb.takeoff.mass);
assert.equal(get().landing.mass,wb.takeoff.mass-120);
assert.equal(get().landing.oat,15);
assert.equal(Load.mode(db,p),'manual');
assert.ok(Load.setMode(db,'optimized',p));
assert.equal(Load.mode(db,p),'optimized');
const before=JSON.stringify(get());
assert.ok(!Load.sync(db,p,{...wb,statuses:{...wb.statuses,cgOK:false}},'optimized').valid);
assert.equal(JSON.stringify(get()),before,'invalid optimizer result must not update any performance input');
assert.ok(!Load.setMode(db,'simbrief',null),'SIMBRIEF mode requires an OFP');
assert.equal(Load.loading({...p,plannedFuel:514},null,'simbrief').limitation,'FUEL EXCEEDS TANK CAPACITY');
assert.equal(Load.loading({...p,takeoffWeight:2000},null,'simbrief').valid,false);
Load.clearPlan(db);
assert.equal(Load.plan(second,db),null,'cleared OFP is no longer offered in another tab');
console.log('PASS loading modes, SimBrief T/O fuel tank distribution, sync, CG provenance, no double counting, invalid fuel guards.');
