// AFM §5.3.11 — Landing and Abnormal Landing official tabulated anchors.
const assert=require('node:assert/strict'),E=require('./landing-tables.js');
assert.deepEqual(E.ALT,[0,1000,2000,3000,4000,5000,6000,7000,8000,9000,10000]);
assert.deepEqual(E.MASS,[1700,1900,1999]);
assert.deepEqual(E.OAT,[0,10,20,30,40,50]);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,JSON.stringify({a,b}));
let rows=0,known=0,missing=0,interpolated=0,rejected=0;
for(const kind of ['landing','abnormal'])for(const mass of E.MASS)for(let i=0;i<E.ALT.length;i++){
 const [g,tot]=E.TABLES[kind][mass][i];
 assert.equal(g.length,7);assert.equal(tot.length,7);
 rows++;
 for(let j=0;j<7;j++){
  const v={mass,pa:E.ALT[i],oat:j<6?E.OAT[j]:E.isaAt(E.ALT[i]),isa:j===6,wind:0};
  const r=E.compute(kind,v);
  if(g[j]===null||tot[j]===null){
   assert.equal(r.error,'CÉLULA NÃO PUBLICADA NO AFM',JSON.stringify({kind,mass,i,j,r}));missing++;
  }else{
   near(r.secondary,g[j]);near(r.main,tot[j]);known++;
  }
 }
}
assert.equal(rows,66);assert.ok(known>350&&missing>0);
// Independent AFM anchors.
for(const [kind,mass,pa,oat,ground,total] of [
 ['landing',1700,0,0,320,550],['landing',1900,0,0,350,600],
 ['landing',1999,0,0,370,620],['landing',1999,10000,30,750,1160],
 ['landing',1900,10000,30,720,1120],['landing',1700,10000,30,670,1050],
 ['abnormal',1700,0,0,440,750],['abnormal',1900,0,0,490,820],
 ['abnormal',1999,0,0,510,860],['abnormal',1999,10000,30,1020,1610],
 ['abnormal',1900,10000,30,990,1550],['abnormal',1700,10000,30,920,1440]
]){
 const r=E.compute(kind,{mass,pa,oat,wind:0});
 near(r.secondary,ground);near(r.main,total);
}
const isa=E.compute('landing',{mass:1900,pa:0,oat:15,isa:true,wind:0});
near(isa.secondary,369);near(isa.main,618);
const oat=E.compute('landing',{mass:1900,pa:0,oat:15,wind:0});
near(oat.secondary,375);near(oat.main,620);
// AFM head/tailwind multiplier is already established from 50%/150% component.
const base={mass:1900,pa:0,oat:0,wind:0};
const head=E.compute('landing',{...base,wind:14});
near(head.secondary,350*.9);near(head.main,600*.9);
const tail=E.compute('landing',{...base,wind:-3});
near(tail.secondary,350*1.1);near(tail.main,600*1.1);
// Wet paved: +15% to distance; grass and downhill add to ground roll.
const wet=E.compute('landing',{...base,wet:true});
near(wet.secondary,350*1.15);near(wet.main,600*1.15);
const grass=E.compute('landing',{...base,surface:'grass10'});
near(grass.secondary,350*1.15);near(grass.main,600+350*.15);
const wetGrass=E.compute('landing',{...base,surface:'grass10',wet:true,soft:true});
near(wetGrass.secondary,350*1.25);near(wetGrass.main,600+350*.25); // +10% wet OR soft once
const slope=E.compute('landing',{...base,slope:2});
near(slope.secondary,350*1.18);near(slope.main,600+350*.18);
const abnormal=E.compute('abnormal',{...base,surface:'grass5',slope:1});
near(abnormal.secondary,490*1.19);near(abnormal.main,820+490*.19);
const vref=E.compute('abnormal',{mass:1999,pa:0,oat:0,wind:0});
assert.equal(vref.vref,92);
for(const kind of ['landing','abnormal'])for(const mass of [1700,1750,1900,1950,1999])
 for(const pa of [0,500,1000,3500,5000,7000,9000,10000])
 for(const oat of [0,5,10,15,20,25,30,35,40,45,50]){
  const r=E.compute(kind,{mass,pa,oat,wind:5});
  if(r.error){rejected++;continue}
  assert.ok(r.main>r.secondary&&r.secondary>0);
  interpolated++;
 }
assert.ok(interpolated>400&&rejected>0);
for(const bad of [{pa:-1},{pa:10001},{oat:-1},{oat:51},{mass:1699},{mass:2000},{wind:-11},{wind:21},{slope:-1},{slope:5.1},{surface:'invalid'},{oat:NaN},{mass:NaN}])
 assert.ok(E.compute('landing',{...base,...bad}).error,JSON.stringify(bad));
console.log('PASS landing §5.3.11: '+known+' published values, '+missing+' slashed cells, '+interpolated+' interpolated cases, '+rejected+' no-data rejects, wind/runway/ISA exact checks.');
