/* DA42 NG AFM §5.3.8 — One Engine Inoperative (OEI) climb.
 * Remaining engine 92%; dead engine feathered/secured; flaps UP;
 * gear retracted; V_YSE 85 KIAS; sideslip half ball out.
 * Table values in ft/min, including ZERO and NEGATIVE ROC.
 * 1,999 kg performance reference; applicability to a specific airframe
 * requires MÄM 42-678 and its corresponding AFM/weight limitations.
 * Not certified for planning or execution of flight.
 */
(function(root){
'use strict';
const ALT=Object.freeze([0,2000,4000,6000,8000,10000,12000,14000,16000,18000]);
const TEMP=Object.freeze([-20,-10,0,10,20,30,40,50]);
const MASSES=Object.freeze([1700,1900,1999]);
const parse=s=>s.trim().split('|').map(str=>str.trim().split(/\s+/).map(v=>v==='-'?null:Number(v)));
const TABLES={
 1700:parse('295 280 270 255 245 230 205 170 252|270 255 245 230 220 200 170 135 232|245 230 220 205 190 165 135 95 210|220 205 185 170 155 130 95 - 184|190 170 155 140 120 90 55 - 158|155 135 120 105 80 40 - - 130|115 90 65 40 10 -40 - - 90|65 40 10 -25 -60 -125 - - 48|-10 -35 -65 -105 -145 - - - -16|-85 -110 -140 -195 -235 - - - -80'),
 1900:parse('215 205 190 180 165 155 135 105 175|195 180 165 155 145 125 100 70 156|170 155 140 130 115 95 65 30 134|145 130 110 95 80 60 30 - 109|115 95 80 65 50 20 -10 - 84|80 65 45 30 10 -25 - - 57|40 20 -5 -25 -55 -100 - - 19|-5 -30 -60 -90 -120 -175 - - -21|-75 -100 -125 -165 -200 - - - -80|-145 -170 -200 -245 -280 - - - -140'),
 1999:parse('180 165 155 145 130 120 100 70 140|155 145 130 120 105 90 65 35 120|135 120 105 90 80 60 35 0 99|110 90 75 60 45 25 0 - 74|80 60 45 30 15 -10 -40 - 49|45 30 15 -5 -25 -55 - - 23|5 -15 -35 -60 -85 -125 - - -14|-35 -65 -90 -120 -150 -200 - - -53|-105 -130 -155 -190 -225 - - - -111|-175 -195 -225 -270 -300 - - - -169')
};
function check(){
 for(const mass of MASSES){
  const grid=TABLES[mass];
  if(!Array.isArray(grid)||grid.length!==ALT.length||grid.some(row=>row.length!==9||row.some(x=>x!==null&&!Number.isFinite(x))))throw Error('INVALID OEI TABLE '+mass);
 }
}
check();
function locate(arr,value){
 if(!Number.isFinite(value)||value<arr[0]||value>arr.at(-1))return null;
 const idx=arr.indexOf(value);if(idx>=0)return [idx,idx,0];
 for(let i=0;i<arr.length-1;i++)if(value>arr[i]&&value<arr[i+1])return [i,i+1,(value-arr[i])/(arr[i+1]-arr[i])];
 return null;
}
const mix=(a,b,t)=>a+(b-a)*t;
function sample(grid,pa,oat,isa){
 const a=locate(ALT,pa),t=isa?[8,8,0]:locate(TEMP,oat);
 if(!a||!t)return null;
 const row=i=>{
  const x=grid[i][t[0]],y=grid[i][t[1]];
  return x===null||y===null?null:mix(x,y,t[2]);
 };
 const x=row(a[0]),y=row(a[1]);
 return x===null||y===null?null:mix(x,y,a[2]);
}
function validate(v){
 if(!v||!Number.isFinite(v.mass)||v.mass<1700||v.mass>1999)return 'MASSA FORA DAS TABELAS';
 if(!Number.isFinite(v.pa)||v.pa<0||v.pa>18000)return 'ALTITUDE FORA DAS TABELAS';
 if(!v.isa&&(!Number.isFinite(v.oat)||v.oat< -20||v.oat>50))return 'OAT FORA DAS TABELAS';
 if(v.power!==undefined&&v.power!==92)return 'POWER FIXED AT 92%';
 return null;
}
function compute(v){
 const err=validate(v);if(err)return {error:err};
 const m=locate(MASSES,v.mass);
 const a=sample(TABLES[MASSES[m[0]]],v.pa,v.oat,!!v.isa);
 const b=sample(TABLES[MASSES[m[1]]],v.pa,v.oat,!!v.isa);
 if(a===null||b===null)return {error:'SEM DADOS PUBLICADOS NA TABELA'};
 const roc=mix(a,b,m[2]);
 return {main:roc,secondary:roc*0.00508,
  primaryLabel:roc<0?'RATE OF DESCENT':'RATE OF CLIMB',
  caution:roc<50,negative:roc<0,vyse:85,power:92,flaps:'UP',
  gear:'RETRACTED',deadEngine:'FEATHERED / SECURED',experimental:true};
}
const api={ALT,TEMP,MASSES,TABLES,locate,sample,validate,compute};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.OEITables=api;
})(typeof window!=='undefined'?window:globalThis);
