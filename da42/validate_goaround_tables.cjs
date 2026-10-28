// DA42 NG AFM §5.3.12 — exact Go-Around table anchors and no extrapolation.
const assert=require('node:assert/strict'),E=require('./goaround-tables.js');
assert.deepEqual(E.MASS,[1700,1900,1999]);
assert.deepEqual(E.ALT,[0,2000,4000,6000,8000,10000]);
assert.deepEqual(E.OAT,[-20,-10,0,10,20,30,40,50]);
const expected={
1700:[
[755,735,715,695,680,635,570,480,690],
[715,695,680,660,635,585,510,420,659],
[680,660,635,610,585,525,445,355,619],
[635,610,585,555,530,460,380,null,577],
[585,555,530,500,470,390,310,null,533],
[525,495,465,425,375,290,null,null,483]],
1900:[
[610,590,570,555,535,495,440,360,547],
[575,555,535,515,495,450,385,305,517],
[540,515,495,470,445,395,325,245,479],
[495,470,445,420,395,335,265,null,439],
[445,420,395,365,340,270,200,null,397],
[390,365,330,295,255,175,null,null,350]],
1999:[
[515,495,480,460,445,400,345,270,454],
[480,460,445,420,395,350,290,215,419],
[445,420,395,370,350,295,235,160,381],
[395,370,345,320,300,240,175,null,341],
[345,320,295,270,240,175,105,null,299],
[295,265,235,195,155,80,null,null,253]]
};
const almost=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,JSON.stringify({a,b}));
let published=0,unavailable=0;
for(const mass of E.MASS)for(let i=0;i<E.ALT.length;i++){
 assert.deepEqual(E.TABLES[mass][i],expected[mass][i]);
 for(let j=0;j<9;j++){
  const pa=E.ALT[i],v={mass,pa,isa:j===8,oat:j===8?E.isaAt(pa):E.OAT[j]};
  const r=E.compute(v);
  if(expected[mass][i][j]===null){assert.equal(r.error,'CÉLULA NÃO PUBLICADA NO AFM');unavailable++}
  else{almost(r.main,expected[mass][i][j]);almost(r.secondary,expected[mass][i][j]*.00508);assert.equal(r.vref,mass>1900?86:84);published++}
 }
}
assert.equal(published,150);assert.equal(unavailable,12);
const reference=[
 {mass:1900,pa:0,isa:true,roc:547,angle:3.8},
 {mass:1999,pa:0,isa:true,roc:454,angle:3.1},
 {mass:1805,pa:0,isa:true,roc:614.925,angle:4.3},
 {mass:1700,pa:0,isa:true,roc:690,angle:null}
];
for(const {mass,pa,isa,roc,angle} of reference){
 const r=E.compute({mass,pa,isa});almost(r.main,roc);assert.equal(r.angle,angle);
}
assert.equal(E.compute({mass:1900,pa:0,oat:15}).angle,null);
almost(E.compute({mass:1900,pa:0,oat:15}).main,545);
const mid=E.compute({mass:1800,pa:1000,oat:-5}); // bilinear in mass, PA, OAT
assert.ok(mid.main>0&&mid.main<755);
const isa=E.compute({mass:1900,pa:2000,isa:true});
almost(isa.main,517);
for(const bad of [
 {mass:1699},{mass:2000},{pa:-1},{pa:10001},{oat:-21},{oat:51},{oat:NaN},
 {mass:NaN},{pa:NaN},{mass:1999,speed:84},{mass:1900,speed:86}
])assert.ok(E.compute({mass:1900,pa:0,oat:15,...bad}).error,JSON.stringify(bad));
const crossed=E.compute({mass:1999,pa:5000,oat:50});
assert.equal(crossed.error,'CÉLULA NÃO PUBLICADA NO AFM');
let valid=0,skipped=0;for(const mass of [1700,1805,1900,1950,1999])
 for(const pa of [0,1000,2000,4000,5000,6000,8000,10000])
 for(const oat of [-20,-15,-10,0,15,20,30,35,40,45,50]){
  const r=E.compute({mass,pa,oat});
  if(r.error){assert.equal(r.error,'CÉLULA NÃO PUBLICADA NO AFM');skipped++}
  else{assert.ok(r.main>0&&r.secondary>0);valid++}
 }
console.log('PASS AFM §5.3.12 Go-Around: '+published+' numeric cells, '+unavailable+' unpublished, '+valid+' in-domain interpolations, '+skipped+' crossed-cell rejections, 3 official angle references.');
