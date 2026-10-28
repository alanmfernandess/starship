// Regression checks only. Published examples were used in calibration: NOT an independent AFM validation.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const node={set innerHTML(v){this.html=v},get innerHTML(){return this.html},onclick:null,classList:{toggle(){}},addEventListener(){},textContent:''};
const document={querySelector(){return node},querySelectorAll(){return []}};
const env={document,localStorage:{getItem(){return null},setItem(){}},location:{protocol:'file:'},navigator:{},console,Intl,Math,Date,Number};env.window=env;vm.createContext(env);vm.runInContext(script,env);
const f=env.AeroCalc.compute;
const takeoff=f('takeoff',{pa:0,oat:15,mass:1800,wind:10});
const climb=f('climb',{pa:0,oat:15,mass:1800,power:92});
const oei=f('oei',{pa:0,oat:15,mass:1800,power:92});
assert.equal(takeoff.main,610);assert.equal(takeoff.secondary,370);assert.equal(climb.main,1150);assert.equal(oei.main,212);
assert.ok(f('takeoff',{pa:0,oat:15,mass:1900,wind:10}).main>610);
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
console.log('Regression checks passed; experimental model is NOT flight validated.');
