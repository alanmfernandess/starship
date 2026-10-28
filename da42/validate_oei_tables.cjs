// DA42 NG AFM §5.3.8 — OEI 92% tabular ROC acceptance tests.
// Tables include NEGATIVE/0 values and AFM dark shaded areas <50 ft/min.
const assert=require('node:assert/strict');
const T=require('./oei-tables.js');
assert.deepEqual(T.MASSES,[1700,1900,1999]);
assert.deepEqual(T.TEMP,[-20,-10,0,10,20,30,40,50]);
assert.equal(T.ALT.length,10);
let nodes=0,missing=0,negative=0,caution=0;
for(const mass of T.MASSES){
 const rows=T.TABLES[mass];assert.equal(rows.length,10);
 for(let i=0;i<10;i++){
  assert.equal(rows[i].length,9);
  for(let j=0;j<9;j++){
   const roc=rows[i][j];
   if(roc===null){missing++;continue;}
   const input={mass,pa:T.ALT[i],oat:j===8?15:T.TEMP[j],isa:j===8,power:92};
   const r=T.compute(input);
   assert.equal(r.error,undefined,JSON.stringify(input));
   assert.equal(r.main,roc,JSON.stringify(input));
   assert.ok(Math.abs(r.secondary-roc*.00508)<1e-9);
   assert.equal(r.caution,roc<50);
   assert.equal(r.negative,roc<0);
   assert.equal(r.primaryLabel,roc<0?'RATE OF DESCENT':'RATE OF CLIMB');
   assert.equal(r.vyse,85);assert.equal(r.flaps,'UP');
   nodes++;if(roc<0)negative++;if(roc<50)caution++;
  }
 }
}
assert.equal(nodes,228);assert.equal(missing,42);
const eq=(mass,pa,oat,expected,isa=false)=>{
 const r=T.compute({mass,pa,oat,isa,power:92});
 assert.equal(r.main,expected,JSON.stringify({mass,pa,oat,isa}));
};
eq(1700,0,15,250);
eq(1900,0,15,172.5);
eq(1999,0,15,137.5);
eq(1700,0,15,252,true);
eq(1900,0,15,175,true);
eq(1999,0,15,140,true);
eq(1999,18000,15,-169,true);
eq(1999,4000,50,0);
eq(1999,6000,40,0);
eq(1999,6000,30,25);
eq(1999,12000,30,-125);
eq(1900,8000,40,-10);
eq(1700,16000,-20,-10);
eq(1800,0,15,211.25);
eq(1950,0,15,172.5+(137.5-172.5)*(50/99));
const zero=T.compute({mass:1999,pa:4000,oat:50,power:92});
assert.equal(zero.main,0);assert.equal(zero.secondary,0);assert.equal(zero.caution,true);
const neg=T.compute({mass:1999,pa:18000,isa:true,power:92});
assert.equal(neg.main,-169);assert.equal(neg.primaryLabel,'RATE OF DESCENT');
assert.ok(neg.secondary<0);
for(const bad of [
 {mass:1699},{mass:2000},{pa:-1},{pa:18001},
 {oat:-21},{oat:51},{power:100},{power:90},
 {mass:NaN},{pa:Infinity},{oat:NaN}
])assert.ok(T.compute({mass:1900,pa:0,oat:15,power:92,...bad}).error,JSON.stringify(bad));
for(const unavailable of [
 {mass:1999,pa:6000,oat:50},{mass:1999,pa:10000,oat:40},
 {mass:1999,pa:6000,oat:45},{mass:1999,pa:5000,oat:45},
 {mass:1800,pa:8000,oat:50},{mass:1900,pa:18000,oat:40}
])assert.equal(T.compute({power:92,...unavailable}).error,'SEM DADOS PUBLICADOS NA TABELA');
let valid=0,rejected=0;
for(let mass=1700;mass<=1999;mass+=13)
 for(let pa=0;pa<=18000;pa+=900)
 for(let oat=-20;oat<=50;oat+=5){
  const result=T.compute({mass,pa,oat,power:92});
  if(result.error){assert.equal(result.error,'SEM DADOS PUBLICADOS NA TABELA');rejected++;continue}
  assert.ok(Number.isFinite(result.main)&&Number.isFinite(result.secondary));
  assert.ok(Math.abs(result.secondary-result.main*.00508)<1e-9);
  valid++;
 }
console.log('PASS AFM OEI: '+nodes+' exact values, '+missing+' unreported, '+negative+' negative cells, '+caution+' <50 cells; '+valid+' interpolated / '+rejected+' unsupported. Experimental only.');
