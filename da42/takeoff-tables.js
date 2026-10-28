/* DA42 NG Take-off AFM §5.3.6 user-supplied tables.
 * Reference: 1700/1900/1999 kg, NORMAL UP or SHORT APP; both MAX,
 * paved/dry/level, VR 80/76 KIAS, V50 85/82 KIAS respectively.
 * 1999 kg is SOURCE DATA ONLY; the available aircraft AFM §2.7
 * specifies 1900 kg MTOM. This implementation rejects mass >1900 kg.
 * Experimental calculator, not approved for actual operations.
 */
(function(root){
"use strict";
const ALT=Object.freeze([0,1000,2000,3000,4000,5000,6000,7000,8000,9000,10000]);
const TEMPS=Object.freeze([0,10,20,30,40,50]);
const row=s=>s.trim().split(/\s+/).map(v=>v==='-'?null:Number(v));
const parse=s=>s.trim().split('\n').map(row);
const TABLES={
normal:{
 1700:{
 ground:parse(`
370 400 420 450 500 590 404
400 420 450 490 550 630 427
420 450 480 520 600 690 451
450 480 520 560 650 750 475
480 520 550 610 710 820 503
520 560 600 670 770 - 535
560 600 650 740 850 - 567
600 650 700 810 940 - 604
650 710 770 900 1030 - 644
710 770 850 980 1140 - 693
780 840 940 1090 - - 744`),
 total:parse(`
580 620 660 720 810 950 634
620 660 710 770 880 1040 673
660 710 760 830 960 1140 712
710 760 820 900 1060 1250 753
770 820 880 990 1170 1390 800
820 890 960 1090 1290 - 854
890 970 1050 1220 1440 - 912
970 1060 1150 1360 1620 - 977
1060 1160 1280 1520 1820 - 1050
1170 1280 1430 1720 2080 - 1131
1290 1430 1630 2000 - - 1226`)
 },
 1900:{
 ground:parse(`
420 450 480 510 570 660 458
450 480 510 550 620 720 483
480 510 540 590 670 780 510
510 550 580 630 740 850 539
550 590 630 690 800 930 571
590 630 680 760 880 - 606
630 680 730 840 970 - 645
680 740 800 920 1070 - 685
740 810 880 1020 1180 - 732
810 880 970 1130 1300 - 787
890 960 1070 1250 - - 847`),
 total:parse(`
670 710 760 830 940 1110 734
720 770 820 900 1030 1220 778
770 820 890 970 1130 1350 826
830 890 960 1060 1250 1500 877
890 960 1040 1170 1390 1680 935
960 1040 1130 1300 1550 - 999
1050 1140 1240 1460 1760 - 1072
1150 1250 1380 1650 2000 - 1152
1260 1390 1540 1870 2220 - 1245
1400 1550 1750 2120 2360 - 1351
1570 1760 2010 2260 - - 1477`)
 },
 1999:{
 ground:parse(`
490 530 560 600 670 780 540
530 560 600 650 730 850 570
560 600 640 690 790 920 602
600 640 690 750 870 1010 636
640 690 740 820 950 1100 673
690 750 800 890 1040 - 715
750 800 860 990 1140 - 761
810 870 940 1090 1270 - 808
880 950 1040 1200 1390 - 864
950 1040 1140 1330 1540 - 929
1050 1130 1270 1470 - - 1000`),
 total:parse(`
790 840 900 980 1110 1310 866
840 900 970 1060 1210 1440 918
900 970 1040 1140 1330 1590 975
970 1050 1130 1250 1480 1770 1035
1050 1130 1220 1380 1640 1980 1103
1130 1230 1340 1530 1830 - 1179
1240 1340 1470 1720 2070 - 1265
1350 1470 1620 1940 2360 - 1360
1490 1630 1820 2210 2620 - 1469
1650 1830 2070 2500 2790 - 1595
1850 2080 2370 2660 - - 1743`)
 }
},
short:{
 1700:{
 ground:parse(`
360 380 410 440 490 570 392
390 410 440 470 540 620 415
410 440 470 510 580 680 438
440 470 500 550 640 740 463
470 510 540 600 700 810 491
510 550 590 660 770 - 524
550 590 640 720 840 - 557
590 640 700 810 940 - 595
650 700 770 900 1040 - 636
710 770 850 990 1150 - 686
780 840 950 1110 - - 740`),
 total:parse(`
530 560 600 640 720 840 575
560 600 640 690 780 910 607
600 640 680 740 850 990 640
640 680 730 800 930 1080 675
690 730 790 870 1010 1180 715
740 790 850 950 1110 - 761
790 850 920 1050 1220 - 804
850 920 1000 1160 1350 - 858
930 1010 1100 1280 1500 - 918
1010 1100 1210 1420 1660 - 984
1110 1210 1350 1590 - - 1056`)
 },
 1900:{
 ground:parse(`
410 430 460 500 560 650 445
430 470 500 540 610 710 469
470 500 530 580 660 770 498
500 530 570 630 730 840 527
540 570 620 680 790 930 557
580 620 670 750 870 - 595
620 670 730 830 970 - 634
670 730 790 920 1080 - 676
740 800 880 1020 1190 - 724
810 880 970 1130 1320 - 780
890 960 1080 1270 - - 843`),
 total:parse(`
600 640 680 740 820 960 657
640 680 730 790 900 1040 693
680 730 780 840 970 1140 731
730 780 840 910 1060 1250 775
780 840 900 1000 1170 1370 818
840 910 970 1100 1280 - 870
910 980 1060 1210 1410 - 924
980 1060 1150 1340 1570 - 985
1070 1160 1260 1490 1740 - 1055
1170 1270 1400 1650 1940 - 1133
1280 1400 1570 1860 - - 1221`)
 },
 1999:{
 ground:parse(`
480 510 550 590 660 770 525
510 550 590 630 720 830 554
550 590 630 680 780 910 587
590 630 670 740 860 1000 621
630 680 730 810 940 1090 657
680 730 790 890 1030 - 703
730 790 850 980 1140 - 748
790 860 940 1090 1270 - 798
870 940 1030 1210 1400 - 855
950 1040 1140 1340 1560 - 920
1050 1140 1280 1500 - - 994`),
 total:parse(`
710 750 800 870 970 1130 775
750 810 860 930 1060 1230 817
810 860 920 1000 1150 1340 863
860 920 990 1080 1260 1470 914
920 990 1060 1180 1380 1610 965
990 1070 1150 1290 1510 - 1026
1070 1150 1240 1430 1670 - 1090
1160 1250 1360 1580 1850 - 1162
1260 1370 1490 1750 2050 - 1245
1370 1500 1650 1940 2290 - 1337
1510 1650 1850 2190 - - 1441`)
 }
}};
function checkData(){
 for(const type of ['normal','short'])for(const mass of [1700,1900,1999])for(const metric of ['ground','total']){
  const grid=TABLES[type][mass][metric];
  if(grid.length!==ALT.length||grid.some(row=>row.length!==7||row.some(v=>v!==null&&(!Number.isFinite(v)||v<=0))))throw Error('INVALID AFM TAKEOFF TABLE');
 }
}
checkData();
function locate(arr,v){
 if(v<arr[0]||v>arr.at(-1))return null;
 for(let i=0;i<arr.length-1;i++)if(v<=arr[i+1])return [i,i+1,(v-arr[i])/(arr[i+1]-arr[i])];
 return [arr.length-1,arr.length-1,0];
}
const mix=(a,b,t)=>a+(b-a)*t;
function sample(grid,pa,oat,isa){
 const alt=locate(ALT,pa);if(!alt)return null;
 const temp=isa?[6,6,0]:locate(TEMPS,oat);if(!temp)return null;
 const point=row=>{
  const a=row[temp[0]],b=row[temp[1]];
  return a===null||b===null?null:mix(a,b,temp[2]);
 };
 const a=point(grid[alt[0]]),b=point(grid[alt[1]]);
 return a===null||b===null?null:mix(a,b,alt[2]);
}
function validate(v){
 if(!v||!['normal','short'].includes(v.procedure||'normal'))return 'PROCEDIMENTO INVÁLIDO';
 if(!Number.isFinite(v.mass)||v.mass<1700||v.mass>1900)return 'MASSA FORA DAS TABELAS / MTOW';
 if(!Number.isFinite(v.pa)||v.pa<0||v.pa>10000)return 'ALTITUDE FORA DAS TABELAS';
 if(!v.isa&&(!Number.isFinite(v.oat)||v.oat<0||v.oat>50))return 'OAT FORA DAS TABELAS';
 if(!Number.isFinite(v.wind)||v.wind< -10||v.wind>20)return 'VENTO FORA DO INTERVALO';
 if(v.surface&&!['paved','grass5','grass10','grass25'].includes(v.surface))return 'PISTA NÃO SUPORTADA';
 if(v.wet&&(!v.surface||v.surface==='paved'))return 'PISTA MOLHADA NÃO COBERTA';
 if(v.slope!==undefined&&(!Number.isFinite(v.slope)||v.slope<0||v.slope>5))return 'DECLIVE NÃO DOCUMENTADO';
 if(v.soft&&(!v.surface||v.surface==='paved'))return 'SOLO MACIO EXIGE CONFIGURAÇÃO DE GRAMA';
 return null;
}
function compute(v){
 const err=validate(v);if(err)return {error:err};
 const procedure=v.procedure||'normal',masses=[1700,1900],fraction=(v.mass-1700)/200;
 const values={};
 for(const metric of ['ground','total']){
  const a=sample(TABLES[procedure][1700][metric],v.pa,v.oat,!!v.isa);
  const b=sample(TABLES[procedure][1900][metric],v.pa,v.oat,!!v.isa);
  if(a===null||b===null)return {error:'SEM DADOS PUBLICADOS NA TABELA'};
  values[metric]=mix(a,b,fraction);
 }
 // AFM §5.3.6: 10% reduction per 14kt headwind or 10% increase per 3kt tailwind.
 // The source already incorporates 50% headwind and 150% tailwind component.
 const windFactor=v.wind>=0?1-.10*v.wind/14:1+.10*(-v.wind)/3;
 let ground=values.ground*windFactor,total=values.total*windFactor;
 // AFM specifies grass/soft ground/slope corrections on GROUND ROLL only:
 // increment ground roll, then carry the change to the 50ft total.
 const factors={paved:0,grass5:.10,grass10:.15,grass25:.25};
 const surface=v.surface||'paved',slope=v.slope||0;
 const adjustedGround=ground*(1+factors[surface]+(v.soft?0.45:0)+.12*slope);
 total+=adjustedGround-ground;ground=adjustedGround;
 // AFM: wet grass runway distance increases the dry grass calculation by 10%.
 if(v.wet){ground*=1.10;total*=1.10}
 if(!(ground>0&&total>=ground))return {error:'DISTÂNCIA INVÁLIDA'};
 return {main:total,secondary:ground,primaryLabel:'TAKEOFF DISTANCE',procedure,
  source:{ground:values.ground,total:values.total},windFactor,
  speed:{vr:procedure==='normal'?80:76,v50:procedure==='normal'?85:82},
  experimental:true};
}
const api={ALT,TEMPS,TABLES,locate,sample,validate,compute};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.TakeoffTables=api;
})(typeof window!=='undefined'?window:globalThis);
