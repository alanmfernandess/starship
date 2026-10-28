// Regression checks only. Published examples were used in calibration: NOT an independent AFM validation.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const node={set innerHTML(v){this.html=v},get innerHTML(){return this.html},onclick:null,classList:{toggle(){}},addEventListener(){},textContent:''};
const document={querySelector(){return node},querySelectorAll(){return []}};
const env={document,localStorage:{getItem(){return null},setItem(){}},location:{protocol:'file:'},navigator:{},console,Intl,Math,Date,Number};env.window=env;vm.createContext(env);vm.runInContext(fs.readFileSync(__dirname+'/takeoff-tables.js','utf8'),env);vm.runInContext(fs.readFileSync(__dirname+'/climb-tables.js','utf8'),env);vm.runInContext(script,env);
const f=env.AeroCalc.compute;
const takeoff=f('takeoff',{pa:0,oat:15,mass:1800,wind:10});
const climb=f('climb',{pa:0,oat:15,mass:1800,power:92});
const oei=f('oei',{pa:0,oat:15,mass:1800,power:92});
assert.equal(Math.round(takeoff.main),638);assert.equal(Math.round(takeoff.secondary),406);assert.equal(climb.main,1147.5);assert.equal(oei.main,212);
assert.ok(f('takeoff',{pa:0,oat:15,mass:1900,wind:10}).main>takeoff.main);
assert.ok(f('oei',{pa:16000,oat:0,mass:1900,power:92}).main<0);
assert.ok(f('climb',{pa:20000,oat:15,mass:1800,power:92}).error);
for(const id of ['takeoff','climb','oei']){
 const at=(overrides)=>f(id,{pa:0,oat:15,mass:1800,power:92,wind:10,...overrides});
 const low=at({mass:1700}),high=at({mass:1900});
 assert.ok(!low.error&&!high.error);
 assert.ok(id==='takeoff'?low.main<high.main:low.main>high.main,id+': mass');
 const cold=at({oat:5}),hot=at({oat:25});
 assert.ok(!cold.error&&!hot.error);
 assert.ok(id==='takeoff'?cold.main<hot.main:cold.main>hot.main,id+': temperature');
 const sea=at({pa:0}),up=at({pa:2000});
 assert.ok(!sea.error&&!up.error);
 assert.ok(id==='takeoff'?sea.main<up.main:sea.main>up.main,id+': altitude');
}
const hw=f('takeoff',{pa:0,oat:15,mass:1800,wind:20}),tw=f('takeoff',{pa:0,oat:15,mass:1800,wind:-10});
assert.ok(hw.main<tw.main,'head/tailwind');

// Cruise: graphical example 10000 ft / ISA STD / 80% load / 2 engines -> 164 KTAS.
const cruise=f('cruise',{pa:10000,oat:-5,load:80,engines:2});
assert.ok(!cruise.error);assert.equal(Math.round(cruise.main),164);
assert.ok(Math.abs(cruise.secondary)<.25);
assert.ok(f('cruise',{pa:10000,oat:-5,load:92,engines:2}).main>cruise.main);
assert.ok(f('cruise',{pa:10000,oat:5,load:80,engines:2}).main>cruise.main);
assert.ok(!f('cruise',{pa:16000,oat:-15,load:80,engines:2}).error);
assert.ok(f('cruise',{pa:18001,oat:-15,load:80,engines:2}).error);
assert.ok(f('cruise',{pa:10000,oat:35,load:80,engines:2}).error);
assert.ok(f('cruise',{pa:10000,oat:-5,load:20,engines:2}).error);
assert.ok(f('cruise',{pa:10000,oat:-5,load:80,engines:1}).error);

console.log('Seven modules: legacy references and TAS domain checks passed. Not validated for flight.');
