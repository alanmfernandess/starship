const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const S=require('./simbrief-core.js');
globalThis.RunwayAnalysis=require('./runway-analysis.js');
const example={
 fetch:{status:'Success'},params:{units:'kgs',time_generated:'2026-10-29T15:00:00Z'},
 aircraft:{icao_code:'DA42',name:'Diamond DA42 NG'},general:{route_distance:'420',initial_altitude:'10000',route:'SBGR DCT SBFL'},
 origin:{icao_code:'SBGR',elevation:'2459',plan_rwy:'10R'},
 destination:{icao_code:'SBFL',elevation:'16'},
 alternates:{alternate:[{icao_code:'SBNF',distance:'38',burn:'14'}]},
 fuel:{plan_takeoff:'201',plan_ramp:'205',enroute_burn:'120',alternate_burn:'14',reserve:'35',plan_landing:'81'},
 weights:{est_tow:'1850',est_ldw:'1730',est_zfw:'1649'},
 weather:{orig_metar:'SBGR 291500Z 11012KT 9999 SCT020 28/20 Q1025',
  orig_taf:'TAF SBGR 291100Z 2912/3012 11012KT CAVOK',
  dest_metar:'SBFL 291500Z 24009KT 9999 25/19 Q1018',altn_metar:['SBNF 291500Z 20008KT 9999 24/18 Q1018']},
 times:{est_time_enroute:'03:05:00'}
};
let p=S.normalize(example);
assert.equal(p.origin,'SBGR');assert.equal(p.destination,'SBFL');assert.equal(p.alternate,'SBNF');
assert.equal(p.aircraftVerified,true);assert.equal(p.mismatch,false);assert.equal(p.distance,420);
assert.equal(p.alternateDistance,38);assert.equal(p.flightTime,'03:05');assert.equal(p.cruiseAltitude,10000);
assert.equal(p.takeoffWeight,1850);assert.equal(p.tripFuel,120);assert.equal(p.reserveFuel,35);
assert.equal(p.weather.origin.oat,28);assert.equal(p.weather.origin.qnh,1025);
assert.equal(p.weather.origin.windDir,110);assert.equal(p.weather.origin.windSpeed,12);
assert.ok(p.weather.origin.taf.startsWith('TAF SBGR'));
assert.equal(S.metar('SBGR 290600Z 00000KT 9999 M03/M04 Q0990').oat,-3);
const proposed=S.proposedInputs(p,{});
assert.equal(proposed.inputs.takeoff.mass,1850);
assert.equal(proposed.inputs.runway.paMode,'qnh');
assert.equal(proposed.inputs.runway.qnh,1025);
assert.equal(proposed.inputs.takeoff.oat,28);
assert.equal(proposed.inputs.landing.mass,1730);
assert.equal(proposed.inputs.cruiseperf.pa,10000);
assert.equal(proposed.inputs.takeoff.wind,null); // unknown wind clears stale headwind
assert.equal(p.runway.identifier,'10R');
assert.equal(p.runway.tora,null);
assert.equal(proposed.inputs.runway.length,0);
assert.equal(proposed.inputs.runway.toraVerified,false);
assert.equal(proposed.inputs.runway.windVerified,false);
assert.equal(proposed.inputs.runway.surfaceVerified,false);
assert.equal(proposed.inputs.runway.slopeVerified,false);
assert.equal(globalThis.RunwayAnalysis.validate({length:900,toraVerified:false}),'TORA REQUIRED');
assert.equal(globalThis.RunwayAnalysis.validate({length:900,toraVerified:true,windVerified:false}),'WIND COMPONENT REQUIRED');
assert.equal(globalThis.RunwayAnalysis.validate({length:900,toraVerified:true,windVerified:true,surfaceVerified:false}),'RUNWAY SURFACE REQUIRED');
// Optional OFP TLR supplies runway-specific TORA (FEET), true/magnetic
// course and headwind. Never substitute raw runway length for TORA.
const tlr=structuredClone(example);
tlr.tlr={takeoff:{conditions:{airport_icao:'SBGR',planned_runway:'10R',wind_direction:'110',wind_speed:'12',surface_condition:'dry'},
 runway:[{identifier:'10L',length_tora:'6000',true_course:'100',gradient:'0.8',headwind_component:'11'},
 {identifier:'10R',length:'12000',length_tora:'3000',true_course:'100',magnetic_course:'99',gradient:'1.5',headwind_component:'9.8'}]}};
