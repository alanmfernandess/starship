/* Diamond DA42 NG AFM §5.3.10 Cruise Performance, 1999 kg.
 * Flaps UP, gear retracted, both engines. Each published cell specifies
 * (engine power %, fuel flow US gal/h, true airspeed kt). Engine load
 * power envelope varies by pressure altitude and ΔISA: NO extrapolation.
 * If OÄM 42-278 installed AND OÄM 42-193 NOT installed, apply published
 * 2% performance reduction to TAS only; fuel flow remains the published
 * value. This adjustment is opt-in, and must be confirmed for aircraft.
 * Experimental reference, NOT FOR FLIGHT.
 */
(function(root){
'use strict';
const ALT=[2000,4000,6000,8000,10000,12000,14000,16000,18000];
const DELTA=[-10,0,10,20,30];
const RAW={
 2000:[
 '92 16.5 164;75 13 148;60 10.4 131;45 8.1 106',
 '92 16.5 165;75 13 149;60 10.4 131;45 8.1 106',
 '92 16.5 166;75 13 150;60 10.4 132;45 8.1 106',
 '92 16.5 167;75 13 151;60 10.4 133;45 8.1 107',
 '89 15.9 164;75 13 152;60 10.4 134;45 8.1 107'],
 4000:[
 '92 16.5 166;75 13 150;60 10.4 132;45 8.1 106',
 '92 16.5 167;75 13 151;60 10.4 133;45 8.1 107',
 '92 16.5 168;75 13 152;60 10.4 134;45 8.1 107',
 '92 16.5 169;75 13 153;60 10.4 134;45 8.1 107',
 '89 15.9 166;75 13 154;60 10.4 135;45 8.1 107'],
 6000:[
 '92 16.5 167;75 13 152;60 10.4 133;45 8.1 107',
 '92 16.5 169;75 13 153;60 10.4 134;45 8.1 107',
 '92 16.5 170;75 13 154;60 10.4 135;45 8.1 107',
 '92 16.5 171;75 13 155;60 10.4 136;45 8.1 107',
 '89 15.9 169;75 13 155;60 10.4 137;45 8.1 107'],
 8000:[
 '92 16.5 169;75 13 153;60 10.4 136;45 8.1 114',
 '92 16.5 170;75 13 154;60 10.4 137;45 8.1 114',
 '92 16.5 172;75 13 155;60 10.4 138;45 8.1 114',
 '92 16.5 173;75 13 156;60 10.4 139;45 8.1 115',
 '89 15.9 171;75 13 157;60 10.4 140;45 8.1 115'],
 10000:[
 '92 16.5 171;75 13 155;60 10.4 139;45 8.1 121',
 '92 16.5 172;75 13 156;60 10.4 140;45 8.1 122',
 '92 16.5 174;75 13 157;60 10.4 141;45 8.1 122',
 '92 16.5 175;75 13 158;60 10.4 142;45 8.1 123',
 '90 16.1 174;75 13 160;60 10.4 143;45 8.1 123'],
 12000:[
 '92 16.5 173;75 13 157;60 10.4 143;45 8.1 127',
 '92 16.5 173;75 13 158;60 10.4 144;45 8.1 128',
 '92 16.5 174;75 13 159;60 10.4 144;45 8.1 129',
 '92 16.5 175;75 13 161;60 10.4 145;45 8.1 129',
 '92 16.5 175;75 13 162;60 10.4 146;45 8.1 130'],
 14000:[
 '92 16.5 174;75 13 159;60 10.4 146;45 8.1 133',
 '92 16.5 175;75 13 160;60 10.4 147;45 8.1 134',
 '92 16.5 175;75 13 161;60 10.4 148;50 8.8 136',
 '85 15 170;75 13 163;60 10.4 149;50 8.8 137',
 '80 14 167;75 13 164;60 10.4 150;50 8.8 138'],
 16000:[
 '92 16.5 173;75 13 161;60 10.4 148;50 8.8 137',
 '92 16.5 174;75 13 162;60 10.4 149;50 8.8 138',
 '90 16.1 173;75 13 164;60 10.4 150;50 8.8 139',
 '84 14.8 170;75 13 165;60 10.4 151;50 8.8 139',
 '79 13.8 168;75 13 166;60 10.4 152;50 8.8 140'],
 18000:[
 '85 15 168;75 13 163;60 10.4 150;50 8.8 139',
 '85 15 169;75 13 165;60 10.4 151;50 8.8 140',
 '85 15 170;75 13 166;60 10.4 152;50 8.8 141',
 '80 14 169;75 13 167;60 10.4 153;50 8.8 142',
 '75 13 168;75 13 168;60 10.4 154;50 8.8 142']
};
const TABLES={};
for(const alt of ALT){
 const bands=RAW[alt];
 if(!Array.isArray(bands)||bands.length!==DELTA.length)throw Error('AFM cruise table bands missing '+alt);
 TABLES[alt]=bands.map(str=>str.split(';').map(cell=>cell.trim().split(/\s+/).map(Number)));
 for(const band of TABLES[alt]){
  if(band.length!==4||band.some(row=>row.length!==3||row.some(x=>!Number.isFinite(x))))throw Error('AFM cruise band malformed');
  if(band.some((row,i)=>i>0&&row[0]>band[i-1][0]))throw Error('AFM cruise power must descend');
 }
}
function brackets(arr,value){
 if(!Number.isFinite(value)||value<arr[0]||value>arr.at(-1))return null;
 const i=arr.indexOf(value);if(i>=0)return [i,i,0];
 for(let j=0;j<arr.length-1;j++)if(value>arr[j]&&value<arr[j+1])return [j,j+1,(value-arr[j])/(arr[j+1]-arr[j])];
 return null;
}
const mix=(a,b,t)=>a+(b-a)*t;
const isaAt=pa=>15-.002*pa; // Matches AFM columns: 2000ft=11°C; 10000ft=-5°C
function atPower(rows,load){
 const high=rows[0][0],low=rows.at(-1)[0];
 if(load<low||load>high)return null;
 for(let i=0;i<rows.length;i++)if(load===rows[i][0])return {ff:rows[i][1],tas:rows[i][2],max:high,min:low};
 for(let i=0;i<rows.length-1;i++){
  const upper=rows[i],lower=rows[i+1];
  if(load<upper[0]&&load>lower[0]){
   const t=(upper[0]-load)/(upper[0]-lower[0]);
   return {ff:mix(upper[1],lower[1],t),tas:mix(upper[2],lower[2],t),max:high,min:low};
  }
 }
 return null;
}
function validate(v){
 if(!v||!Number.isFinite(v.pa)||!Number.isFinite(v.oat)||!Number.isFinite(v.load))return 'COMPLETE OS VALORES';
 if(v.pa<2000||v.pa>18000)return 'ALTITUDE FORA DAS TABELAS';
 if(v.load<45||v.load>92)return 'POTÊNCIA FORA DAS TABELAS';
 if(v.mass!==undefined&&v.mass!==1999)return 'TABELAS SOMENTE PARA 1999 KG';
 const deviation=v.oat-isaAt(v.pa);
 if(deviation< -10-1e-8||deviation>30+1e-8)return 'ΔISA FORA DAS TABELAS';
 return null;
}
function compute(v){
 const err=validate(v);if(err)return {error:err};
 const a=brackets(ALT,v.pa),t=brackets(DELTA,v.oat-isaAt(v.pa));
 if(!a||!t)return {error:'SEM DADOS PUBLICADOS NA TABELA'};
 const corner=(i,j)=>atPower(TABLES[ALT[i]][j],v.load);
 const x0=corner(a[0],t[0]),x1=corner(a[0],t[1]),x2=corner(a[1],t[0]),x3=corner(a[1],t[1]);
 if(!x0||!x1||!x2||!x3)return {error:'POTÊNCIA NÃO DISPONÍVEL NESTAS CONDIÇÕES'};
 const blend=key=>mix(mix(x0[key],x1[key],t[2]),mix(x2[key],x3[key],t[2]),a[2]);
 const factor=v.reduced?0.98:1;
 return {main:blend('tas')*factor,secondary:blend('ff'),primaryLabel:'TRUE AIRSPEED',
  availablePower:blend('max'),minimumPower:blend('min'),deltaISA:v.oat-isaAt(v.pa),
  mass:1999,configReduced:!!v.reduced,flaps:'UP',gear:'RETRACTED',experimental:true};
}
const api={ALT,DELTA,TABLES,brackets,isaAt,atPower,validate,compute};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.CruisePerformance=api;
})(typeof window!=='undefined'?window:globalThis);
