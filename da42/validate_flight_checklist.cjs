/* Regression tests: OFP checklist is advisory, never dispatch authorization. */
'use strict';
const assert=require('node:assert/strict');
global.RunwayAnalysis={pressureAltitude:(e,q)=>e+(1013.25-q)*27};
const {build,fingerprint}=require('./flight-checklist.js');
const plan={
 aircraft:'DA42',aircraftName:'DA42',aircraftVerified:false,source:'SIMBRIEF',
 origin:'SBGL',destination:'SBSP',generated:'OFP-1',originRunway:'10',runway:{identifier:'10'},
 originElevation:0,takeoffWeight:1900,landingWeight:1860,
 weather:{origin:{qnh:1020,oat:25,raw:'SBGL 1200Z 09010KT 9999 25/20 Q1020',taf:'TAF'}}
};
const app={inputs:{takeoff:{
 pa:0,wind:0,windVerified:false,toraVerified:false,length:1700,
 slope:0,slopeVerified:false,surface:'paved',surfaceVerified:false,
 runwayId:'10',mass:1910
},runway:{}}};
const wb={ok:true,takeoff:{cg:2.4,mass:1905},statuses:{massOK:true,cgOK:true}},verified={};
const states=()=>Object.fromEntries(build(plan,app,wb,verified,'profile').map(x=>[x.id,x]));
let s=states();
assert.equal(Object.keys(s).length,9,'expected nine initial review items');
assert.equal(s.tora.status,'required');
assert.equal(s.wind.status,'required');
assert.equal(s.weather.status,'review');
assert.equal(s.variant.status,'verify');
assert.equal(s.tora.manual,false,'missing TORA cannot be confirmed');
assert.equal(s.wind.manual,false,'missing runway wind cannot be confirmed');
assert.equal(s.cg.status,'verify');
assert.equal(s.takeoffWeight.status,'review');
app.inputs.takeoff={
 ...app.inputs.takeoff,wind:8,windVerified:true,toraVerified:true,length:1700,
 slope:0,slopeVerified:true,surfaceVerified:true,mass:1900
};
wb.takeoff.mass=1900;
s=states();
for(const id of ['tora','wind','slope','surface','takeoffWeight'])assert.equal(s[id].status,'checked',id);
for(const item of Object.values(s))if(item.manual)verified[item.id]=item.signature;
s=states();
assert.ok(Object.values(s).every(x=>x.status==='checked'));
const beforeFingerprint=fingerprint(plan);
plan.weather.origin.raw+=' COR';
assert.equal(fingerprint(plan),beforeFingerprint,'weather change should not reset unrelated confirmations');
s=states();
assert.equal(s.weather.status,'review','changed METAR invalidates snapshot');
assert.equal(s.variant.status,'checked','unrelated variant confirmation preserved');
verified.weather=s.weather.signature;
assert.equal(states().weather.status,'checked');
app.inputs.takeoff.wind=9;
assert.equal(states().weather.status,'review','changed wind invalidates weather acknowledgment');
// The optimizer creates hypothetical passengers and baggage, so its
// numerical match must not be interpreted as a verified actual manifest.
const simulated=Object.fromEntries(build(plan,app,wb,verified,'profile',true,'optimized').map(x=>[x.id,x]));
assert.equal(simulated.takeoffWeight.status,'checked','a feasible simulator scenario may be the selected loading');
assert.equal(simulated.cg.status,'checked','feasible scenario resolves the modeled CG');
assert.equal(simulated.cg.manual,false,'optimizer does not need extra pilot checkbox');
const imported=Object.fromEntries(build(plan,app,wb,verified,'profile',false,'simbrief').map(x=>[x.id,x]));
assert.equal(imported.takeoffWeight.status,'checked','valid OFP TOW is authoritative when SIMBRIEF is active');
assert.equal(imported.cg.status,'verify','SimBrief OFP does not provide station distribution or CG');
assert.equal(imported.cg.manual,false);
app.inputs.takeoff.mass=1850;
assert.equal(build(plan,app,wb,verified,'profile',false,'simbrief')
 .find(x=>x.id==='takeoffWeight').status,'review','stale performance mass must not remain checked');
app.inputs.takeoff.mass=1900;
wb.statuses.cgOK=false;
const outside=Object.fromEntries(build(plan,app,wb,verified,'profile').map(x=>[x.id,x]));
assert.equal(outside.takeoffWeight.status,'review','out-of-envelope real load cannot satisfy checklist');
assert.equal(outside.cg.status,'verify','out-of-envelope CG cannot be confirmed');
wb.statuses.cgOK=true;
wb.statuses.massOK=false;
assert.equal(build(plan,app,wb,verified,'profile').find(x=>x.id==='takeoffWeight').status,'review');
wb.statuses.massOK=true;
const altered=fingerprint({...plan,origin:'SBRJ'});
assert.notEqual(altered,fingerprint(plan),'different mission cannot share confirmed items');
assert.ok(build({...plan,mismatch:true},app,wb,verified,'profile').every(x=>x.status!=='checked'),
 'mismatched aircraft must never be checked');
console.log('flight checklist: 9-item states, dependencies, confirmations, invalidation and mismatch OK');
