// AFM §5.3.11 integrated Landing UI: 4 Aero UI cards and segmented chart.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/index.html','utf8');
const script=source.match(/<script>([\s\S]*?)<\/script>/)[1];
let markup='';
const node={set innerHTML(value){markup=value},get innerHTML(){return markup},classList:{toggle(){}},addEventListener(){}};
const document={querySelector(){return node},querySelectorAll(){return []}};
const ctx={document,console,location:{protocol:'file:'},navigator:{},localStorage:{getItem(k){return k==='aero-ui-da42-v1'?JSON.stringify({current:'landing'}):null},setItem(){}}};
ctx.window=ctx;vm.createContext(ctx);
for(const name of ['landing-tables.js','takeoff-tables.js','climb-tables.js','oei-tables.js','time-to-climb.js','cruise-performance.js'])
 vm.runInContext(fs.readFileSync(__dirname+'/'+name,'utf8'),ctx);
vm.runInContext(fs.readFileSync(__dirname+'/goaround-tables.js','utf8'),ctx);vm.runInContext(script,ctx);
const f=v=>ctx.AeroCalc.compute('landing',v);
const example={pa:0,oat:15,mass:1800,wind:10};
const r=f(example);
assert.ok(Math.abs(r.main-557.1428571428571)<1e-8);
assert.ok(Math.abs(r.secondary-329.64285714285717)<1e-8);
assert.ok(markup.includes('TOUCHDOWN')&&markup.includes('TOTAL 557 m'));
assert.ok(markup.includes('id="landing-runway"')&&markup.includes('id="landing-isa-toggle"'));
assert.equal((markup.match(/class="field /g)||[]).length,4);
assert.deepEqual(Object.keys(ctx.AeroCalc.MODELS),['takeoff','climb','oei','cruise','landing','abnormal','goaround','timeclimb','cruiseperf','runway']);
for(const v of [{...example,mass:1700,wind:0,oat:0},{...example,mass:1900,wind:0,oat:0},{...example,mass:1999,wind:0,oat:0}]){
 const result=f(v);assert.ok(result.main>result.secondary&&result.secondary>0);
}
let valid=0,rejected=0;
for(const pa of [0,1000,2000,4000,6000,8000,10000])
 for(const oat of [0,10,20,30,40,50])
 for(const mass of [1700,1800,1900,1950,1999])
 for(const wind of [-5,0,10,20]){
  const v={pa,oat,mass,wind};
  const result=f(v);
  if(result.error){assert.equal(result.error,'CÉLULA NÃO PUBLICADA NO AFM');rejected++;continue}
  assert.ok(result.main>result.secondary&&result.secondary>0);
  valid++;
 }
assert.ok(valid>300&&rejected>0);
for(const v of [{pa:-1},{pa:10001},{mass:1699},{mass:2000},{oat:-1},{oat:51},{wind:-11},{wind:21},{slope:-1},{wind:NaN}]){
 assert.ok(f({...example,...v}).error,'Invalid input accepted: '+JSON.stringify(v));
}
console.log('PASS Landing AFM §5.3.11 integrated, '+valid+' valid and '+rejected+' unpublished cells, four Aero UI cards, 2-color chart.');
