// AFM §5.3.6 takeoff table digitization regression. Experimental only.
const assert=require('node:assert/strict'),T=require('./takeoff-tables.js');
const eq=(p,a,b)=>{const r=T.compute({pa:p.pa??0,oat:p.oat??10,mass:p.mass??1900,wind:0,procedure:p.procedure||'normal',isa:!!p.isa,...p});assert.ok(!r.error,JSON.stringify({p,r}));assert.equal(r.secondary,a,JSON.stringify(p));assert.equal(r.main,b,JSON.stringify(p));};
for(const mode of ['normal','short'])for(const mass of [1700,1900,1999]){
 const t=T.TABLES[mode][mass];
 assert.equal(t.ground.length,11);
 assert.equal(t.total.length,11);
 for(let a=0;a<11;a++){
  assert.equal(t.ground[a].length,7);
  assert.equal(t.total[a].length,7);
  for(let j=0;j<7;j++){
   const g=t.ground[a][j],d=t.total[a][j];
   assert.equal(g===null,d===null,'identical unsupported cells');
   if(g!==null)assert.ok(d>g,'total over 50 ft must exceed ground roll');
   if(mass!==1999&&g!==null){
    eq({procedure:mode,mass,pa:T.ALT[a],oat:j===6?15:T.TEMPS[j],isa:j===6},g,d);
   }
  }
 }
}
eq({procedure:'normal',mass:1700,pa:0,oat:0},370,580);
eq({procedure:'normal',mass:1900,pa:0,oat:10},450,710);
eq({procedure:'normal',mass:1900,pa:0,isa:true},458,734);
eq({procedure:'normal',mass:1900,pa:10000,isa:true},847,1477);
eq({procedure:'short',mass:1700,pa:0,oat:0},360,530);
eq({procedure:'short',mass:1900,pa:0,oat:10},430,640);
eq({procedure:'short',mass:1900,pa:0,isa:true},445,657);
eq({procedure:'short',mass:1900,pa:10000,isa:true},843,1221);
assert.equal(T.TABLES.normal[1999].ground[0][0],490);
assert.equal(T.TABLES.short[1999].total[10][6],1441);
// Trilinear interpolation between published 1700/1900kg mass points.
eq({procedure:'normal',mass:1800,pa:0,oat:10},425,665);
eq({procedure:'short',mass:1800,pa:0,oat:10},405,600);
const ref=T.compute({procedure:'normal',mass:1800,pa:0,oat:15,wind:10});
assert.ok(Math.abs(ref.secondary-406.25)<1e-10);
assert.ok(Math.abs(ref.main-638.3928571428571)<1e-10);
const hw=T.compute({procedure:'normal',mass:1900,pa:0,oat:10,wind:14});
assert.ok(Math.abs(hw.secondary-405)<1e-9&&Math.abs(hw.main-639)<1e-9);
const tw=T.compute({procedure:'normal',mass:1900,pa:0,oat:10,wind:-3});
assert.ok(Math.abs(tw.secondary-495)<1e-9&&Math.abs(tw.main-781)<1e-9);
const base=T.compute({procedure:'normal',mass:1900,pa:0,oat:10,wind:0});
const grass=T.compute({procedure:'normal',mass:1900,pa:0,oat:10,wind:0,surface:'grass10'});
assert.equal(grass.secondary,base.secondary*1.15);
assert.ok(Math.abs(grass.main-(base.main+base.secondary*.15))<1e-8);
const slope=T.compute({procedure:'normal',mass:1900,pa:0,oat:10,wind:0,slope:1});
assert.equal(slope.secondary,base.secondary*1.12);
const wet=T.compute({procedure:'normal',mass:1900,pa:0,oat:10,wind:0,surface:'grass5',wet:true});
assert.ok(wet.main>base.main&&wet.secondary>base.secondary);
const soft=T.compute({procedure:'normal',mass:1900,pa:0,oat:10,wind:0,surface:'grass5',soft:true});
assert.ok(soft.main>grass.main);
for(const p of [
 {mass:1999},{mass:1500},{mass:1699},{mass:1901},{mass:2000},
 {pa:10001},{pa:-1},{pa:5000,oat:50},{pa:10000,oat:40},
 {surface:'gravel'},{surface:'paved',wet:true},{slope:-1},{slope:6}
])assert.ok(T.compute({procedure:'normal',mass:1900,pa:0,oat:10,wind:0,...p}).error,JSON.stringify(p));
let validated=0;for(const procedure of ['normal','short'])for(let mass=1700;mass<=1900;mass+=50)for(let pa=0;pa<=10000;pa+=1000)for(let oat=0;oat<=50;oat+=10){
 const r=T.compute({procedure,pa,mass,oat,wind:0});
 if(r.error){assert.equal(r.error,'SEM DADOS PUBLICADOS NA TABELA');continue}
 assert.ok(Number.isFinite(r.main)&&Number.isFinite(r.secondary)&&r.main>r.secondary&&r.secondary>0);
 validated++;
}
console.log('PASS AFM takeoff: 6 published grids, 1700–1900 kg range, temperature/altitude, ISA, wind, runway corrections, '+validated+' 3D samples. Not for flight.');
