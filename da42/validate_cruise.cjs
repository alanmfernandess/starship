// Control points digitized separately from calibration anchors. Not flight certification.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const dom={innerHTML:'',classList:{toggle(){}},addEventListener(){}};
const document={querySelector(){return dom},querySelectorAll(){return []}};
const ctx={document,localStorage:{getItem(){return null},setItem(){}},navigator:{},location:{protocol:'file:'},console};
ctx.window=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);
const f=ctx.AeroCalc.compute;
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'chart_holdouts.json'),'utf8'));
const errors=[];
for(const p of data.samples){
 const oat=15-.0019812*p.pa+p.isaDelta;
 const r=f('cruise',{pa:p.pa,oat,load:p.load,engines:2});
 assert.ok(!r.error,'Unexpected domain rejection: '+JSON.stringify(p));
 const reference=120+(p.xPixel-data.xAt120Kt)*60/(data.xAt180Kt-data.xAt120Kt);
 const error=r.main-reference;
 errors.push(error);
 assert.ok(Math.abs(error)<=.75,'Chart holdout exceeds ±0.75 KTAS: '+JSON.stringify({...p,computed:r.main,reference,error}));
}
const max=Math.max(...errors.map(Math.abs)),mae=errors.reduce((a,x)=>a+Math.abs(x),0)/errors.length;
console.log('PASS: '+errors.length+' off-anchor chart holdouts; max '+max.toFixed(3)+' KTAS; MAE '+mae.toFixed(3)+' KTAS. Raster-reading uncertainty excluded; not certified.');
