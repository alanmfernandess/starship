// DA42 NG AFM §5.3.10 Cruise Performance, 1999kg.
// Published rows encode Power[%], FF[US gal/h], TAS[kt].
// No loads outside available power envelope or ISA/alt range.
const assert=require('node:assert/strict'),E=require('./cruise-performance.js');
assert.deepEqual(E.ALT,[2000,4000,6000,8000,10000,12000,14000,16000,18000]);
assert.deepEqual(E.DELTA,[-10,0,10,20,30]);
let cells=0;
for(const pa of E.ALT)for(let j=0;j<E.DELTA.length;j++){
 const rows=E.TABLES[pa][j];assert.equal(rows.length,4);
 const oat=E.isaAt(pa)+E.DELTA[j];
 for(const [power,ff,tas] of rows){
  const r=E.compute({pa,oat,load:power,mass:1999});
  assert.equal(r.error,undefined,JSON.stringify({pa,oat,power}));
  assert.equal(r.main,tas,JSON.stringify({pa,j,power}));
  assert.equal(r.secondary,ff,JSON.stringify({pa,j,power}));
  assert.equal(r.availablePower,rows[0][0]);
  cells++;
 }
}
assert.equal(cells,180);
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,String(x)+' != '+String(y));
const refs=[
 [2000,-10,92,164,16.5],[2000,0,92,165,16.5],[2000,30,89,164,15.9],
 [8000,10,92,172,16.5],[10000,0,75,156,13],[10000,20,60,142,10.4],
 [14000,20,85,170,15],[14000,30,50,138,8.8],
 [16000,10,90,173,16.1],[16000,20,84,170,14.8],
 [18000,0,85,169,15],[18000,30,75,168,13],[18000,30,50,142,8.8]
];
for(const [pa,delta,load,tas,ff] of refs){
 const r=E.compute({pa,oat:E.isaAt(pa)+delta,load,mass:1999});
 near(r.main,tas);near(r.secondary,ff);
}
const interpolated=E.compute({pa:10000,oat:E.isaAt(10000)+5,load:67.5,mass:1999});
near(interpolated.main,148.5);
near(interpolated.secondary,11.7);
const mid=E.compute({pa:11000,oat:E.isaAt(11000),load:75,mass:1999});
near(mid.main,157);near(mid.secondary,13);
const compensated=E.compute({pa:10000,oat:E.isaAt(10000),load:75,mass:1999,reduced:true});
near(compensated.main,156*.98);near(compensated.secondary,13);
for(const v of [
 {pa:1000},{pa:18001},{load:44},{load:93},{mass:1900},
 {pa:18000,load:92},{pa:14000,load:90,oat:E.isaAt(14000)+20},
 {pa:16000,load:80,oat:E.isaAt(16000)+30},
 {pa:2000,oat:E.isaAt(2000)-11},{pa:2000,oat:E.isaAt(2000)+31},
 {pa:Infinity},{oat:NaN},{load:NaN}
]){
 const result=E.compute({pa:10000,oat:-5,load:75,mass:1999,...v});
 assert.ok(result.error,JSON.stringify(v));
}
let valid=0,invalid=0;
for(const pa of [2000,3000,4000,6000,8000,10000,12000,14000,16000,18000])
 for(const delta of [-10,-5,0,5,10,15,20,25,30])
 for(const load of [45,50,60,65,75,80,85,89,90,92]){
  const r=E.compute({pa,oat:E.isaAt(pa)+delta,load,mass:1999});
  if(r.error){invalid++;continue}
  assert.ok(Number.isFinite(r.main)&&r.main>0&&Number.isFinite(r.secondary)&&r.secondary>0);
  assert.ok(r.availablePower>=load && r.minimumPower<=load);
  valid++;
 }
console.log('PASS §5.3.10 Cruise: '+cells+' exact published table rows, '+refs.length+' independent anchors; '+valid+' interpolated valid points, '+invalid+' guarded out-of-envelope points. Not for flight.');
