// DA42 NG runway-distance-limited takeoff mass, NOT a certified MATOW.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('./takeoff-tables.js'),R=require('./runway-analysis.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.05,String(a)+' != '+String(b));
const base={pa:2000,oat:25,mass:1800,length:900,wind:0,procedure:'normal',
 surface:'paved',wet:false,soft:false,slope:0,maxMass:1900,paMode:'direct'};
const r=R.compute(base);
assert.equal(r.error,undefined);assert.equal(r.status,'DISTANCE SUFFICIENT');
assert.equal(r.maxMass,1855);near(r.required,862.5);near(r.ground,532.5);
near(r.remaining,37.5);assert.deepEqual(r.speed,{vr:80,v50:85,vy:90});
const candidate=T.compute(R.modelInput(base,1855)),next=T.compute(R.modelInput(base,1856));
assert.ok(candidate.main<=900&&next.main>900);
const heavy=R.compute({...base,mass:1900});
assert.equal(heavy.maxMass,1855);assert.equal(heavy.status,'INSUFFICIENT DISTANCE');near(heavy.remaining,-30);
const short=R.compute({...base,procedure:'short'});
assert.ok(short.maxMass>=r.maxMass);assert.equal(short.speed.vr,76);assert.equal(short.speed.v50,82);assert.equal(short.speed.vy,85);
const low=R.compute({...base,length:600});
assert.equal(low.maxMass,null);assert.equal(low.status,'NO SUPPORTED MASS FITS');
const capped=R.compute({...base,length:1500});
assert.equal(capped.maxMass,1900);assert.equal(capped.limitedByConfig,true);
const high=R.compute({...base,length:1500,maxMass:1999});
assert.equal(high.maxMass,1999);assert.equal(high.configurationRequiresSupplement,true);
assert.equal(R.compute({...base,maxMass:1999}).error,undefined);
assert.equal(R.compute({...base,mass:1950}).status,'MASS LIMIT EXCEEDED');
near(R.pressureAltitude(2000,1013.25),2000);
assert.ok(R.pressureAltitude(2000,1003.25)>2000);
const qnh=R.compute({...base,paMode:'qnh',elevation:2000,qnh:1013.25});
assert.equal(qnh.maxMass,1855);near(qnh.pa,2000);
for(const bad of [
 {length:0},{length:-10},{length:5001},{pa:-1},{pa:10001},
 {mass:1699},{mass:2000},{oat:-1},{oat:51},{wind:21},{wind:-11},
 {maxMass:1805},{paMode:'nope'},{paMode:'qnh',qnh:800,elevation:2000},
 {paMode:'qnh',qnh:1013.25,elevation:15000},
 {surface:'paved',wet:true},{surface:'paved',soft:true},{slope:-1},{slope:6}
])assert.ok(R.compute({...base,...bad}).error,JSON.stringify(bad));
let valid=0,prev=null;
for(const length of [700,750,800,850,900,950,1000,1050,1100,1150,1200]){
 const x=R.compute({...base,length});
 assert.equal(x.error,undefined);
 if(x.maxMass===null)continue;
 if(prev!==null)assert.ok(x.maxMass>=prev);prev=x.maxMass;
 assert.ok(T.compute(R.modelInput(base,x.maxMass)).main<=length+1e-8);
 if(x.maxMass<1900){
  const above=T.compute(R.modelInput(base,x.maxMass+1));
  assert.ok(above.error||above.main>length);
 }
 valid++;
}
const html=fs.readFileSync(__dirname+'/index.html','utf8');
assert.ok(html.includes('<script src="./runway-analysis.js"></script>'));
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
let markup='';
const node={set innerHTML(s){markup=s},get innerHTML(){return markup},classList:{toggle(){}},addEventListener(){}};
const document={querySelector(){return node},querySelectorAll(){return []}};
const ctx={document,console,navigator:{},location:{protocol:'file:'},
 localStorage:{getItem(k){return k==='aero-ui-da42-v1'?JSON.stringify({current:'runway'}):null},setItem(){}}};
ctx.window=ctx;vm.createContext(ctx);
for(const name of ['takeoff-tables','climb-tables','oei-tables','time-to-climb',
 'cruise-performance','landing-tables','goaround-tables','runway-analysis'])
 vm.runInContext(fs.readFileSync(__dirname+'/'+name+'.js','utf8'),ctx);
vm.runInContext(js,ctx);
assert.equal(Object.keys(ctx.AeroCalc.MODELS).length,10);
assert.equal((markup.match(/class="field /g)||[]).length,4);
assert.ok(markup.includes('id="main-result">1,855'));
assert.ok(markup.includes('id="secondary-result">37.5 m'));
assert.ok(markup.includes('id="runway-required">863 m'));
assert.ok(markup.includes('id="runway-ground">533 m'));
assert.ok(markup.includes('class="runway-distance-curve"'));
assert.ok(markup.includes('id="analysis-settings"'));
assert.ok(markup.includes('80 KIAS')&&markup.includes('85 KIAS')&&markup.includes('90 KIAS'));
console.log('PASS runway analysis: 1855kg, 1900/1999 configs, QNH and '+valid+' monotonic runway cases.');
