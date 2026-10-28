// In-domain continuity, constraints and invariants for prototype TAS surface.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const dom={innerHTML:'',classList:{toggle(){}},addEventListener(){}};
const document={querySelector(){return dom},querySelectorAll(){return []}};
const ctx={document,localStorage:{getItem(){return null},setItem(){}},navigator:{},location:{protocol:'file:'},console};ctx.window=ctx;
vm.createContext(ctx);vm.runInContext(code,ctx);
const f=(pa,d,load)=>ctx.AeroCalc.compute('cruise',{pa,load,engines:2,oat:15-.0019812*pa+d});
const alt=[0,500,1000,2000,3500,5000,7000,9000,10000,11000,12000,13500,14000,15000,16000,17000,18000],load=[50,55,60,65,70,75,80,85,90,92],deltas=[-10,0,10,20,30];
let n=0,min=Infinity,max=-Infinity;
for(const a of alt)for(const d of deltas)for(const l of load){
 const r=f(a,d,l);assert.ok(!r.error,'Unexpected rejected point: '+[a,d,l]);assert.ok(Number.isFinite(r.main));
 min=Math.min(min,r.main);max=Math.max(max,r.main);n++;
 if(l<92)assert.ok(f(a,d,Math.min(l+1,92)).main>r.main,'Increasing load must raise TAS');
 if(d<30)assert.ok(f(a,Math.min(d+1,30),l).main>r.main,'Increasing temperature must raise TAS');
 if(a<14000)assert.ok(f(a+1,d,l).main>=r.main-.2,'Unexpected altitude discontinuity');
}
for(const v of [
 {pa:-1,oat:15,load:80,engines:2},{pa:18001,oat:-20.66,load:80,engines:2},
 {pa:0,oat:-30,load:80,engines:2},{pa:0,oat:46,load:80,engines:2},
 {pa:10000,oat:-5,load:49.9,engines:2},{pa:10000,oat:-5,load:92.1,engines:2},
 {pa:10000,oat:-5,load:80,engines:1},{pa:10000,oat:NaN,load:80,engines:2}
])assert.ok(ctx.AeroCalc.compute('cruise',v).error,'Invalid input must be blocked: '+JSON.stringify(v));
assert.ok(!f(18000,0,50).error&& !f(18000,30,92).error,'18,000 ft boundary must remain computable');
assert.ok(f(18001,0,80).error,'18,001 ft must be rejected');
assert.ok(f(18000,31,80).error&&f(18000,-11,80).error,'ISA boundaries must be enforced');
console.log('PASS: '+n+' in-domain checks, 8 out-of-domain checks; TAS '+min.toFixed(1)+'–'+max.toFixed(1)+' KTAS. Not flight certified.');
