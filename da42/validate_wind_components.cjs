// AFM DA42 NG §5.3.5 Wind Components — trigonometric decomposition.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const E=require('./wind-components.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,String(a)+' ≠ '+String(b));
const example=E.compute({heading:360,windDir:32,windSpeed:30});
assert.equal(Math.round(example.main),16);
assert.equal(Math.round(example.secondary),25);
assert.equal(example.side,'RIGHT');
assert.equal(example.along,'HEADWIND');
near(example.main,30*Math.sin(32*Math.PI/180));
near(example.headwind,30*Math.cos(32*Math.PI/180));
assert.equal(E.MAX_DEMONSTRATED,25);
assert.equal(E.CHART_MAX_WIND,40);
for(const v of [
 {heading:0,windDir:0,windSpeed:30,c:0,h:30,side:'NONE',along:'HEADWIND'},
 {heading:360,windDir:360,windSpeed:30,c:0,h:30,side:'NONE',along:'HEADWIND'},
 {heading:180,windDir:0,windSpeed:30,c:0,h:-30,side:'NONE',along:'TAILWIND'},
 {heading:0,windDir:90,windSpeed:30,c:30,h:0,side:'RIGHT',along:'NO HEADWIND'},
 {heading:0,windDir:270,windSpeed:30,c:-30,h:0,side:'LEFT',along:'NO HEADWIND'},
 {heading:270,windDir:180,windSpeed:30,c:-30,h:0,side:'LEFT',along:'NO HEADWIND'},
 {heading:180,windDir:270,windSpeed:30,c:30,h:0,side:'RIGHT',along:'NO HEADWIND'},
 {heading:90,windDir:270,windSpeed:25,c:0,h:-25,side:'NONE',along:'TAILWIND'}
]){
 const r=E.compute(v);near(r.crosswind,v.c);near(r.headwind,v.h);assert.equal(r.side,v.side);assert.equal(r.along,v.along);
}
assert.equal(E.compute({heading:360,windDir:90,windSpeed:25}).aboveDemonstrated,false);
assert.equal(E.compute({heading:360,windDir:90,windSpeed:26}).aboveDemonstrated,true);
assert.equal(E.compute({heading:360,windDir:32,windSpeed:40}).aboveDemonstrated,false);
for(const bad of [
 {heading:-1},{heading:361},{windDir:-1},{windDir:361},{windSpeed:-1},{windSpeed:41},
 {heading:NaN},{windDir:NaN},{windSpeed:NaN},{heading:Infinity},{windSpeed:Infinity}
])assert.ok(E.compute({heading:360,windDir:32,windSpeed:30,...bad}).error);
let checks=0;
for(const heading of [0,45,90,120,180,225,270,315,360])
 for(const windDir of [0,30,60,90,120,150,180,210,240,270,300,330,360])
 for(const speed of [0,1,12,25,30,40]){
  const r=E.compute({heading,windDir,windSpeed:speed});assert.ok(!r.error);
  near(Math.hypot(r.headwind,r.crosswind),speed);
  assert.ok(r.main>=0&&r.secondary>=0);
  assert.ok(r.main<=speed+1e-9);
  assert.equal(r.aboveDemonstrated,r.main>25+1e-9);
  assert.equal(r.headwind<0,r.along==='TAILWIND');
  checks++;
 }
const html=fs.readFileSync(__dirname+'/index.html','utf8');
assert.ok(html.includes('<script src="./wind-components.js"></script>'));
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js);
const elem={innerHTML:'',textContent:'',classList:{toggle(){}},addEventListener(){}};
const document={querySelector(){return elem},querySelectorAll(){return []}};
const ctx={document,console,navigator:{},location:{protocol:'file:'},localStorage:{getItem(k){return k==='aero-ui-da42-v1'?JSON.stringify({current:'windcomp'}):null},setItem(){}}};ctx.window=ctx;
vm.createContext(ctx);
for(const f of ['takeoff-tables','climb-tables','oei-tables','time-to-climb','cruise-performance','landing-tables','goaround-tables','wind-components'])
 vm.runInContext(fs.readFileSync(__dirname+'/'+f+'.js','utf8'),ctx);
vm.runInContext(js,ctx);
assert.equal(Object.keys(ctx.AeroCalc.MODELS).length,10);
assert.equal((elem.innerHTML.match(/class="field /g)||[]).length,4);
assert.ok(elem.innerHTML.includes('id="main-result">16'));
assert.ok(elem.innerHTML.includes('id="secondary-result">25 kt'));
assert.ok(elem.innerHTML.includes('id="wind-side">FROM RIGHT'));
assert.ok(elem.innerHTML.includes('class="wind-angle-arc"'));
assert.ok(elem.innerHTML.includes('class="wind-vector"'));
assert.ok(elem.innerHTML.includes('data-wind-side="RIGHT"'));
assert.equal(ctx.AeroCalc.WIND_COMPONENTS_ENGINE.MAX_DEMONSTRATED,25);
console.log('PASS Wind Components §5.3.5: AFM 360/032/30 → 16 kt right, 25 kt headwind; '+checks+' trig invariants; 10 modules and Aero UI 4 cards.');
