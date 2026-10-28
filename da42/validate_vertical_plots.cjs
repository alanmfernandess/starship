// Climb/OEI result charts must indicate ALTITUDE CHANGE, not OAT sensitivity.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Application script missing');
const node={innerHTML:'',textContent:'',classList:{toggle(){}},addEventListener(){}};
const document={querySelector(){return node},querySelectorAll(){return []}};
const sandbox={document,localStorage:{getItem(){return null},setItem(){}},navigator:{},location:{protocol:'file:'},console};
sandbox.window=sandbox;
vm.createContext(sandbox);
for(const name of ['takeoff','climb','oei'])vm.runInContext(fs.readFileSync(__dirname+'/'+name+'-tables.js','utf8'),sandbox);
vm.runInContext(script,sandbox);
const numberAttr=(svg,name)=>{const m=svg.match(new RegExp('data-'+name+'="([^"]+)"'));return m?Number(m[1]):null;};
const directionAttr=svg=>svg.match(/data-direction="([^"]+)"/)?.[1]||null;
function check(id,v){
 sandbox.testId=id;sandbox.testValues=v;
 const r=sandbox.AeroCalc.compute(id,v);
 const svg=vm.runInContext('createPlot(testId,testValues,AeroCalc.compute(testId,testValues))',sandbox);
 assert.ok(svg.includes('<svg'),'SVG missing');
 if(r.error){
  assert.ok(!svg.includes('data-direction='));
  return false;
 }
 assert.ok(svg.includes('class="plot vertical-rate-plot"'),id+' needs rate-of-climb vertical profile');
 assert.ok(svg.includes('1 MIN'),id+' needs time scale');
 assert.ok(!svg.includes('−20°C'),id+' must not show OAT sensitivity on result card');
 const baseline=numberAttr(svg,'baseline-y'),end=numberAttr(svg,'end-y'),roc=numberAttr(svg,'roc');
 assert.equal(roc,r.main);
 assert.ok(Number.isFinite(baseline)&&Number.isFinite(end));
 const expectedY=baseline-roc*(id==='oei'?44/320:88/1400);
 assert.ok(Math.abs(end-expectedY)<.011,id+': exact signed slope '+roc);
 if(roc>0){assert.equal(directionAttr(svg),'subida');assert.ok(end<baseline,'positive climb must rise left to right');}
 else if(roc<0){assert.equal(directionAttr(svg),'descida');assert.ok(end>baseline,'negative ROC must descend left to right');}
 else{assert.equal(directionAttr(svg),'altitude constante');assert.equal(end,baseline,'zero ROC should be level');}
 return true;
}
check('climb',{pa:0,oat:15,mass:1800,power:92,flaps:'up'});
check('oei',{pa:0,oat:15,mass:1800,power:92});
check('oei',{pa:18000,isa:true,mass:1999,power:92});
check('oei',{pa:4000,oat:50,mass:1999,power:92});
let valid=0,unavailable=0;
for(const id of ['climb','oei'])
 for(const mass of [1700,1750,1800,1900,1950,1999])
 for(const pa of [0,2000,4000,6000,8000,10000,12000,14000,16000,18000])
 for(const oat of [-20,-10,0,10,20,30,40,50]){
  const v={mass,pa,oat,power:92,...(id==='climb'?{flaps:'up'}:{})};
  if(check(id,v))valid++;else unavailable++;
 }
assert.ok(valid>500&&unavailable>0);
console.log('PASS signed climb profiles: '+valid+' valid chart cases, '+unavailable+' unpublished cells, positive/zero/negative directions, fixed 1-minute scale. Not for flight.');
