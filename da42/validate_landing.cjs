// Engineering/visual regression checks only; not operational AFM validation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const node={innerHTML:'',classList:{toggle(){}},addEventListener(){}};
const document={querySelector(){return node},querySelectorAll(){return []}};
const context={document,localStorage:{getItem(k){return k==='aero-ui-da42-v1'?JSON.stringify({current:'landing'}):null},setItem(){}},location:{protocol:'file:'},navigator:{},console};
context.window=context;vm.createContext(context);vm.runInContext(script,context);
const f=v=>context.AeroCalc.compute('landing',v);
const example={pa:0,oat:15,mass:1800,wind:10};
const r=f(example);
assert.equal(r.secondary,248);assert.equal(r.main,480);
assert.ok(node.innerHTML.includes('TOUCHDOWN'));
assert.ok(node.innerHTML.includes('TOTAL 480 m'));
assert.ok(node.innerHTML.includes('232 m'));
assert.equal((node.innerHTML.match(/data-key="/g)||[]).length,4);
assert.ok(!node.innerHTML.includes('temp-mode-toggle'));
assert.deepEqual(Object.keys(context.AeroCalc.MODELS),['takeoff','climb','oei','cruise','landing','abnormal','goaround']);
const compare=(v1,v2,dir=1)=>{const a=f(v1),b=f(v2);assert.ok(!a.error&&!b.error);assert.ok(dir*(b.main-a.main)>0);};
compare({...example,wind:20},{...example,wind:0});   // weaker headwind => longer landing
compare({...example,mass:1700},{...example,mass:1900});
compare({...example,oat:5},{...example,oat:25});
compare({...example,pa:0},{...example,pa:2000});
let samples=0;
for(const pa of [0,1000,2000,3000,4000,5000,6000,7000,8000,9000,10000])
 for(const oat of [-30,-10,0,15,25])
 for(const mass of [1500,1600,1700,1800,1900])
 for(const wind of [-10,-5,0,10,20]){
 const v={pa,oat,mass,wind};
 if(context.AeroCalc.limits('landing',v))continue;
 const x=f(v);
 assert.ok(!x.error&&Number.isFinite(x.main)&&Number.isFinite(x.secondary));
 assert.ok(x.main>x.secondary&&x.secondary>0,'Total must exceed ground roll');
 const heavier=f({...v,mass:Math.min(1900,mass+1)});
 assert.ok(!heavier.error&&heavier.main>=x.main);
 samples++;
}
for(const v of [
 {...example,pa:-1},{...example,pa:10001},{...example,mass:1499},
 {...example,mass:1901},{...example,oat:-36},{...example,oat:51},
 {...example,wind:-11},{...example,wind:21},
 {...example,oat:NaN},{...example,wind:NaN}
]) assert.ok(f(v).error,'Out-of-range input must be rejected');
console.log('Landing: 248/480 m reference, '+samples+' in-domain cases, 10 invalid cases, 4 trends, segment chart OK. Prototype only.');
