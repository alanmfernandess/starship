// DA42 NG Weight & Balance numerical regression and limit checks.
// Only the AFM's illustrated loading case is a calibration/reference case.
// Use aircraft-specific Mass & Balance Report for real operations.
const assert=require('node:assert/strict');
const e=require('./wb-engine.js');
const x=e.calculate(e.EXAMPLE);
assert.ok(x.ok);
assert.equal(x.zeroFuel.mass,1655.5);
assert.ok(Math.abs(x.zeroFuel.moment-3958.7)<.051);
assert.equal(x.takeoff.mass,1898.5);
assert.ok(Math.abs(x.takeoff.moment-4645.7)<.051);
assert.equal(Number(x.zeroFuel.cg.toFixed(3)),2.391);
assert.equal(Number(x.takeoff.cg.toFixed(3)),2.447);
assert.equal(x.fuel.main,159);
assert.equal(x.fuel.aux,84);
assert.equal(x.fuel.usableTotal,243);
assert.equal(x.statuses.cgOK,true);
assert.equal(x.statuses.massOK,true);
assert.equal(x.statuses.landingMassStatus,'PENDING');
assert.equal(x.scenarios.length,4);
assert.equal(x.scenarios[0].mass,1628);
assert.equal(x.scenarios[1].mass,1871);
assert.equal(x.scenarios[2].mass,1655.5);
assert.equal(x.scenarios[3].mass,1898.5);
assert.deepEqual(Object.values(e.ARMS),[2.3,2.3,3.25,3.25,.6,3.89,4.54,2.63,3.2,1.0]);
assert.equal(e.cgBounds(1510).forward,2.357);
assert.equal(e.cgBounds(1510).aft,2.460);
assert.equal(e.cgBounds(1700).aft,2.480);
assert.equal(e.cgBounds(1900).forward,2.418);
assert.equal(e.cgBounds(1900).aft,2.480);
assert.equal(e.cgBounds(1509),null);
assert.equal(e.cgBounds(1901),null);
const load=(add)=>e.calculate({...e.EXAMPLE,...add});
assert.ok(load({nose:31}).errors.some(v=>v.includes('NOSE')));
assert.ok(load({cabin:46}).errors.some(v=>v.includes('CABIN')));
assert.ok(load({extension:19}).errors.some(v=>v.includes('EXTENSION')));
assert.ok(load({cabin:35,extension:18}).errors.some(v=>v.includes('CABIN + EXTENSION')));
assert.ok(load({mainL:80}).errors.some(v=>v.includes('MAINL')));
assert.ok(load({auxR:43}).errors.some(v=>v.includes('AUXR')));
assert.ok(load({pilot:-5}).errors.some(v=>v.includes('PILOT')));
assert.ok(load({copilot:NaN}).errors.some(v=>v.includes('COPILOT')));
assert.ok(load({emptyMass:0}).errors.some(v=>v.includes('EMPTY MASS')));
const overweight=load({pilot:110});
assert.ok(overweight.ok&&!overweight.statuses.takeoffMassOK);
const zeroFuelOver=load({pax1:110,pax2:110});
assert.ok(zeroFuelOver.ok&&!zeroFuelOver.statuses.zeroFuelMassOK);
const light=load({pilot:0,copilot:0,deice:0,cabin:0,extension:0,mainL:0,mainR:0,auxL:0,auxR:0});
assert.ok(light.ok&&!light.statuses.takeoffMassOK);
const lands=load({landingMainL:79.5,landingMainR:79.5,landingAuxL:42,landingAuxR:42});
assert.equal(lands.statuses.landingMassStatus,'ABNORMAL LANDING');
const normal=load({landingMainL:0,landingMainR:0,landingAuxL:0,landingAuxR:0});
assert.equal(normal.statuses.landingMassStatus,'NORMAL');
assert.equal(normal.landing.mass,normal.zeroFuel.mass);
assert.equal(normal.landing.cg,normal.zeroFuel.cg);
assert.ok(!load({landingMainL:30}).ok);
assert.ok(!load({landingMainL:90,landingMainR:0,landingAuxL:0,landingAuxR:0}).ok);
let count=0;
for(let pilot=0;pilot<=120;pilot+=20)
 for(let copilot=0;copilot<=120;copilot+=20)
 for(let pax1=0;pax1<=100;pax1+=25)
 for(let fuel=0;fuel<=79.5;fuel+=26.5){
   const r=load({pilot,copilot,pax1,mainL:fuel,mainR:fuel});
   assert.ok(r.ok&&Number.isFinite(r.takeoff.cg));
   assert.equal(r.takeoff.mass,1450+pilot+copilot+pax1+10+8+27.5+fuel*2+84);
   assert.ok(r.zeroFuel.mass<=r.takeoff.mass);
   assert.ok(r.zeroFuel.moment<=r.takeoff.moment);
   count++;
 }
console.log('PASS: official AFM W&B example, CG envelope breakpoints, 4 fuel/deice cases, baggage/MTOW/MZFM/MLW boundaries, '+count+' loading combinations. NOT approved for flight.');
