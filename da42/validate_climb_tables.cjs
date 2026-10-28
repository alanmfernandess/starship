// AFM 5.3.7 all-engines climb, UP/APP, 92%-power table regressions.
const assert=require('node:assert/strict');
const C=require('./climb-tables.js');
assert.deepEqual(C.MASSES,[1700,1900,1999]);
assert.deepEqual(C.TEMP,[-20,-10,0,10,20,30,40,50]);
assert.equal(C.ALT.length,10);
let anchors=0,hidden=0;
for(const flaps of ['up','app'])for(const mass of C.MASSES){
 const grid=C.TABLES[flaps][mass];
 assert.equal(grid.length,10);
 for(let i=0;i<10;i++)for(let j=0;j<9;j++){
  const rate=grid[i][j];
  if(rate===null){hidden++;continue}
  const p={flaps,mass,pa:C.ALT[i],oat:j===8?15:C.TEMP[j],isa:j===8,power:92};
  const r=C.compute(p);
  assert.equal(r.error,undefined,JSON.stringify(p));
  assert.equal(r.main,rate,JSON.stringify(p));
  assert.ok(Math.abs(r.secondary-rate*.00508)<1e-8);
  assert.equal(r.vy,flaps==='app'?85:mass>1900?92:90);
  anchors++;
 }
}
assert.equal(C.compute({flaps:'up',mass:1999,pa:0,isa:true,power:92}).main,982);
assert.equal(C.compute({flaps:'app',mass:1999,pa:0,isa:true,power:92}).main,953);
assert.equal(C.compute({flaps:'up',mass:1900,pa:0,isa:true,power:92}).main,1065);
assert.equal(C.compute({flaps:'app',mass:1900,pa:0,isa:true,power:92}).main,1034);
assert.equal(C.compute({flaps:'up',mass:1700,pa:0,isa:true,power:92}).main,1241);
assert.equal(C.compute({flaps:'app',mass:1700,pa:0,isa:true,power:92}).main,1215);
assert.equal(C.compute({flaps:'up',mass:1800,pa:0,oat:15,power:92}).main,1147.5);
assert.equal(C.compute({flaps:'app',mass:1800,pa:0,oat:15,power:92}).main,1120);
assert.equal(C.compute({flaps:'up',mass:1999,pa:0,oat:15,power:92}).main,975);
assert.equal(C.compute({flaps:'app',mass:1999,pa:0,oat:15,power:92}).main,950);
assert.equal(C.compute({flaps:'app',mass:1999,pa:6000,oat:50,power:92}).error,'SEM DADOS PUBLICADOS NA TABELA');
assert.equal(C.compute({flaps:'up',mass:1999,pa:18000,oat:40,power:92}).error,'SEM DADOS PUBLICADOS NA TABELA');
// Null neighbors must not block exact published nodes.
assert.equal(C.compute({flaps:'up',mass:1999,pa:6000,oat:40,power:92}).main,720);
assert.equal(C.compute({flaps:'app',mass:1999,pa:6000,oat:40,power:92}).main,710);
assert.equal(C.compute({flaps:'up',mass:1999,pa:6000,oat:45,power:92}).error,'SEM DADOS PUBLICADOS NA TABELA');
for(const bad of [{mass:2000},{mass:1699},{pa:-1},{pa:18001},{oat:-21},{oat:51},{power:100},{flaps:'ldg'}]){
 assert.ok(C.compute({flaps:'up',mass:1900,pa:0,oat:10,power:92,...bad}).error,JSON.stringify(bad));
}
let gridCases=0;
for(const flaps of ['up','app'])for(let mass=1700;mass<=1999;mass+=13)for(let pa=0;pa<=18000;pa+=900)for(let oat=-20;oat<=50;oat+=5){
 const r=C.compute({flaps,mass,pa,oat,power:92});
 if(r.error){assert.equal(r.error,'SEM DADOS PUBLICADOS NA TABELA');continue}
 assert.ok(r.main>0&&Number.isFinite(r.main)&&Math.abs(r.secondary-r.main*.00508)<1e-8);
 gridCases++;
}
console.log('PASS AFM climb: '+anchors+' exact table cells, '+hidden+' unavailable cells, '+gridCases+' interpolated cases, UP/APP, 1999 kg, 92% power. NOT FOR FLIGHT.');
