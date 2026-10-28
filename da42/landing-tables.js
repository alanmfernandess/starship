/* DA42 NG AFM §5.3.11 — Landing distances (m) for LDG and abnormal APP/UP.
 * Source: user-supplied official AFM tables, 1700 / 1900 / 1999 kg.
 * Each row = Ground Roll [OAT 0,10,20,30,40,50,ISA] /
 *            Distance over 15 m / 50 ft [same columns].
 * x marks diagonal-slash unavailable AFM cells; NO extrapolation.
 * Reference hard, dry, level, 0 wind, both engines IDLE.
 * Headwind: -10% per 14 kt, tailwind: +10% per 3 kt on both distances.
 * Wet pavement: +15% whole distance. Grass length and wet/soft, downslope:
 * correction to ground roll, plus same difference to total over obstacle.
 * All numbers are tabulated, but combinations of correction factors and
 * interpolation remain experimental. NOT FOR FLIGHT.
 */
(function(root){
'use strict';
const ALT=Object.freeze([0,1000,2000,3000,4000,5000,6000,7000,8000,9000,10000]);
const MASS=Object.freeze([1700,1900,1999]);
const OAT=Object.freeze([0,10,20,30,40,50]);
const RAW={
landing:{
 1700:[
'320 330 340 360 380 430 335 / 550 570 590 600 650 730 575',
'330 350 360 370 400 460 345 / 570 590 600 620 680 760 589',
'350 360 370 380 430 480 356 / 590 610 620 640 710 800 603',
'360 370 380 400 450 500 364 / 610 630 640 670 750 840 619',
'370 380 400 420 470 530 376 / 630 640 660 700 790 880 635',
'380 400 410 440 500 x 388 / 640 670 680 740 830 x 651',
'400 410 430 470 530 x 397 / 670 690 710 770 870 x 668',
'420 430 450 500 560 x 416 / 690 720 740 820 920 x 691',
'450 460 480 550 610 x 441 / 730 760 790 890 990 x 729',
'490 500 530 600 680 x 477 / 780 810 860 960 1070 x 773',
'530 550 600 670 x x 521 / 840 870 930 1050 x x 826'],
 1900:[
'350 370 380 390 420 480 369 / 600 610 630 650 700 780 618',
'370 380 390 410 450 500 381 / 610 630 650 670 730 820 634',
'380 390 410 420 470 530 390 / 630 650 670 690 770 860 650',
'390 410 420 440 500 550 402 / 650 670 690 720 810 900 667',
'410 420 440 460 520 580 415 / 670 690 710 760 850 950 684',
'420 440 450 490 550 x 426 / 700 720 740 800 890 x 702',
'440 450 470 520 580 x 439 / 720 740 760 840 940 x 720',
'460 480 490 550 620 x 456 / 750 770 800 890 990 x 749',
'490 510 530 600 670 x 484 / 790 820 850 960 1070 x 786',
'530 550 580 660 730 x 519 / 840 870 920 1030 1150 x 831',
'570 590 640 720 x x 561 / 900 930 1000 1120 x x 882'],
 1999:[
'370 380 400 410 440 500 386 / 620 640 660 680 730 820 645',
'380 400 410 420 470 520 398 / 640 660 680 700 760 860 661',
'400 410 420 440 490 550 407 / 660 680 700 720 800 900 678',
'410 430 440 460 520 580 420 / 680 700 720 750 840 940 695',
'430 440 460 480 540 610 434 / 700 720 750 790 890 990 713',
'440 460 470 510 580 x 445 / 720 750 770 830 930 x 732',
'460 480 490 540 610 x 459 / 750 770 790 870 970 x 751',
'480 500 510 580 650 x 477 / 780 800 830 920 1030 x 778',
'510 530 550 630 700 x 506 / 820 850 880 990 1110 x 816',
'550 570 610 680 760 x 541 / 870 900 950 1070 1190 x 860',
'590 620 660 750 x x 582 / 930 960 1030 1160 x x 911']
},
abnormal:{
 1700:[
'440 460 470 490 530 590 461 / 750 770 800 820 880 980 781',
'460 470 490 510 560 620 475 / 770 800 820 840 920 1030 799',
'470 490 510 520 590 660 490 / 800 820 850 870 970 1080 819',
'490 510 530 550 620 690 503 / 820 850 870 900 1020 1130 840',
'510 530 540 580 650 730 518 / 850 870 900 950 1070 1190 861',
'530 550 570 610 690 x 532 / 870 900 930 1000 1120 x 885',
'550 570 590 640 720 x 549 / 900 930 960 1050 1180 x 907',
'580 600 620 690 770 x 575 / 940 970 1000 1120 1250 x 942',
'620 640 670 750 840 x 611 / 1000 1030 1080 1210 1350 x 998',
'670 690 740 830 930 x 659 / 1070 1110 1170 1320 1470 x 1061',
'730 760 820 920 x x 714 / 1160 1200 1290 1440 x x 1141'],
 1900:[
'490 500 520 540 580 650 508 / 820 840 870 890 960 1070 849',
'500 520 540 560 610 690 522 / 840 870 890 920 1010 1120 871',
'520 540 560 580 650 720 538 / 870 890 920 950 1060 1180 893',
'540 560 580 600 680 760 552 / 890 920 950 980 1110 1240 917',
'560 580 600 640 710 800 569 / 920 950 980 1040 1160 1300 940',
'580 600 620 670 750 x 587 / 950 980 1010 1090 1220 x 963',
'600 620 640 710 790 x 603 / 980 1010 1050 1140 1280 x 990',
'630 650 680 760 850 x 630 / 1030 1060 1090 1220 1360 x 1027',
'670 700 730 820 920 x 669 / 1090 1120 1170 1310 1470 x 1082',
'730 750 800 900 1010 x 714 / 1160 1200 1270 1420 1590 x 1147',
'790 810 880 990 x x 769 / 1250 1280 1380 1550 x x 1224'],
 1999:[
'510 530 540 560 610 680 529 / 860 880 910 930 1010 1130 892',
'530 540 560 580 640 720 546 / 880 910 940 960 1050 1180 913',
'540 560 580 600 670 760 562 / 910 940 970 990 1110 1240 936',
'560 580 600 630 710 790 577 / 940 970 990 1030 1160 1300 961',
'580 610 630 660 750 840 595 / 970 1000 1030 1090 1220 1360 984',
'600 630 650 700 790 x 612 / 1000 1030 1060 1140 1280 x 1011',
'630 650 670 740 830 x 631 / 1030 1060 1100 1200 1340 x 1037',
'660 680 700 790 880 x 656 / 1080 1110 1140 1280 1430 x 1078',
'700 730 760 860 960 x 695 / 1140 1170 1220 1370 1530 x 1133',
'750 780 830 930 1040 x 742 / 1210 1250 1320 1490 1660 x 1196',
'810 840 910 1020 x x 795 / 1300 1340 1440 1610 x x 1273']
}};
const TABLES={};
const numbers=str=>str.trim().split(/\s+/).map(t=>t==='x'?null:Number(t));
for(const kind of ['landing','abnormal']){
 TABLES[kind]={};
 for(const mass of MASS){
  TABLES[kind][mass]=RAW[kind][mass].map(s=>{
   const parts=s.split('/');
   if(parts.length!==2)throw Error('malformed landing table');
   return parts.map(numbers);
  });
  if(TABLES[kind][mass].length!==ALT.length)throw Error('incomplete table '+kind+'/'+mass);
  for(const [g,total] of TABLES[kind][mass]){
   if(g.length!==7||total.length!==7)throw Error('malformed temperature count');
   for(let i=0;i<7;i++){
    if((g[i]===null)!==(total[i]===null))throw Error('crossed AFM cell');
    if(g[i]!==null&&(!Number.isFinite(g[i])||!Number.isFinite(total[i])||total[i]<=g[i]))throw Error('invalid landing distance');
   }
  }
 }
}
const mix=(a,b,t)=>a+(b-a)*t;
function bracket(xs,x){
 if(!Number.isFinite(x)||x<xs[0]||x>xs.at(-1))return null;
 const i=xs.indexOf(x);if(i>=0)return [i,i,0];
 for(let j=0;j<xs.length-1;j++)if(x>xs[j]&&x<xs[j+1])return [j,j+1,(x-xs[j])/(xs[j+1]-xs[j])];
 return null;
}
const isaAt=pa=>15-.002*pa;
function validate(v){
 if(!v||!Number.isFinite(v.pa)||!Number.isFinite(v.mass)||!Number.isFinite(v.wind))return 'COMPLETE OS VALORES';
 if(!Number.isFinite(v.oat)&&!v.isa)return 'COMPLETE OS VALORES';
 if(!bracket(ALT,v.pa))return 'ALTITUDE FORA DA TABELA';
 if(!bracket(MASS,v.mass))return 'MASSA FORA DA TABELA';
 if(!v.isa&&!bracket(OAT,v.oat))return 'OAT FORA DA TABELA';
 if(v.wind< -10||v.wind>20)return 'VENTO FORA DOS LIMITES';
 const surface=v.surface||'paved';
 if(!['paved','grass5','grass10','grass25'].includes(surface))return 'SUPERFÍCIE INVÁLIDA';
 if(!Number.isFinite(v.slope??0)||(v.slope??0)<0||(v.slope??0)>5)return 'DECLIVE FORA DO CONTROLE';
 if(surface==='paved'&&v.soft)return 'TERRENO MACIO EXIGE GRAMA';
 if(v.wet&&surface==='paved'&&v.soft)return 'CONDIÇÃO INCOMPATÍVEL';
 return null;
}
function raw(kind,v){
 const a=bracket(ALT,v.pa),m=bracket(MASS,v.mass),t=v.isa?[6,6,0]:bracket(OAT,v.oat);
 if(!a||!m||!t)return null;
 const read=(mi,ai,k)=>{
  const rows=TABLES[kind][MASS[mi]][ai][k];
  if(rows[t[0]]===null||rows[t[1]]===null)return null;
  return mix(rows[t[0]],rows[t[1]],t[2]);
 };
 const at=(mi,k)=>{
  const v0=read(mi,a[0],k),v1=read(mi,a[1],k);
  if(v0===null||v1===null)return null;
  return mix(v0,v1,a[2]);
 };
 const g0=at(m[0],0),g1=at(m[1],0),d0=at(m[0],1),d1=at(m[1],1);
 if([g0,g1,d0,d1].some(v=>v===null))return null;
 return {ground:mix(g0,g1,m[2]),total:mix(d0,d1,m[2])};
}
function compute(kind,v){
 if(!['landing','abnormal'].includes(kind))return {error:'CONFIGURAÇÃO INVÁLIDA'};
 const error=validate(v);if(error)return {error};
 const result=raw(kind,v);if(!result)return {error:'CÉLULA NÃO PUBLICADA NO AFM'};
 const surface=v.surface||'paved',slope=v.slope||0;
 const windFactor=v.wind>=0?1-v.wind*.1/14:1+(-v.wind)*.1/3;
 const pavementFactor=surface==='paved'&&v.wet?1.15:1;
 const grass=surface==='grass5'?.10:surface==='grass10'?.15:surface==='grass25'?.25:0;
 const additional=grass+(surface!=='paved'&&(v.wet||v.soft)?.10:0)+.09*slope;
 // First apply wind correction to both published base distances.
 // Add ground roll penalties to the total obstacle distance, preserving
 // unchanged airborne segment. Wet paved adjustment is for whole distance.
 const ground=result.ground*windFactor*pavementFactor*(1+additional);
 const total=(result.total+result.ground*additional)*windFactor*pavementFactor;
 if(!Number.isFinite(ground)||!Number.isFinite(total)||ground<=0||total<ground)return {error:'RESULTADO FORA DOS LIMITES'};
 return {main:total,secondary:ground,primaryLabel:'LANDING DISTANCE',
  baseGround:result.ground,baseTotal:result.total,
  windFactor,pavementFactor,grassFactor:additional,
  vref:kind==='landing'?(v.mass>1900?86:84):(v.mass>1900?92:86),
  flaps:kind==='landing'?'LDG':'APP / UP',power:'IDLE',
  experimental:true};
}
const api={ALT,MASS,OAT,TABLES,isaAt,validate,raw,compute};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.LandingTables=api;
})(typeof window!=='undefined'?window:globalThis);
