/* DA42 NG AFM §5.3.5 — Wind components.
 * All headings are magnetic or true on a single consistent reference.
 * "Wind direction" is meteorological (the direction FROM which it blows).
 * Signed angle positive to the right of the flight/runway direction.
 * Crosswind component positive FROM RIGHT; negative FROM LEFT.
 * Headwind positive, tailwind negative. Example: 360°, 032°/30kt:
 * crosswind 15.898kt -> 16kt (AFM); headwind 25.441kt -> 25kt.
 * Source chart extends to 40kt wind. Max DEMONSTRATED crosswind is
 * 25kt; that value is NOT asserted as an aircraft operating limit.
 */
(function(root){
'use strict';
const MAX_DEMONSTRATED=25,CHART_MAX_WIND=40;
function normalize(angle){return ((angle+180)%360+360)%360-180}
function validate(v){
 if(!v||!Number.isFinite(v.heading)||!Number.isFinite(v.windDir)||!Number.isFinite(v.windSpeed))return 'COMPLETE OS VALORES';
 if(v.heading<0||v.heading>360||v.windDir<0||v.windDir>360)return 'DIREÇÃO FORA DE 0–360°';
 if(v.windSpeed<0||v.windSpeed>CHART_MAX_WIND)return 'VENTO FORA DA ESCALA 0–40 KT';
 return null;
}
function compute(v){
 const error=validate(v);if(error)return {error};
 const angle=normalize((v.windDir%360)-(v.heading%360));
 const radians=angle*Math.PI/180;
 let crosswind=v.windSpeed*Math.sin(radians);
 let headwind=v.windSpeed*Math.cos(radians);
 if(Math.abs(crosswind)<1e-10)crosswind=0;
 if(Math.abs(headwind)<1e-10)headwind=0;
 const side=crosswind>0?'RIGHT':crosswind<0?'LEFT':'NONE';
 const along=headwind>0?'HEADWIND':headwind<0?'TAILWIND':'NO HEADWIND';
 const magnitude=Math.abs(crosswind);
 return {main:magnitude,secondary:Math.abs(headwind),crosswind,headwind,side,along,angle,
  demonstrated:MAX_DEMONSTRATED,aboveDemonstrated:magnitude>MAX_DEMONSTRATED+1e-9,
  primaryLabel:'CROSSWIND',experimental:false};
}
const api={MAX_DEMONSTRATED,CHART_MAX_WIND,normalize,validate,compute};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WindComponents=api;
})(typeof window!=='undefined'?window:globalThis);
