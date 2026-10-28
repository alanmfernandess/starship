// Experimental-engineering regression only. Abnormal landing readings are
// anchored to the printed example and are NOT independent AFM validation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function boot(module){
 const el={html:'',set innerHTML(v){this.html=v},get innerHTML(){return this.html},classList:{toggle(){}},addEventListener(){}};
 const document={querySelector(){return el},querySelectorAll(){return []}};
 const ctx={document,location:{protocol:'file:'},navigator:{},console,
   localStorage:{getItem(k){return k==='aero-ui-da42-v1'?JSON.stringify({current:module}):null},setItem(){}}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/takeoff-tables.js','utf8'),ctx);vm.runInContext(fs.readFileSync(__dirname+'/climb-tables.js','utf8'),ctx);vm.runInContext(fs.readFileSync(__dirname+'/oei-tables.js','utf8'),ctx);vm.runInContext(script,ctx);
 return {api:ctx.AeroCalc,html:el.html};
}
const ab=boot('abnormal'),go=boot('goaround');
const f=ab.api.compute;
const ref={pa:0,oat:15,mass:1800,wind:10};
assert.equal(f('abnormal',ref).main,722);
assert.equal(f('abnormal',ref).secondary,418);
assert.equal((ab.html.match(/class="field /g)||[]).length,4);
assert.ok(ab.html.includes('304 m')&&ab.html.includes('418 m')&&ab.html.includes('TOTAL 722 m'));
assert.ok(!ab.html.includes('temp-mode-toggle'));
let count=0,scaleRejections=0;
for(const pa of [0,1000,2000,3000,4000,5000,6000,7000,8000,9000,10000])
 for(const oat of [-30,-10,0,15,25])
 for(const mass of [1500,1600,1700,1800,1900])
 for(const wind of [-10,-5,0,10,20]){
  const v={pa,oat,mass,wind};
  if(ab.api.limits('abnormal',v))continue;
  const r=f('abnormal',v);
  if(r.error){
   assert.equal(r.error,'DISTÂNCIA FORA DA ESCALA DA CARTA');
   scaleRejections++;
   continue;
  }
  assert.ok(Number.isFinite(r.main)&&Number.isFinite(r.secondary));
  assert.ok(r.main>r.secondary&&r.secondary>0);
  const heavier=f('abnormal',{...v,mass:Math.min(1900,mass+1)});
  if(!heavier.error)assert.ok(heavier.main>=r.main);
  count++;
 }
assert.equal(count,1369);
assert.equal(scaleRejections,6);
for(const v of [{...ref,pa:-1},{...ref,pa:10001},{...ref,mass:1499},{...ref,mass:1901},
 {...ref,oat:-36},{...ref,oat:51},{...ref,wind:-11},{...ref,wind:21},{...ref,wind:NaN}]){
 assert.ok(f('abnormal',v).error,'Abnormal must reject invalid '+JSON.stringify(v));
}
const a=go.api.compute('goaround',{mass:1805,pa:0,isa:0,speed:84}),
      b=go.api.compute('goaround',{mass:1900,pa:0,isa:0,speed:84});
assert.deepEqual([a.main,a.secondary,a.angle],[7.5,612,4.3]);
assert.deepEqual([b.main,b.secondary,b.angle],[6.7,547,3.8]);
assert.equal((go.html.match(/class="field /g)||[]).length,4);
assert.ok(go.html.includes('id="mass-toggle"'));
assert.ok(go.html.includes('CLIMB ANGLE')&&go.html.includes('7.5'));
for(const v of [{mass:1850,pa:0,isa:0,speed:84},{mass:1805,pa:500,isa:0,speed:84},
 {mass:1805,pa:0,isa:10,speed:84},{mass:1900,pa:0,isa:0,speed:85},
 {mass:NaN,pa:0,isa:0,speed:84}]){
 assert.ok(go.api.compute('goaround',v).error,'Go-Around must reject non-published configuration');
}
const legacy=[
 f('takeoff',{pa:0,oat:15,mass:1800,wind:10}).main,
 f('climb',{pa:0,oat:15,mass:1800,power:92}).main,
 f('oei',{pa:0,oat:15,mass:1800,power:92}).main,
 Math.round(f('cruise',{pa:10000,oat:-5,load:80,engines:2}).main),
 f('landing',{pa:0,oat:15,mass:1800,wind:10}).main
];
assert.ok(Math.abs(legacy[0]-638.3928571428571)<1e-9);assert.deepEqual(legacy.slice(1),[1147.5,211.25,164,480]);
console.log('PASS abnormal Landing 418/722 m, '+count+' grid cases, '+scaleRejections+' scale rejections; Go-Around both published masses 7.5/6.7%; UI structure; legacy 5 modules. Not flight validated.');