const t=S.normalize(tlr);
assert.equal(t.runway.tlrMatched,true);
assert.equal(t.runway.tora,914.4);
assert.equal(t.runway.headwind,9); // round DOWN: conservative for AFM
assert.equal(t.runway.windSource,'OFP TLR');
assert.equal(t.runway.slope,1.5);
const ready=S.proposedInputs(t,{runway:{length:1234,wind:20,surface:'grass25'}});
assert.equal(ready.inputs.runway.runwayId,'10R');
assert.equal(ready.inputs.runway.length,914.4);
assert.equal(ready.inputs.runway.toraVerified,true);
assert.equal(ready.inputs.runway.wind,9);
assert.equal(ready.inputs.runway.windVerified,true);
assert.equal(ready.inputs.takeoff.wind,9);
assert.equal(ready.inputs.runway.slope,1.5);
assert.equal(ready.inputs.runway.slopeVerified,true);
assert.equal(ready.inputs.runway.surfaceVerified,false);
assert.equal(ready.inputs.runway.surface,'paved');
assert.equal(ready.inputs.runway.wet,false);
const lacking=structuredClone(tlr);
delete lacking.tlr.takeoff.runway[1].length_tora;
assert.equal(S.normalize(lacking).runway.tora,null);
assert.equal(S.normalize(lacking).runway.length,3657.6);
assert.equal(S.proposedInputs(S.normalize(lacking),{}).inputs.runway.toraVerified,false);
assert.equal(S.proposedInputs(S.normalize(lacking),{}).inputs.runway.lengthEstimated,true);
assert.equal(S.proposedInputs(S.normalize(lacking),{}).inputs.runway.length,3657.6);
assert.equal(globalThis.RunwayAnalysis.validate(S.proposedInputs(S.normalize(lacking),{}).inputs.runway),'TORA REQUIRED');
const metric=structuredClone(tlr);
metric.tlr.takeoff.conditions.length_units='METERS';
metric.tlr.takeoff.runway[1].length_tora='900';
assert.equal(S.normalize(metric).runway.tora,900);
assert.equal(S.normalize(metric).runway.lengthUnits,'METERS');
assert.equal(S.proposedInputs(S.normalize(metric),{}).inputs.runway.length,900);
const mismatchRunway=structuredClone(tlr);
mismatchRunway.origin.plan_rwy='11L';
assert.equal(S.normalize(mismatchRunway).runway.tlrMatched,false);
assert.equal(S.normalize(mismatchRunway).runway.tora,null);
assert.equal(S.normalize(mismatchRunway).runway.headwind,null);
const windCourse=structuredClone(tlr);
delete windCourse.tlr.takeoff.runway[1].headwind_component;
windCourse.tlr.takeoff.runway[1].true_course='110';
assert.equal(S.normalize(windCourse).runway.headwind,12);
assert.equal(S.normalize(windCourse).runway.windSource,'OFP METAR + TRUE COURSE');
delete windCourse.tlr.takeoff.runway[1].true_course;
assert.equal(S.normalize(windCourse).runway.headwind,null);
const excessive=structuredClone(tlr);
excessive.tlr.takeoff.runway[1].headwind_component='35';
assert.equal(S.proposedInputs(S.normalize(excessive),{}).inputs.runway.windVerified,false);
const downhill=structuredClone(tlr);
downhill.tlr.takeoff.runway[1].gradient='-0.4';
assert.equal(S.proposedInputs(S.normalize(downhill),{}).inputs.runway.slopeVerified,false);

const lbs=structuredClone(example);lbs.params.units='lbs';lbs.weights.est_tow='4078.55';lbs.fuel.enroute_burn='264.55';
p=S.normalize(lbs);
assert.ok(Math.abs(p.takeoffWeight-1850)<1);
assert.ok(Math.abs(p.tripFuel-120)<1);
const mismatch=structuredClone(example);mismatch.aircraft.icao_code='B738';
assert.equal(S.normalize(mismatch).mismatch,true);
for(const bad of [null,{}, {fetch:{status:'Failed'}}, {...example,params:{units:'liters'}}, {...example,origin:{icao_code:'X'}}]){
 assert.throws(()=>S.normalize(bad));
}
const noWx=structuredClone(example);noWx.weather={};
const clean=S.normalize(noWx);
assert.equal(S.proposedInputs(clean,{}).inputs.takeoff.pa,undefined);
const blankWeight=structuredClone(example);blankWeight.weights={};
const noWeight=S.normalize(blankWeight);
assert.equal(S.proposedInputs(noWeight,{}).inputs.takeoff?.mass,undefined);
const cmps=S.compare(S.normalize(example),null,{ok:true,takeoff:{mass:1845},zeroFuel:{mass:1649}});
assert.equal(cmps.length,2);assert.equal(cmps[0].delta,-5);
// Validate frontend sources for syntax without browser execution.
for(const name of ['flight-app.js','simbrief-core.js'])new vm.Script(fs.readFileSync(__dirname+'/'+name,'utf8'),{filename:name});
const html=fs.readFileSync(__dirname+'/flight.html','utf8');
for(const script of ['simbrief-core.js','flight-app.js','takeoff-tables.js','wb-engine.js'])assert.ok(html.includes('./'+script));
const index=fs.readFileSync(__dirname+'/index.html','utf8');
assert.ok(index.includes('./flight.html'));
assert.ok(fs.readFileSync(__dirname+'/flight-app.js','utf8').includes('calculator=1'));
console.log('PASS SimBrief core, KGS/LBS, weather, alternate, compatibility, conservative mapping and app syntax');
