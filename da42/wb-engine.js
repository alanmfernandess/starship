/* DA42 NG Weight & Balance — AFM 7.01.15-E Rev.1 §§2.7,2.8,6.4.
 * Example values are manufacturer's published example, not aircraft-specific.
 * Engineering demonstration only; not approved for operational loading.
 */
(function(root){
"use strict";
const ARMS=Object.freeze({pilot:2.30,copilot:2.30,pax1:3.25,pax2:3.25,nose:0.60,cabin:3.89,extension:4.54,main:2.63,aux:3.20,deice:1.00});
const MASS=Object.freeze({minimum:1510,zeroFuel:1765,takeoff:1900,normalLanding:1805,rampConditional:1908,nose:30,cabin:45,extension:18,cabinPlusExtension:45,mainTank:79.5,auxTank:42});
const FUEL_DENSITY=0.84;
const EXAMPLE=Object.freeze({
 emptyMass:1450,emptyMoment:3488,pilot:80,copilot:80,pax1:0,pax2:0,
 nose:0,cabin:10,extension:8,deice:27.5,
 mainL:79.5,mainR:79.5,auxL:42,auxR:42
});
const INPUTS=Object.keys(EXAMPLE);
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function cgBounds(m){
 if(!finite(m)||m<1510||m>1900)return null;
 return {
  forward:2.357+(2.418-2.357)*(m-1510)/(1900-1510),
  aft:m<=1700?2.460+(2.480-2.460)*(m-1510)/(1700-1510):2.480
 };
}
function condition(mass,moment){
 const cg=mass>0?moment/mass:null,range=cgBounds(mass);
 return {mass,moment,cg,bounds:range,
  minMassOK:mass>=MASS.minimum,
  takeoffMassOK:mass<=MASS.takeoff,
  cgOK:!!range&&cg>=range.forward-1e-10&&cg<=range.aft+1e-10};
}
function validate(p){
 const errors=[];
 for(const key of INPUTS){
  const v=p[key];
  if(!finite(v)||v<0)errors.push(key.toUpperCase()+' INVALID');
 }
 if(errors.length)return errors;
 if(p.emptyMass<=0)errors.push('EMPTY MASS INVALID');
 if(p.nose>MASS.nose)errors.push('NOSE BAGGAGE > 30 KG');
 if(p.cabin>MASS.cabin)errors.push('CABIN BAGGAGE > 45 KG');
 if(p.extension>MASS.extension)errors.push('EXTENSION > 18 KG');
 if(p.cabin+p.extension>MASS.cabinPlusExtension)errors.push('CABIN + EXTENSION > 45 KG');
 for(const key of ['mainL','mainR','auxL','auxR']){
  const max=key.startsWith('main')?MASS.mainTank:MASS.auxTank;
  if(p[key]>max+1e-6)errors.push(key.toUpperCase()+' EXCEEDS AFM REFERENCE CAPACITY');
 }
 return errors;
}
function calculate(input){
 const p={...EXAMPLE,...input};
 const errors=validate(p);
 if(errors.length)return {ok:false,errors,profile:p};
 const nonfuel=['pilot','copilot','pax1','pax2','nose','cabin','extension','deice'];
 const emptyMass=p.emptyMass,emptyMoment=p.emptyMoment;
 const baseMass=emptyMass+nonfuel.reduce((s,k)=>s+p[k],0);
 const baseMoment=emptyMoment+nonfuel.reduce((s,k)=>s+p[k]*ARMS[k],0);
 const zeroFuel=condition(baseMass,baseMoment);
 function withFuel(main,aux,deice=p.deice){
  return condition(baseMass-p.deice+deice+main+aux,
    baseMoment-p.deice*ARMS.deice+deice*ARMS.deice+main*ARMS.main+aux*ARMS.aux);
 }
 const main=p.mainL+p.mainR,aux=p.auxL+p.auxR;
 const takeoff=withFuel(main,aux);
 const scenarios=[
  {name:'FUEL EMPTY · DE-ICE EMPTY',...withFuel(0,0,0)},
  {name:'FUEL FULL · DE-ICE EMPTY',...withFuel(MASS.mainTank*2,MASS.auxTank*2,0)},
  {name:'FUEL EMPTY · DE-ICE LOADED',...withFuel(0,0,p.deice)},
  {name:'FUEL FULL · DE-ICE LOADED',...withFuel(MASS.mainTank*2,MASS.auxTank*2,p.deice)}
 ];
 const baggageOK=p.nose<=30&&p.cabin<=45&&p.extension<=18&&p.cabin+p.extension<=45;
 const zeroFuelMassOK=zeroFuel.mass<=MASS.zeroFuel;
 const takeoffMassOK=takeoff.mass<=MASS.takeoff&&takeoff.mass>=MASS.minimum;
 const cgOK=zeroFuel.cgOK&&takeoff.cgOK;
 const massOK=zeroFuelMassOK&&takeoffMassOK&&baggageOK;
 const checkScenarios=scenarios.every(c=>c.cgOK&&c.mass<=MASS.takeoff&&c.mass>=MASS.minimum);
 return {ok:true,errors:[],profile:p,zeroFuel,takeoff,scenarios,
  fuel:{main,aux,usableTotal:main+aux,litres:(main+aux)/FUEL_DENSITY},
  statuses:{cgOK,massOK,zeroFuelMassOK,takeoffMassOK,baggageOK,scenariosOK:checkScenarios},
  dataSource:'AFM 7.01.15-E Rev.1 example; replace empty mass and moment for specific aircraft'};
}
const api={ARMS,MASS,FUEL_DENSITY,EXAMPLE,INPUTS,cgBounds,validate,calculate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WBEngine=api;
})(typeof window!=='undefined'?window:globalThis);
