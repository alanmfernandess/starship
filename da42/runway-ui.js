/* Aero UI Master Design 1.0 — RUNWAY modal: select and save on Back.
   UI only: calculations remain in runway-analysis.js and takeoff-tables.js. */
(function(){
'use strict';
const CSS="\n.runway-ui.sheet{padding:20px 20px max(22px,env(safe-area-inset-bottom));}\n.runway-ui .sheet-header{position:sticky;top:-20px;background:#17232e;z-index:2}\n.runway-ui .rw-option{display:grid;grid-template-columns:minmax(98px,1fr) minmax(0,1.6fr) 16px;min-height:68px;gap:9px;align-items:center;text-align:left}\n.runway-ui .rw-label{color:#edf5fa;font-size:13px;font-weight:650}\n.runway-ui .rw-value{color:#e8f2f9;text-align:right;font-size:13px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}\n.runway-ui .rw-option .icon{width:18px;color:var(--blue)}\n.runway-ui #rw-weight .rw-label,.runway-ui #rw-weight .rw-value{white-space:nowrap;overflow-wrap:normal}\n.runway-ui #rw-weight .rw-value{font-variant-numeric:tabular-nums}\n.runway-ui .rw-panel{margin:10px 0;padding:15px;border-radius:14px;background:var(--tile)}\n.runway-ui .rw-line{display:flex;align-items:baseline;justify-content:space-between;gap:8px}\n.runway-ui .rw-line label,.runway-ui .rw-panel>label{font-size:13px;color:#edf5fa;font-weight:650}\n.runway-ui .rw-line output{color:#f1f5f9;font-size:14px;font-variant-numeric:tabular-nums}\n.runway-ui input[type=range]{display:block;appearance:none;-webkit-appearance:none;touch-action:pan-y;cursor:pointer;width:100%;height:34px;margin:12px 0 2px;border:0;background:linear-gradient(to right,var(--blue) 0 var(--fill),#405464 var(--fill) 100%) center/100% 5px no-repeat}\n.runway-ui input[type=range].rw-tail{background:linear-gradient(to right,var(--amber) 0 var(--fill),#405464 var(--fill) 100%) center/100% 5px no-repeat}\n.runway-ui input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border:2px solid var(--blue);border-radius:50%;background:#f1f5f9;box-shadow:0 0 0 2px #17232e}\n.runway-ui input[type=range]::-moz-range-thumb{width:18px;height:18px;border:2px solid var(--blue);border-radius:50%;background:#f1f5f9}\n.runway-ui input[type=range]:focus-visible{outline:2px solid var(--blue);outline-offset:2px;border-radius:9px}\n.runway-ui .rw-scale{display:flex;justify-content:space-between;font-size:11px;color:var(--label);font-variant-numeric:tabular-nums}\n.runway-ui input[type=number]{display:block;width:100%;margin:8px 0 0;padding:11px;border:1px solid #466779;border-radius:9px;background:#15232e;color:var(--txt)}\n.runway-ui .rw-flags{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}\n.runway-ui .rw-flags button{min-height:46px;font-size:11px;padding:9px;justify-content:center}\n.runway-ui .rw-flags button:disabled{opacity:.45;cursor:not-allowed}\n.runway-ui .rw-footer{position:sticky;bottom:-24px;z-index:2;background:#17232e;border-top:1px solid var(--line);margin-top:14px;padding:12px 0 max(3px,env(safe-area-inset-bottom));display:grid;grid-template-columns:1fr;gap:10px}\n.runway-ui .rw-footer button{min-height:58px;border-radius:13px;font-size:14px;font-weight:700;letter-spacing:.25px}\n.runway-ui .rw-save-back{background:#243c4d;color:#dcebf4;border:1px solid #456777}\n.runway-ui .rw-error{font-size:12px;line-height:1.5;color:#ffbb9c;margin:10px 0}\n.runway-ui .rw-note{font-size:11px;line-height:1.55;color:var(--label);margin:12px 0}\n.runway-ui .rw-picker .rw-picker-caption{flex:1}\n.runway-ui .rw-picker strong{display:block;font-size:14px}\n.runway-ui .rw-picker{min-height:62px;align-items:center;gap:12px;padding:14px 16px}.runway-ui .rw-picker strong{font-size:14px;font-weight:650;line-height:1.35;letter-spacing:.1px;overflow-wrap:anywhere}\n.runway-ui .rw-back{font-size:24px;line-height:1}\n.runway-ui .rw-context{font-size:11px;color:#91afc2;letter-spacing:.3px;padding:5px 2px 12px}\n.runway-ui .rw-check{color:var(--amber)}\n@media(max-width:355px){.runway-ui .rw-option{grid-template-columns:minmax(86px,1fr) minmax(0,1.4fr) 15px;gap:5px}.runway-ui .rw-label,.runway-ui .rw-value{font-size:12px}}\n";
function open(values,render,icon,escape){
 if(!document.getElementById('runway-ui-css')){
  const style=document.createElement('style');style.id='runway-ui-css';style.textContent=CSS;document.head.appendChild(style);
 }
 const root=document.querySelector('.phone'),overlay=document.createElement('div');
 if(!root)throw Error('DA42 main view not found');
 const state={...values};let view='main',error='';
 overlay.className='sheet-backdrop';
 function close(){document.removeEventListener('keydown',keyHandler);overlay.remove()}
 function saveAndBack(){
  if(state.paMode==='qnh'&&(!Number.isFinite(state.elevation)||state.elevation< -1000||state.elevation>10000||!Number.isFinite(state.qnh)||state.qnh<870||state.qnh>1085))error='FIELD ELEV (−1000 a 10000 FT) e QNH (870 a 1085 HPA) são obrigatórios e devem ser válidos.';
  else if(state.windVerified!==false&&(!Number.isFinite(state.wind)||state.wind< -10||state.wind>20))error='Vento fora da faixa permitida (−10 a +20 KT).';
  else if(state.slopeVerified!==false&&(!Number.isFinite(state.slope)||state.slope<0||state.slope>5))error='Aclive deve estar entre 0 e 5%.';
  else error='';
  if(error){view='main';draw();return}
  Object.assign(values,state);
  close();
  render();
 }
 function keyHandler(e){
  if(e.key==='Escape'){e.preventDefault();if(view==='main')saveAndBack();else go('main')}
  if(e.key==='Tab'){
   const controls=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(x=>x.getClientRects().length>0);
   if(!controls.length)return;
   if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls[controls.length-1].focus()}
   if(!e.shiftKey&&document.activeElement===controls[controls.length-1]){e.preventDefault();controls[0].focus()}
  }
 }
 function go(page){view=page;error='';draw()}
 function windText(w){return w<0?w+' KT · TAILWIND':w>0?'+'+w+' KT · HEADWIND':'0 KT'}
 function surfaceText(){return ({paved:'PAVED · DRY',grass5:'GRASS · 5 CM',grass10:'GRASS · 5–10 CM',grass25:'GRASS · 25 CM'}[state.surface]||'PAVED · DRY')+(state.wet?' · WET':'')+(state.soft?' · SOFT':'')}
 function option(id,label,value){
  return '<button type="button" class="option rw-option" id="rw-'+id+'" aria-label="'+escape(label+': '+value+'. Selecionar opções')+'"><span class="rw-label">'+label+'</span><span class="rw-value">'+escape(value)+'</span>'+icon('next')+'</button>';
 }
 function draw(){
  const titles={main:'RUNWAY',takeoff:'TAKEOFF',weight:'MAX WEIGHT',pressure:'PRESSURE ALT',surface:'RUNWAY SURFACE'};
  const head='<div class="sheet-header">'+'<h2 id="rw-dialog-title">'+titles[view]+'</h2><button type="button" class="close" id="rw-close" aria-label="Cancelar e fechar">×</button></div>';
  let body='';
  if(view==='main'){
   const w=Number(state.wind)||0,fill=Math.max(0,Math.min(100,(w+10)/30*100));
   body='<div class="rw-context">RUNWAY · '+escape(state.runwayId||'NOT IDENTIFIED')+' · '+(state.toraVerified?'TORA VERIFIED':state.lengthEstimated?'RUNWAY LENGTH EST.':'TORA REQUIRED')+'</div>'+
    option('takeoff','TAKEOFF',state.procedure==='short'?'SHORT · APP':'NORMAL · UP')+
    option('weight','MAX WEIGHT',state.maxMass===1999?'1999 KG':'1900 KG')+
    option('pressure','PRESSURE ALT',state.paMode==='qnh'?'QNH + ELEV':'DIRECT')+
    (state.paMode==='qnh'?'<div class="rw-panel"><label for="rw-elevation">FIELD ELEV · FT</label><input type="number" id="rw-elevation" min="-1000" max="10000" step="1" value="'+escape(state.elevation)+'"/></div>'+
     '<div class="rw-panel"><label for="rw-qnh">QNH · HPA</label><input type="number" id="rw-qnh" min="870" max="1085" step="0.01" value="'+escape(state.qnh)+'"/></div>':'')+
    '<div class="rw-panel"><div class="rw-line"><label for="rw-wind">HEADWIND · KT</label><output id="rw-wind-output" for="rw-wind" class="'+(state.windVerified===false?'rw-check':'')+'">'+(state.windVerified===false?'SET WIND':windText(w))+'</output></div>'+
    '<input type="range" id="rw-wind" class="'+(w<0?'rw-tail':'')+'" min="-10" max="20" step="1" value="'+w+'" style="--fill:'+fill+'%" aria-label="Componente do vento na pista; valores negativos significam vento de cauda" />'+
    '<div class="rw-scale"><span>−10</span><span>0</span><span>+10</span><span>+20 KT</span></div></div>'+
    option('surface','RUNWAY',state.surfaceVerified===false?'SELECT SURFACE':surfaceText())+
    '<div class="rw-flags"><button type="button" class="option '+(state.wet?'selected':'')+'" id="rw-wet" '+(state.surface==='paved'?'disabled':'')+'>WET GRASS · '+(state.wet?'ON':'OFF')+'</button>'+
    '<button type="button" class="option '+(state.soft?'selected':'')+'" id="rw-soft" '+(state.surface==='paved'?'disabled':'')+'>SOFT GROUND · '+(state.soft?'ON':'OFF')+'</button></div>'+
    '<div class="slope-control"><div class="slope-head"><label for="rw-slope">UPHILL SLOPE</label><output id="rw-slope-output" for="rw-slope" class="'+(state.slopeVerified===false?'rw-check':'')+'">'+(state.slopeVerified===false?'SET SLOPE':String(Number(state.slope||0)).replace('.',',')+'%')+'</output></div>'+
    '<input id="rw-slope" class="slope-slider" type="range" min="0" max="5" step="0.5" value="'+escape(state.slope||0)+'" style="--fill:'+Number(state.slope||0)*20+'%" aria-label="Aclive de pista em percentual"/>'+
    '<div class="slope-limits"><span>0%</span><span>5%</span></div></div>'+
    (error?'<p class="rw-error" role="alert">'+escape(error)+'</p>':'')+
    '<div class="rw-footer"><button type="button" id="rw-save-back" class="rw-save-back">BACK</button></div>';
  }else{
   const candidates={
    takeoff:[['normal','NORMAL TAKEOFF'],['short','SHORT FIELD']],
    weight:[['1900','1900 KG'],['1999','1999 KG']],
    pressure:[['direct','DIRECT'],['qnh','QNH + ELEV']],
    surface:[['paved','PAVED · DRY'],['grass5','GRASS · 5 CM'],['grass10','GRASS · 5–10 CM'],['grass25','GRASS · 25 CM']]
   }[view];
   const selected=view==='takeoff'?state.procedure:view==='weight'?String(state.maxMass):view==='pressure'?state.paMode:state.surface;
   body=candidates.map(o=>'<button type="button" class="option rw-picker '+(selected===o[0]?'selected':'')+'" data-rw-pick="'+o[0]+'" aria-label="'+escape(o[1])+'"><strong>'+o[1]+'</strong>'+(selected===o[0]?icon('check'):icon('next'))+'</button>').join('')+'<div class="rw-footer"><button type="button" id="rw-back" class="rw-save-back">BACK</button></div>';
  }
  overlay.innerHTML='<section class="sheet runway-ui" role="dialog" aria-modal="true" aria-labelledby="rw-dialog-title">'+head+body+'</section>';
  overlay.querySelector('#rw-close').onclick=()=>view==='main'?saveAndBack():go('main');
  const back=overlay.querySelector('#rw-back');if(back)back.onclick=()=>go('main');
  if(view!=='main'){
   overlay.querySelectorAll('[data-rw-pick]').forEach(b=>b.onclick=()=>{
    const pick=b.dataset.rwPick;
    if(view==='takeoff')state.procedure=pick;
    else if(view==='weight'){state.maxMass=Number(pick)}
    else if(view==='pressure')state.paMode=pick;
    else{state.surface=pick;state.surfaceVerified=true;if(pick==='paved'){state.wet=false;state.soft=false}}
    go('main');
   });
   return;
  }
  [['rw-takeoff','takeoff'],['rw-weight','weight'],['rw-pressure','pressure'],['rw-surface','surface']].forEach(([id,page])=>{
   overlay.querySelector('#'+id).onclick=()=>go(page);
  });
  const wind=overlay.querySelector('#rw-wind');
  wind.oninput=()=>{
   state.wind=Number(wind.value);state.windVerified=true;
   overlay.querySelector('#rw-wind-output').textContent=windText(state.wind);
   wind.style.setProperty('--fill',(state.wind+10)/30*100+'%');
   wind.classList.toggle('rw-tail',state.wind<0);
  };
  const slope=overlay.querySelector('#rw-slope');
  slope.oninput=()=>{
   state.slope=Number(slope.value);state.slopeVerified=true;
   overlay.querySelector('#rw-slope-output').textContent=String(state.slope).replace('.',',')+'%';
   slope.style.setProperty('--fill',state.slope*20+'%');
  };
  [['rw-qnh','qnh'],['rw-elevation','elevation']].forEach(([id,key])=>{
   const field=overlay.querySelector('#'+id);if(field)field.oninput=()=>{
    const str=field.value.trim().replace(',','.');state[key]=str===''?NaN:Number(str);
   };
  });
  [['rw-wet','wet'],['rw-soft','soft']].forEach(([id,key])=>{
   overlay.querySelector('#'+id).onclick=()=>{state[key]=!state[key];draw()};
  });
  overlay.querySelector('#rw-save-back').onclick=saveAndBack;
 }
 overlay.addEventListener('click',e=>{if(e.target===overlay){if(view==='main')saveAndBack();else go('main')}});
 document.addEventListener('keydown',keyHandler);
 root.appendChild(overlay);draw();
 const first=overlay.querySelector('#rw-takeoff');if(first)first.focus({preventScroll:true});
}
window.RunwayUI={open};
})();
