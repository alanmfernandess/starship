/* DA42 NG — randomized feasible-loading study generator.
 * Suggests hypothetical occupant/baggage masses, NOT actual passenger weights.
 * Fuel, de-icing fluid, empty aircraft mass/moment are always preserved.
 * Not a dispatch, flight, cargo-loading or certification tool.
 */
(function(root){
"use strict";
const ADJUSTABLE=Object.freeze(['pilot','copilot','pax1','pax2','nose','cabin','extension']);
const KEEP=Object.freeze(['mainL','mainR','auxL','auxR','deice','emptyMass','emptyMoment']);
function optimize(profile,engine,options={}){
 if(!engine||typeof engine.calculate!=='function'||!profile)return {ok:false,reason:'MOTOR INDISPONÍVEL'};
 const rng=typeof options.rng==='function'?options.rng:Math.random;
 const attempts=Math.max(1,Math.min(30000,Number.isInteger(options.attempts)?options.attempts:7500));
 const random=(low,high)=>low+Math.floor(Math.max(0,Math.min(.999999999999,rng()))*(high-low+1));
 // Validate all values the search is forbidden to modify. If any fixed input
 // cannot be used, no result is manufactured.
 const safe={...engine.EXAMPLE,...profile};
 for(const key of KEEP){
  if(typeof safe[key]!=='number'||!Number.isFinite(safe[key])||safe[key]<0)
   return {ok:false,reason:'CONFIRA COMBUSTÍVEL, DEGELO E DADOS DA AERONAVE'};
 }
 const preflight=engine.calculate({...safe,pilot:75,copilot:0,pax1:0,pax2:0,nose:0,cabin:0,extension:0});
 if(!preflight.ok)return {ok:false,reason:'COMBUSTÍVEL OU PERFIL FORA DOS LIMITES'};
 const candidates=[];
 let feasible=0;
 for(let i=0;i<attempts;i++){
  const pilot=random(55,110);
  const copilot=rng()<.56?0:random(50,105);
  const pax1=rng()<.58?0:random(35,100);
  const pax2=rng()<.65?0:random(35,100);
  const nose=random(0,30),extension=random(0,18);
  const cabin=random(0,45-extension);
  const suggestion={...safe,pilot,copilot,pax1,pax2,nose,cabin,extension};
  const result=engine.calculate(suggestion);
  if(!result.ok||!result.statuses.massOK||!result.statuses.cgOK||!result.statuses.scenariosOK)continue;
  feasible++;
  const e1=result.zeroFuel,e2=result.takeoff;
  const margin=[e1,e2].map(c=>Math.min(c.cg-c.bounds.forward,c.bounds.aft-c.cg));
  // Favor interior CG and nonempty payload but retain stochastic diversity.
  const passengerCount=1+[copilot>0,pax1>0,pax2>0].filter(Boolean).length;
  const score=1000*Math.min(...margin)+
   Math.min(22,(pilot+copilot+pax1+pax2+nose+cabin+extension)*.085)+
   passengerCount*2.5+rng()*9;
  candidates.push({profile:suggestion,result,score});
  if(candidates.length>90)candidates.sort((a,b)=>b.score-a.score).splice(70);
 }
 if(!candidates.length)return {ok:false,reason:'SEM CONFIGURAÇÃO VÁLIDA COM O COMBUSTÍVEL INFORMADO',attempts,feasible:0};
 candidates.sort((a,b)=>b.score-a.score);
 // Sample randomly among top-feasible options, rather than always returning
 // the exact same maximum of a deterministic score.
 const shortlist=candidates.slice(0,Math.min(18,candidates.length));
 const chosen=shortlist[random(0,shortlist.length-1)];
 const delta={};for(const k of ADJUSTABLE)delta[k]=chosen.profile[k];
 return {ok:true,suggested:delta,result:chosen.result,attempts,feasible,
  simulated:true,notice:'CENÁRIO SIMULADO · NÃO REPRESENTA PESOS REAIS'};
}
const api={optimize,ADJUSTABLE,KEEP};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WBOptimizer=api;
})(typeof window!=='undefined'?window:globalThis);
