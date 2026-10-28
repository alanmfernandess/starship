// Regression of Abnormal Landing AFM §5.3.11 and Go-Around §5.3.11.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/index.html','utf8');
const script=source.match(/<script>([\s\S]*?)<\/script>/)[1];
function boot(moduleName){
 let html='';
 const node={set innerHTML(v){html=v},get innerHTML(){return html},classList:{toggle(){}},addEventListener(){}};
 const document={querySelector(){return node},querySelectorAll(){return []}};
 const ctx={document,location:{protocol:'file:'},navigator:{},console,
  localStorage:{getItem(k){return k==='aero-ui-da42-v1'?JSON.stringify({current:moduleName}):null},setItem(){}}};
 ctx.window=ctx;vm.createContext(ctx);
 for(const name of ['landing-tables.js','takeoff-tables.js','climb-tables.js','oei-tables.js','time-to-climb.js','cruise-performance.js'])
 vm.runInContext(fs.readFileSync(__dirname+'/'+name,'utf8'),ctx);
 vm.runInContext(script,ctx);
 return {api:ctx.AeroCalc,html};
}
const ab=boot('abnormal'),go=boot('goaround'),f=(kind,v)=>ab.api.compute(kind,v);
const example={pa:0,oat:15,mass:1800,wind:10};
const a=f('abnormal',example);
assert.ok(Math.abs(a.main-761.4285714285714)<1e-9);
assert.ok(Math.abs(a.secondary-452.67857142857144)<1e-9);
assert.ok(ab.html.includes('TOTAL 761 m')&&ab.html.includes('TOUCHDOWN'));
assert.ok(ab.html.includes('id="landing-runway"')&&ab.html.includes('id="abnormal-isa-toggle"'));
assert.equal((ab.html.match(/class="field /g)||[]).length,4);
let valid=0,rejected=0;
for(const pa of [0,2000,4000,6000,8000,10000])
 for(const oat of [0,10,20,30,40,50])
 for(const mass of [1700,1800,1900,1999])
 for(const wind of [-3,0,10]){
  const r=f('abnormal',{pa,oat,mass,wind});
  if(r.error){assert.equal(r.error,'CÉLULA NÃO PUBLICADA NO AFM');rejected++;continue}
  assert.ok(r.main>r.secondary&&r.secondary>0);valid++;
 }
assert.ok(valid>200&&rejected>0);
for(const bad of [{pa:-1},{pa:10001},{oat:-1},{oat:51},{mass:1699},{mass:2000},{wind:-11},{wind:21}]){
 assert.ok(f('abnormal',{...example,...bad}).error);
}
const ga=go.api.compute('goaround',{mass:1805,pa:0,isa:0,speed:84}),
      gb=go.api.compute('goaround',{mass:1900,pa:0,isa:0,speed:84});
assert.deepEqual([ga.main,ga.secondary,ga.angle],[7.5,612,4.3]);
assert.deepEqual([gb.main,gb.secondary,gb.angle],[6.7,547,3.8]);
assert.equal((go.html.match(/class="field /g)||[]).length,4);
assert.ok(go.html.includes('id="mass-toggle"')&&go.html.includes('CLIMB ANGLE'));
for(const v of [{mass:1850,pa:0,isa:0,speed:84},{mass:1805,pa:500,isa:0,speed:84},
 {mass:1805,pa:0,isa:10,speed:84},{mass:1900,pa:0,isa:0,speed:85}])
 assert.ok(go.api.compute('goaround',v).error);
const takeoff=f('takeoff',{pa:0,oat:15,mass:1800,wind:10});
assert.ok(Math.abs(takeoff.main-638.3928571428571)<1e-8);
assert.equal(Math.round(f('cruise',{pa:10000,oat:-5,load:80,engines:2}).main),164);
console.log('PASS abnormal AFM §5.3.11: '+valid+' valid, '+rejected+' missing data; Go-Around two official masses; legacy modules preserved.');
