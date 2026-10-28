/* DA42 NG AFM §5.3.9 Time, Fuel and Distance to Climb.
   Cumulative entries at ISA. Time in min, usable climb fuel in US gal,
   horizontal distance in NM, from SL to listed altitude. Both engines
   92%, Flaps UP, gear retracted, Vy 90 KIAS up to 1900kg and 92 above.
   Excludes start/taxi/takeoff fuel. No wind correction. Experimental.
 */
(function(root){
'use strict';
const ALT=Object.freeze([0,2000,4000,6000,8000,10000,12000,14000,16000,18000]);
const MASSES=Object.freeze([1700,1900,1999]);
const parse=s=>s.split('|').map(row=>row.trim().split(/\s+/).map(Number));
// Each row: TAS [kt], ROC [ft/min], time [min], fuel [US gal], distance [NM].
const TABLES={
 1700:parse('90 1240 0 0 0|91 1225 2 .5 2|93 1215 3 .9 5|94 1200 5 1.4 8|96 1185 7 1.9 11|97 1165 9 2.4 14|99 1145 10 2.9 17|100 1125 12 3.4 21|102 1095 14 4.0 25|104 1060 17 4.6 29'),
 1900:parse('90 1065 0 0 0|91 1050 2 .5 3|93 1040 4 1.1 6|94 1025 6 1.6 9|96 1010 8 2.2 13|97 995 10 2.8 16|99 975 12 3.4 20|100 955 15 4.0 24|102 930 17 4.7 29|104 895 20 5.4 35'),
 1999:parse('92 980 0 0 0|93 970 2 .6 3|95 955 4 1.2 7|96 940 6 1.8 10|98 930 9 2.4 14|99 910 11 3.1 18|101 895 13 3.7 23|102 875 16 4.4 27|104 845 19 5.2 33|106 815 22 6.0 39')
};
for(const mass of MASSES){
 const rows=TABLES[mass];
 if(rows.length!==10||rows.some(row=>row.length!==5||row.some(v=>!Number.isFinite(v)||v<0)))throw Error('INVALID AFM CLIMB TIME GRID');
 for(let i=1;i<rows.length;i++)for(const col of [2,3,4])if(rows[i][col]<rows[i-1][col])throw Error('NONMONOTONE CLIMB TOTAL');
}
const mix=(a,b,t)=>a+(b-a)*t;
function bracket(list,x){
 if(!Number.isFinite(x)||x<list[0]||x>list.at(-1))return null;
 const exact=list.indexOf(x);if(exact>=0)return [exact,exact,0];
 for(let i=0;i<list.length-1;i++)if(x>list[i]&&x<list[i+1])return [i,i+1,(x-list[i])/(list[i+1]-list[i])];
 return null;
}
function cumulative(mass,alt){
 const m=bracket(MASSES,mass),a=bracket(ALT,alt);if(!m||!a)return null;
 const at=(mi,j)=>mix(TABLES[MASSES[mi]][a[0]][j],TABLES[MASSES[mi]][a[1]][j],a[2]);
 return [0,1,2,3,4].map(j=>mix(at(m[0],j),at(m[1],j),m[2]));
}
function isaAt(alt){return 15-0.002*alt} // AFM's 2°C / 1000 ft tabulation
function validate(v){
 if(!v||!Number.isFinite(v.start)||!Number.isFinite(v.target)||v.start<0||v.target>18000||v.target<=v.start)
  return 'ALTITUDES INVÁLIDAS / FORA DA TABELA';
 if(!Number.isFinite(v.mass)||v.mass<1700||v.mass>1999)return 'MASSA FORA DA TABELA';
 if(!Number.isFinite(v.oat)||v.oat< -50||v.oat>50)return 'OAT INVÁLIDA';
 if(!Number.isFinite(isaAt(v.start)))return 'ALTITUDE INVÁLIDA';
 const delta=v.oat-isaAt(v.start);
 // Limited scope of conservative hot-weather tabular correction.
 // No unsupported cold-temperature credit is applied.
 if(delta>30)return 'OAT ACIMA DO DOMÍNIO EXPERIMENTAL';
 return null;
}
function compute(v){
 const error=validate(v);if(error)return {error};
 const from=cumulative(v.mass,v.start),to=cumulative(v.mass,v.target);
 if(!from||!to)return {error:'DADO NÃO PUBLICADO'};
 const tempDeviation=v.oat-isaAt(v.start);
 // AFM: +10% to time, fuel and distance per +10°C OAT.
 // The reference rows are ISA. No reduction for colder-than-ISA air.
 const factor=1+Math.max(0,tempDeviation)*.01;
 const time=(to[2]-from[2])*factor;
 const fuel=(to[3]-from[3])*factor;
 const distance=(to[4]-from[4])*factor;
 if(time<=0||fuel<0||distance<0)return {error:'INTERVALO DE SUBIDA INVÁLIDO'};
 return {main:time,secondary:fuel,distance,primaryLabel:'TIME TO CLIMB',
  departure:from,arrival:to,correction:factor,deltaISA:tempDeviation,
  speed:v.mass>1900?92:90,flaps:'UP',power:92,gear:'RETRACTED',experimental:true};
}
const api={ALT,MASSES,TABLES,cumulative,isaAt,validate,compute};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.TimeToClimb=api;
})(typeof window!=='undefined'?window:globalThis);
