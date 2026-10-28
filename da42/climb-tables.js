/* DA42 NG AFM §5.3.7 — all engines operating climb.
 * Both engines 92%, landing gear retracted, IAS Vy: UP 90 KIAS at
 * <=1900 kg, UP 92 KIAS above 1900 kg; APP 85 KIAS.
 * Published 100%-power MSL/ISA notes are NOT part of these 92%-power grids.
 * Reference includes 1999 kg; operational applicability of MÄM 42-678
 * and associated structural limits requires aircraft documentation.
 * Not for actual flight planning.
 */
(function(root){
'use strict';
const ALT=Object.freeze([0,2000,4000,6000,8000,10000,12000,14000,16000,18000]);
const TEMP=Object.freeze([-20,-10,0,10,20,30,40,50]);
const MASSES=Object.freeze([1700,1900,1999]);
const parse=s=>s.trim().split('|').map(str=>str.trim().split(/\s+/).map(v=>v==='-'?null:Number(v)));
const TABLES={
 up:{
 1700:parse('1280 1270 1260 1240 1230 1210 1150 1040 1241|1260 1250 1230 1210 1190 1170 1080 980 1213|1230 1210 1190 1170 1160 1110 1020 910 1183|1190 1170 1150 1140 1120 1050 940 - 1153|1160 1130 1120 1090 1070 970 870 - 1121|1110 1090 1070 1040 990 890 - - 1082|1050 1020 980 940 860 730 - - 1016|980 940 890 820 720 570 - - 954|850 810 760 660 560 - - - 843|720 680 630 500 400 - - - 728'),
 1900:parse('1110 1090 1080 1070 1050 1030 980 890 1065|1080 1070 1050 1040 1020 1000 920 830 1039|1050 1040 1020 1000 980 940 860 760 1010|1020 1000 980 960 950 880 800 - 981|980 960 950 920 900 820 730 - 952|950 920 900 880 830 740 - - 915|890 850 820 790 710 590 - - 854|820 780 740 680 590 450 - - 796|700 660 620 530 440 - - - 695|580 550 500 390 290 - - - 590'),
 1999:parse('1030 1010 1000 980 970 950 900 810 982|1000 990 970 950 940 920 840 760 956|970 950 940 920 900 870 780 690 929|940 920 900 880 860 800 720 - 901|900 880 860 840 820 740 660 - 868|860 840 820 790 750 660 - - 832|800 770 740 710 630 520 - - 772|740 700 660 600 510 380 - - 716|620 580 540 460 370 - - - 614|510 470 420 320 220 - - - 512')
 },
 app:{
 1700:parse('1260 1240 1230 1220 1200 1190 1130 1030 1215|1230 1220 1200 1190 1180 1160 1070 970 1195|1210 1190 1180 1160 1140 1100 1000 900 1169|1180 1160 1140 1120 1100 1030 940 - 1138|1140 1120 1100 1080 1060 970 870 - 1106|1100 1080 1060 1040 990 890 - - 1073|1040 1010 980 940 860 730 - - 1015|980 940 890 830 730 590 - - 953|860 820 770 680 580 - - - 847|730 700 650 530 420 - - - 742'),
 1900:parse('1070 1060 1050 1040 1020 1010 960 870 1034|1050 1040 1020 1010 1000 980 900 810 1014|1020 1010 1000 980 960 920 840 750 989|1000 980 960 940 920 860 780 - 959|960 940 920 910 880 810 720 - 929|920 900 880 860 820 730 - - 897|870 840 810 780 700 590 - - 843|810 770 730 670 590 460 - - 786|700 660 620 540 450 - - - 689|590 550 510 400 310 - - - 592'),
 1999:parse('990 980 970 960 940 930 880 800 953|970 960 940 930 920 900 830 740 934|940 930 920 900 880 850 770 680 909|920 900 880 860 850 790 710 - 880|880 860 840 830 810 730 650 - 850|840 820 810 790 740 660 - - 819|790 770 730 700 630 530 - - 767|730 700 660 600 520 400 - - 711|620 590 550 470 390 - - - 618|520 490 440 340 250 - - - 525')
 }
};
function assertTables(){
 for(const flap of ['up','app'])for(const mass of MASSES){
  const grid=TABLES[flap][mass];
  if(!Array.isArray(grid)||grid.length!==ALT.length||grid.some(row=>row.length!==9||row.some(x=>x!==null&&(!Number.isFinite(x)||x<=0))))throw Error('INVALID CLIMB GRID '+flap+' '+mass);
 }
}
assertTables();
const mix=(a,b,t)=>a+(b-a)*t;
function locate(arr,value){
 if(!Number.isFinite(value)||value<arr[0]||value>arr.at(-1))return null;
 const idx=arr.indexOf(value);
 if(idx>=0)return [idx,idx,0];
 for(let i=0;i<arr.length-1;i++)if(value>arr[i]&&value<arr[i+1])return [i,i+1,(value-arr[i])/(arr[i+1]-arr[i])];
 return null;
}
function sample(grid,pa,oat,isa){
 const aa=locate(ALT,pa),tt=isa?[8,8,0]:locate(TEMP,oat);
 if(!aa||!tt)return null;
 const value=a=>{
  const x=grid[a][tt[0]],y=grid[a][tt[1]];
  return x===null||y===null?null:mix(x,y,tt[2]);
 };
 const x=value(aa[0]),y=value(aa[1]);
 return x===null||y===null?null:mix(x,y,aa[2]);
}
function validate(v){
 if(!v||!['up','app'].includes(v.flaps||'up'))return 'FLAPS INVÁLIDOS';
 if(!Number.isFinite(v.mass)||v.mass<1700||v.mass>1999)return 'MASSA FORA DAS TABELAS';
 if(!Number.isFinite(v.pa)||v.pa<0||v.pa>18000)return 'ALTITUDE FORA DAS TABELAS';
 if(!v.isa&&(!Number.isFinite(v.oat)||v.oat< -20||v.oat>50))return 'OAT FORA DAS TABELAS';
 if(v.power!==undefined&&v.power!==92)return 'POWER FIXED AT 92%';
 return null;
}
function compute(v){
 const err=validate(v);if(err)return {error:err};
 const flaps=v.flaps||'up',bb=locate(MASSES,v.mass);
 const low=sample(TABLES[flaps][MASSES[bb[0]]],v.pa,v.oat,!!v.isa);
 const high=sample(TABLES[flaps][MASSES[bb[1]]],v.pa,v.oat,!!v.isa);
 if(low===null||high===null)return {error:'SEM DADOS PUBLICADOS NA TABELA'};
 const roc=mix(low,high,bb[2]);
 return {main:roc,secondary:roc*0.00508,primaryLabel:'RATE OF CLIMB',
  flaps,vy:flaps==='app'?85:v.mass>1900?92:90,power:92,gear:'retracted',experimental:true};
}
const api={ALT,TEMP,MASSES,TABLES,locate,sample,validate,compute};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ClimbTables=api;
})(typeof window!=='undefined'?window:globalThis);
