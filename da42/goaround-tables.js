/* DA42 NG AFM §5.3.12 — Go-Around Climb Performance.
 * Both engines MAX, flaps LDG, landing gear extended.
 * VREF 84 KIAS up to 1900 kg; 86 KIAS above 1900 kg.
 * Published ROC [ft/min] grids at 1700/1900/1999 kg,
 * PA 0..10000ft, OAT -20,-10,0,10,20,30,40,50°C and
 * separate independently published ISA column.
 * Crossed-out cells are null; no interpolation through them.
 * The AFM separately publishes angle examples at ISA/MSL:
 * 1805kg 4.3°, 1900kg 3.8°, 1999kg 3.1° (MÄM 42-678).
 * No TAS chart for off-anchor angle or gradient, so neither
 * is calculated from KIAS or approximated as TAS.
 * Engineering prototype only; not approved for flight.
 */
(function(root){
'use strict';
const MASS=Object.freeze([1700,1900,1999]);
const ALT=Object.freeze([0,2000,4000,6000,8000,10000]);
const OAT=Object.freeze([-20,-10,0,10,20,30,40,50]);
const RAW={
1700:[
'755 735 715 695 680 635 570 480 690',
'715 695 680 660 635 585 510 420 659',
'680 660 635 610 585 525 445 355 619',
'635 610 585 555 530 460 380 x 577',
'585 555 530 500 470 390 310 x 533',
'525 495 465 425 375 290 x x 483'],
1900:[
'610 590 570 555 535 495 440 360 547',
'575 555 535 515 495 450 385 305 517',
'540 515 495 470 445 395 325 245 479',
'495 470 445 420 395 335 265 x 439',
'445 420 395 365 340 270 200 x 397',
'390 365 330 295 255 175 x x 350'],
1999:[
'515 495 480 460 445 400 345 270 454',
'480 460 445 420 395 350 290 215 419',
'445 420 395 370 350 295 235 160 381',
'395 370 345 320 300 240 175 x 341',
'345 320 295 270 240 175 105 x 299',
'295 265 235 195 155 80 x x 253']
};
const TABLES={};
for(const mass of MASS){
 TABLES[mass]=RAW[mass].map(row=>row.split(/\s+/).map(v=>v==='x'?null:Number(v)));
 if(TABLES[mass].length!==ALT.length||TABLES[mass].some(row=>row.length!==9||row.some(v=>v!==null&&!Number.isFinite(v))))throw Error('Invalid §5.3.12 AFM grid');
}
const mix=(a,b,t)=>a+(b-a)*t;
function bracket(xs,x){
 if(!Number.isFinite(x)||x<xs[0]||x>xs.at(-1))return null;
 const ix=xs.indexOf(x);if(ix!==-1)return [ix,ix,0];
 for(let i=0;i<xs.length-1;i++)if(x>xs[i]&&x<xs[i+1])return [i,i+1,(x-xs[i])/(xs[i+1]-xs[i])];
 return null;
}
const isaAt=pa=>15-.002*pa;
const vrefFor=mass=>mass>1900?86:84;
const ANGLES=Object.freeze({1805:4.3,1900:3.8,1999:3.1});
function validate(v){
 if(!v||!Number.isFinite(v.mass)||!Number.isFinite(v.pa))return 'PARÂMETROS INCOMPLETOS';
 if(!bracket(MASS,v.mass))return 'MASSA FORA DA TABELA';
 if(!bracket(ALT,v.pa))return 'ALTITUDE FORA DA TABELA';
 if(!v.isa&&!bracket(OAT,v.oat))return 'OAT FORA DA TABELA';
 if(v.speed!==undefined&&v.speed!==vrefFor(v.mass))return 'VREF INCOMPATÍVEL COM A MASSA';
 return null;
}
function compute(v){
 const error=validate(v);if(error)return {error};
 const m=bracket(MASS,v.mass),a=bracket(ALT,v.pa),t=v.isa?[8,8,0]:bracket(OAT,v.oat);
 const cell=(mi,ai)=>{
  const row=TABLES[MASS[mi]][ai],p=row[t[0]],q=row[t[1]];
  return p===null||q===null?null:mix(p,q,t[2]);
 };
 const at=(mi)=>{
  const b=cell(mi,a[0]),e=cell(mi,a[1]);
  return b===null||e===null?null:mix(b,e,a[2]);
 };
 const first=at(m[0]),last=at(m[1]);
 if(first===null||last===null)return {error:'CÉLULA NÃO PUBLICADA NO AFM'};
 const roc=mix(first,last,m[2]);
 const angle=v.isa&&v.pa===0&&Object.prototype.hasOwnProperty.call(ANGLES,v.mass)?ANGLES[v.mass]:null;
 return {main:roc,secondary:roc*0.00508,angle,
  primaryLabel:roc<0?'RATE OF DESCENT':'RATE OF CLIMB',
  vref:vrefFor(v.mass),power:'BOTH MAX',flaps:'LDG',gear:'EXTENDED',
  experimental:true};
}
const api={MASS,ALT,OAT,TABLES,ANGLES,isaAt,vrefFor,bracket,validate,compute};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.GoAroundTables=api;
})(typeof window!=='undefined'?window:globalThis);
