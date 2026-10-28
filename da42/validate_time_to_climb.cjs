// DA42 NG AFM §5.3.9 — exact table anchors, example and mass/altitude interpolation
const assert=require('node:assert/strict'),T=require('./time-to-climb.js');
const table={
 1700:[[0,0,0],[2,.5,2],[3,.9,5],[5,1.4,8],[7,1.9,11],[9,2.4,14],[10,2.9,17],[12,3.4,21],[14,4,25],[17,4.6,29]],
 1900:[[0,0,0],[2,.5,3],[4,1.1,6],[6,1.6,9],[8,2.2,13],[10,2.8,16],[12,3.4,20],[15,4,24],[17,4.7,29],[20,5.4,35]],
 1999:[[0,0,0],[2,.6,3],[4,1.2,7],[6,1.8,10],[9,2.4,14],[11,3.1,18],[13,3.7,23],[16,4.4,27],[19,5.2,33],[22,6,39]]
};
const auxiliary={1700:[90,91,93,94,96,97,99,100,102,104],1900:[90,91,93,94,96,97,99,100,102,104],1999:[92,93,95,96,98,99,101,102,104,106]};
const roc={1700:[1240,1225,1215,1200,1185,1165,1145,1125,1095,1060],1900:[1065,1050,1040,1025,1010,995,975,955,930,895],1999:[980,970,955,940,930,910,895,875,845,815]};
let cells=0;for(const m of T.MASSES)for(let i=0;i<10;i++){
 assert.deepEqual(T.TABLES[m][i],[auxiliary[m][i],roc[m][i],...table[m][i]]);
 assert.deepEqual(T.cumulative(m,T.ALT[i]),T.TABLES[m][i]);cells++;
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,String(a)+' vs '+String(b));
const ex=T.compute({start:2000,target:16000,mass:1900,oat:11});
near(ex.main,15);near(ex.secondary,4.2);near(ex.distance,26);
const all=T.compute({start:0,target:18000,mass:1999,oat:15});
near(all.main,22);near(all.secondary,6);near(all.distance,39);
const hot=T.compute({start:2000,target:16000,mass:1900,oat:21});
near(hot.main,16.5);near(hot.secondary,4.62);near(hot.distance,28.6);
const cold=T.compute({start:2000,target:16000,mass:1900,oat:1});
near(cold.main,15);near(cold.secondary,4.2);near(cold.distance,26);
const mixed=T.compute({start:2000,target:16000,mass:1950,oat:11});
near(mixed.main,15+2*50/99);near(mixed.secondary,4.2+.4*50/99);near(mixed.distance,26+4*50/99);
const middle=T.cumulative(1900,3000);
near(middle[2],3);near(middle[3],.8);near(middle[4],4.5);
for(const bad of [{start:-1},{start:18000},{target:18001},{start:16000,target:2000},{start:5000,target:5000},{mass:1699},{mass:2000},{oat:-51},{oat:51},{oat:50},{mass:NaN},{start:NaN}])
 assert.ok(T.compute({start:2000,target:16000,mass:1900,oat:11,...bad}).error,JSON.stringify(bad));
let valid=0;for(const mass of [1700,1750,1800,1900,1950,1999])
 for(const start of [0,2000,4000,6000,10000])
 for(const target of [12000,14000,16000,18000]){
  const r=T.compute({start,target,mass,oat:T.isaAt(start)});
  assert.ok(!r.error&&r.main>0&&r.secondary>0&&r.distance>0);
  valid++;
 }
console.log('PASS AFM §5.3.9: '+cells+' table anchors, example 15 min / 4.2 US gal / 26 NM, '+valid+' valid interpolated cases.');
