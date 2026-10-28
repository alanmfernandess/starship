// Randomized Weight & Balance feasible-loading scenarios.
// Generated occupant masses are SIMULATED and must never be used as actual manifests.
const assert=require('node:assert/strict');
const engine=require('./wb-engine.js');
const {optimize,ADJUSTABLE,KEEP}=require('./wb-optimizer.js');
const seedRng=seed=>{let x=seed>>>0;return ()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296}};
assert.deepEqual(ADJUSTABLE,['pilot','copilot','pax1','pax2','nose','cabin','extension']);
assert.deepEqual(KEEP,['mainL','mainR','auxL','auxR','deice','emptyMass','emptyMoment']);
const originals=[
 {...engine.EXAMPLE},
 {...engine.EXAMPLE,pilot:110,copilot:105,pax1:95,pax2:90,nose:29,cabin:42,extension:12},
 {...engine.EXAMPLE,mainL:0,mainR:0,auxL:0,auxR:0},
 {...engine.EXAMPLE,mainL:26,mainR:31,auxL:10,auxR:8},
 {...engine.EXAMPLE,mainL:79.5,mainR:79.5,auxL:42,auxR:42,deice:27.5}
];
const distinct=new Set();
let tested=0;
for(const [i,p] of originals.entries()){
 for(let k=0;k<8;k++){
  const before=JSON.stringify(p);
  const output=optimize(p,engine,{rng:seedRng(i*503+k*101+1),attempts:5000});
  assert.ok(output.ok,JSON.stringify({i,k,reason:output.reason}));
  assert.equal(JSON.stringify(p),before,'Do not mutate the input');
  assert.ok(output.simulated);
  assert.equal(output.suggested.pilot>0,true);
  assert.ok([0,...Array.from({length:151},(_,i)=>i)].includes(output.suggested.copilot));
  for(const key of KEEP)assert.equal({...p,...output.suggested}[key],p[key],key+' must be unchanged');
  const applied={...p,...output.suggested};
  const r=engine.calculate(applied);
  assert.ok(r.ok&&r.statuses.cgOK&&r.statuses.massOK&&r.statuses.scenariosOK);
  assert.ok(r.takeoff.mass<=1900&&r.zeroFuel.mass<=1765&&r.takeoff.mass>=1510);
  assert.ok(applied.nose<=30&&applied.cabin<=45&&applied.extension<=18);
  assert.ok(applied.cabin+applied.extension<=45);
  assert.ok(!Object.keys(output.suggested).some(key=>!ADJUSTABLE.includes(key)));
  assert.ok(!JSON.stringify(output).includes('landingMainL'));
  distinct.add(ADJUSTABLE.map(key=>applied[key]).join(','));
  tested++;
 }
}
assert.ok(distinct.size>=12,'Stochastic search should offer varied candidate configurations');
for(const bad of [{...engine.EXAMPLE,mainL:100},{...engine.EXAMPLE,auxR:100},
 {...engine.EXAMPLE,mainR:NaN},{...engine.EXAMPLE,deice:-1},
 {...engine.EXAMPLE,emptyMass:1900},{...engine.EXAMPLE,emptyMoment:3000}]){
 const result=optimize(bad,engine,{rng:seedRng(3),attempts:1000});
 assert.equal(result.ok,false,'Invalid fixed input or impossible CG must never yield an acceptable loading');
}
console.log('PASS optimizer: '+tested+' simulations, '+distinct.size+' distinct feasible loadings; fixed fuel/de-ice/empty configuration preserved, unsolvable cases rejected.');
