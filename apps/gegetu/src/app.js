import sampleRaw from "virtual:samples";
"use strict";
const $=id=>document.getElementById(id);let items=[];const MAX=12;
function jpegData(safe){var b64=safe.replace(/-/g,"+").replace(/_/g,"/");var pad=(4-b64.length%4)%4;if(pad)b64+="====".slice(0,pad);return "data:image/jpeg;base64,"+b64}
const SAMPLES=sampleRaw.map(jpegData);
const SCAPS=["新鲜排骨热油下锅/煎至两面金黄微焦","加姜蒜 大葱 小米辣 香叶/小火翻炒出香味","倒入2勺生抽 1勺老抽、咖喱/5小块冰糖、黑胡椒翻炒","倒入开水焖煮60min","再倒入年糕、一勺辣椒粉/焖煮至年糕变软","撒上青红椒出锅"];
const TPLS=[['auto','智能布局'],['g9','九宫格'],['g4','四宫格'],['lbig','左大右小'],['tbig','上大下小'],['long','竖向长图'],['step','步骤图'],['ba','前后对比'],['list','清单合集'],['card','知识卡片'],['mag','杂志拼版'],['pola','拍立得']];
const TICON={auto:'M3 3h18v8H3zM3 13h8v8H3zM13 13h8v8h-8z',g9:'M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18',g4:'M3 3h18v18H3zM12 3v18M3 12h18',lbig:'M3 3h18v18H3zM14 3v18M14 9h7M14 15h7',tbig:'M3 3h18v18H3zM3 13h18M9 13v8M15 13v8',long:'M7 2h10v20H7zM7 9h10M7 15h10',step:'M3 3h18v18H3zM12 3v18M3 12h18M5.5 5.5h1.5M14.5 5.5h1.5M5.5 14.5h1.5M14.5 14.5h1.5',ba:'M3 5h18v14H3zM12 5v14M6 8h2M15 8h3',list:'M3 3h8v7H3zM13 3h8v7h-8zM3 14h8v7H3zM13 14h8v7h-8zM4 12h6M14 12h6',card:'M3 2h18v20H3zM3 7h18M6 10h4v4H6zM12 11h6M6 16h4v4H6zM12 17h6',mag:'M3 3h18v18H3zM15 3v10M15 8h6M3 13h18M10 13v8',pola:'M4 4l11-1 1 13-11 1zM9 14l11-1 1 8-11 1z'};
const FONT='"PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC",sans-serif';
const THEMES={recipe:{tc:'#ffffff',oc:'#222222',bg:'#ffffff',gap:8,rad:0,fs:7,pos:'bottom',ratio:'1',band:0},
band:{tc:'#222222',oc:'none',bg:'#ffffff',gap:10,rad:0,fs:6,pos:'bottom',ratio:'1',band:1},
xhs:{tc:'#ffffff',oc:'#FF2442',bg:'#fff5f6',gap:14,rad:22,fs:8,pos:'bottom',ratio:'0.75',band:0},
warm:{tc:'#FFF8E7',oc:'#7a4a2a',bg:'#F6EFE6',gap:16,rad:14,fs:7,pos:'bottom',ratio:'1',band:0},
mono:{tc:'#ffffff',oc:'none',bg:'#111111',gap:6,rad:0,fs:6,pos:'center',ratio:'1',band:0}};
const DEF={tpl:'auto',theme:'recipe',stretch:1,cols:'0',ratio:'1',pos:'bottom',fmt:'png',tc:'#ffffff',oc:'#222222',bg:'#ffffff',gap:8,rad:0,fs:7,ow:1536,band:0};
let S=Object.assign({},DEF);
const SW={tc:['#ffffff','#222222','#FFE14D','#FF2442','#FFF8E7'],oc:['none','#222222','#ffffff','#FF2442','#7a4a2a'],bg:['#ffffff','#111111','#fff5f6','#F6EFE6','#EEF3EE']};
let tt;function toast(t,ms){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),ms||1600)}
const icon=n=>`<svg class="i"><use href="#i-${n}"/></svg>`;
const RN={'0':'智能','1':'1 列','2':'2 列','3':'3 列','4':'4 列'},RA={'1':'1:1','0.75':'3:4','1.3333':'4:3'},PN={bottom:'底部',center:'居中',top:'顶部'};
function syncUI(){document.querySelectorAll('.tp').forEach(b=>{b.classList.toggle('on',b.dataset.tpl==(S.tpl||'auto'));b.setAttribute('aria-selected',b.dataset.tpl==(S.tpl||'auto'))});document.querySelectorAll('.seg').forEach(s=>s.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v==String(S[s.dataset.k]))));
document.querySelectorAll('.sw').forEach(s=>{const k=s.dataset.k;s.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v==S[k]));const c=s.querySelector('input');if(S[k]!='none')c.value=S[k]});
document.querySelectorAll('.chip').forEach(b=>b.classList.toggle('on',b.dataset.t==S.theme));
['fs','gap','rad','ow'].forEach(k=>$(k).value=S[k]);$('o-fs').textContent=S.fs+'%';$('o-gap').textContent=S.gap+' px';$('o-rad').textContent=S.rad+' px';$('o-ow').textContent=S.ow+' px';
$('v-layout').textContent=`${RN[S.cols]} · ${RA[S.ratio]}`;$('v-text').textContent=`${PN[S.pos]} · ${S.fs}%`;$('v-color').textContent=S.band?'白底条':(S.oc=='none'?'无描边':'描边');$('v-exp').textContent=`${S.ow}px · ${S.fmt=='png'?'PNG':'JPG'}`}
function set(k,v){S[k]=v;if(!['ow','fmt','theme'].includes(k))S.theme='';save();syncUI();schedule()}
document.querySelectorAll('.sw').forEach(s=>{const k=s.dataset.k;SW[k].forEach(c=>{const b=document.createElement('button');b.dataset.v=c;b.setAttribute('aria-label',c=='none'?'无':c);
b.style.background=c=='none'?'repeating-linear-gradient(45deg,#fff 0 4px,#e5e5e5 4px 8px)':c;b.onclick=()=>set(k,c);s.appendChild(b)});
const l=document.createElement('label');l.className='cp';l.innerHTML='<input type="color" aria-label="自定义颜色">';l.firstChild.oninput=e=>set(k,e.target.value);s.appendChild(l)});
document.querySelectorAll('.seg').forEach(s=>s.addEventListener('click',e=>{const b=e.target.closest('button');if(b)set(s.dataset.k,['stretch','band'].includes(s.dataset.k)?+b.dataset.v:b.dataset.v)}));
['fs','gap','rad','ow'].forEach(k=>$(k).addEventListener('input',()=>set(k,+$(k).value)));
$('tpls').innerHTML=TPLS.map(([id,nm])=>`<button class="tp" role="option" data-tpl="${id}"><span class="b"><svg viewBox="0 0 24 24"><path d="${TICON[id]}"/></svg></span>${nm}</button>`).join('');
$('tpls').addEventListener('click',e=>{const b=e.target.closest('.tp');if(!b)return;S.tpl=b.dataset.tpl;save();syncUI();schedule();const n=TPLS.find(t=>t[0]==S.tpl)[1];if(S.tpl=='card')toast('多写一行作为卡片标题');else toast(n)});
$('chips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;Object.assign(S,THEMES[b.dataset.t]);S.theme=b.dataset.t;save();syncUI();schedule()});
/* sheets */
let openSheet=null;function showSheet(id){openSheet=$(id);$('mask').classList.add('on');openSheet.classList.add('on')}
function hideSheet(){if(!openSheet)return;openSheet.classList.remove('on');$('mask').classList.remove('on');const s=openSheet;openSheet=null;if(s.id=='sheetEd')$('editT').blur()}
$('mask').onclick=hideSheet;
document.querySelectorAll('.sheet .hd').forEach(h=>{let y0=null;h.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;y0=e.clientY;h.setPointerCapture(e.pointerId)});
h.addEventListener('pointermove',e=>{if(y0==null)return;const d=Math.max(0,e.clientY-y0);h.parentNode.style.transform=`translateY(${d}px)`});
h.addEventListener('pointerup',e=>{if(y0==null)return;const d=e.clientY-y0;y0=null;h.parentNode.style.transform='';if(d>60)hideSheet()})});
document.querySelectorAll('.rowi').forEach(r=>r.onclick=()=>{showSheet('sheetSet');setTimeout(()=>{const g=$(r.dataset.g),bd=g.parentNode;bd.scrollTo({top:g.offsetTop-bd.offsetTop,behavior:'smooth'})},50)});
/* images */
function addFiles(files){
  var fs=[], skipped=false;
  Array.prototype.forEach.call(files, function(f){
    var name=f.name||"";
    var ok=(f.type&&f.type.indexOf("image/")===0)||/\.(png|jpe?g|gif|webp)$/i.test(name);
    if(ok) fs.push(f); else skipped=true;
  });
  if(!fs.length){ if(skipped) toast("请选择图片"); return; }
  var room=MAX-items.length;
  if(fs.length>room){ toast("最多 12 张"); fs=fs.slice(0, Math.max(0, room)); }
  if(!fs.length) return;
  if(skipped) toast("已跳过不能拼的文件");
  Promise.all(fs.map(function(f){return new Promise(function(res){
    var r=new FileReader();
    r.onload=function(){ res(r.result); };
    r.onerror=function(){ res(""); };
    r.readAsDataURL(f);
  });})).then(function(srcs){ srcs.forEach(function(s){ if(s) addSrc(s); }); });
}
function addSrc(src,cap){const L=parseLines(),c0=L[items.length];const it={img:null,src,cap:cap!==undefined?cap:(c0&&c0!='-'?c0:'')};items.push(it);const img=new Image();img.onload=()=>{it.img=img;refresh()};img.onerror=()=>{items.splice(items.indexOf(it),1);refresh()};img.src=src}
function loadSamples(){if(items.length&&!confirm('用示例替换当前内容？'))return;items=[];$('caps').value='';SAMPLES.forEach((s,i)=>addSrc(s,SCAPS[i]));toast('已载入示例')}
function syncText(){let a=items.map(i=>i.cap.trim()||'-');while(a.length&&a[a.length-1]=='-')a.pop();const L=parseLines();if(L.length>items.length)a=a.concat(L.slice(items.length));$('caps').value=a.join('\n');lineHint();grow()}
function parseLines(){return $('caps').value.split('\n').map(s=>s.trim()).filter(Boolean)}
function applyText(){const L=parseLines();items.forEach((it,i)=>it.cap=(L[i]&&L[i]!='-'&&L[i]!='－')?L[i]:'');lineHint()}
function lineHint(){const n=parseLines().length,m=items.length,e=$('lc');let h=`<b>${n} 行文字 · ${m} 张图</b>`;
if(m&&n>m)h+=`<span class="w">多出 ${n-m} 行暂不使用</span>`;else if(m&&n<m)h+=`<span class="w">${n?'后 '+(m-n)+' 张图暂无文字':'每行对应一张图'}</span>`;else if(!m&&!n)h='<span>空行会被忽略，写 - 可跳过某张图</span>';e.innerHTML=h}
let dragging=null;
function renderStrip(){const st=$('strip');st.innerHTML='';items.forEach((it,i)=>{const d=document.createElement('div');d.className='tile';d.dataset.i=i;
d.innerHTML=`<img alt="第${i+1}张图片" src="${it.src}"><span class="no">${i+1}</span><button class="x" aria-label="删除第${i+1}张"><span>${icon('x')}</span></button>`;
d.querySelector('.x').onclick=e=>{e.stopPropagation();items.splice(i,1);refresh()};dragify(d,i);st.appendChild(d)});setTimeout(markSel);
if(items.length<MAX){const a=document.createElement('button');a.className='tile add';a.id='addTile';a.innerHTML=`${icon('plus')}<span>${items.length?items.length+'/12':'添加图片'}</span>`;a.onclick=()=>$('file').click();st.appendChild(a)}
else{const a=document.createElement('div');a.className='tile add';a.innerHTML='<span>12/12</span><span>已满</span>';st.appendChild(a)}
$('emptyrow').hidden=!!items.length;$('striphint').hidden=items.length<2}
let selI=-1;
function moveItem(i,dir){const j=i+dir;if(i<0||j<0||j>=items.length)return i;[items[i],items[j]]=[items[j],items[i]];syncText();refresh();return j}
function selTile(i){selI=(selI==i)?-1:i;markSel()}
function markSel(){if(selI>=items.length)selI=-1;document.querySelectorAll('#strip .tile:not(.add)').forEach((t,k)=>t.classList.toggle('sel',k==selI));const m=$('mvbar');m.hidden=selI<0;if(selI<0)return;
$('mvTxt').textContent=`第 ${selI+1} 张`;$('mvL').disabled=selI==0;$('mvR').disabled=selI==items.length-1;const t=$('strip').children[selI];t&&t.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'})}
function dragify(d,i){let lp,sx,sy,active=false,moved=false;const st=$('strip');let raf=0,lastX=0;
const start=(x,y)=>{sx=x;sy=y;moved=false;clearTimeout(lp);lp=setTimeout(()=>{active=true;selI=-1;markSel();d.classList.add('drag');navigator.vibrate&&navigator.vibrate(10)},300)};
const auto=()=>{if(!active){raf=0;return}const sb=st.getBoundingClientRect();let v=0;if(lastX<sb.left+40)v=-10;else if(lastX>sb.right-40)v=10;if(v){st.scrollLeft+=v;over(lastX)}raf=requestAnimationFrame(auto)};
const over=x=>{const tiles=[...st.querySelectorAll('.tile:not(.add)')];for(const t of tiles){if(t==d)continue;const r=t.getBoundingClientRect();if(x>r.left&&x<r.right){const j=tiles.indexOf(t),me=tiles.indexOf(d);st.insertBefore(d,j<me?t:t.nextSibling);break}}};
const move=(x,y,e)=>{if(!active){if(Math.hypot(x-sx,y-sy)>8){moved=true;clearTimeout(lp)}return}e.preventDefault();lastX=x;over(x);if(!raf)raf=requestAnimationFrame(auto)};
const end=tap=>{clearTimeout(lp);if(!active){if(tap&&!moved)selTile(+d.dataset.i);return}active=false;d.classList.remove('drag');const order=[...st.querySelectorAll('.tile:not(.add)')].map(t=>+t.dataset.i);if(order.some((v,k)=>v!=k)){items=order.map(k=>items[k]);syncText()}refresh()};
d.addEventListener('touchstart',e=>{if(e.target.closest('.x'))return;d._t=1;const t=e.touches[0];start(t.clientX,t.clientY)},{passive:true});
d.addEventListener('touchmove',e=>{const t=e.touches[0];move(t.clientX,t.clientY,e)},{passive:false});
d.addEventListener('touchend',e=>{if(e.target.closest('.x'))return;if(!active&&!moved)e.preventDefault();end(true)});d.addEventListener('touchcancel',()=>end(false));
d.addEventListener('mousedown',e=>{if(d._t||e.button||e.target.closest('.x'))return;start(e.clientX,e.clientY);const mm=ev=>move(ev.clientX,ev.clientY,ev),mu=()=>{removeEventListener('mousemove',mm);removeEventListener('mouseup',mu);end(true)};addEventListener('mousemove',mm);addEventListener('mouseup',mu)});
d.addEventListener('contextmenu',e=>e.preventDefault());d.addEventListener('dragstart',e=>e.preventDefault())}
/* layout */
const PLAN={1:[1],2:[2],3:[1,2],4:[2,2],5:[2,3],6:[2,2,2],7:[1,3,3],8:[2,2,2,2],9:[3,3,3],10:[2,4,4],11:[3,4,4],12:[3,3,3,3]};
function plan(n){const c=+S.cols;if(!c)return PLAN[n]||[];const p=[];for(let i=0;i<n;i+=c)p.push(Math.min(c,n-i));return p}
function autoLayout(W){const n=items.length,k0=W/1536,gap=S.gap*k0,ar=+S.ratio,P=plan(n),mx=Math.max(...P),fixed=+S.cols;
const base=(W-gap*(mx+1))/mx/ar,cells=[];let y=gap;
P.forEach(k=>{const slots=(fixed&&!S.stretch)?fixed:k,cw=(W-gap*(slots+1))/slots;const h=(fixed&&S.stretch)?base:Math.min(cw/ar,base*Math.min(mx/k,1.6));
for(let j=0;j<k;j++)cells.push({X:gap+j*(cw+gap),Y:y,cw,ch:h});y+=h+gap});return{cells,H:Math.round(y),rad:S.rad*k0,ar}}
/* templates */
function tplLayout(W){const t=S.tpl||'auto',n=items.length,k=W/1536,g=Math.max(S.gap,8)*k,ar=+S.ratio||1,C=[];let H=0,extra={};
const grid=(cols,y0,from,to,a=ar,x0=g,w=W-2*g)=>{const cw=(w-g*(cols-1))/cols,ch=cw/a;let y=y0;for(let i=from;i<to;i+=cols){const m=Math.min(cols,to-i),off=(w-(m*cw+(m-1)*g))/2;for(let j=0;j<m;j++)C.push({X:x0+off+j*(cw+g),Y:y,cw,ch});y+=ch+g}return y};
if(t=='g9'||t=='g4'){H=grid(t=='g9'?3:2,g,0,n,1)}
else if(t=='lbig'){const r=Math.min(n-1,3);if(!r){H=grid(1,g,0,1)}else{const bw=(W-3*g)*.62,sw=W-3*g-bw,sh=(bw/.8-g*(r-1))/r;C.push({X:g,Y:g,cw:bw,ch:bw/.8});for(let i=0;i<r;i++)C.push({X:2*g+bw,Y:g+i*(sh+g),cw:sw,ch:sh});H=grid(3,2*g+bw/.8,r+1,n)}}
else if(t=='tbig'){const cw=W-2*g;C.push({X:g,Y:g,cw,ch:cw*.66});const m=n-1;H=m?grid(m<=3?m:m==4?2:3,2*g+cw*.66,1,n):3*g/1.5+cw*.66;if(!m)H=2*g+cw*.66}
else if(t=='long'){let y=g;items.forEach(it=>{const cw=W-2*g,ch=Math.min(cw*it.img.height/it.img.width,cw*1.6);C.push({X:g,Y:y,cw,ch});y+=ch+g});H=y}
else if(t=='step'){H=grid(n<=4?(n==1?1:2):n<=9?3:3,g,0,n,ar);C.forEach((c,i)=>c.num=i+1)}
else if(t=='ba'){let y=g;const lab=['前','后'];for(let i=0;i<n;i+=2){const m=Math.min(2,n-i),cw=(W-g*(m+1))/m,ch=(W-3*g)/2/.8;for(let j=0;j<m;j++)C.push({X:g+j*(cw+g),Y:y,cw,ch,tag:m==2?lab[j]:''});y+=ch+g}H=y}
else if(t=='list'){const cols=n<=2?n:n<=6?2:3,cw=(W-g*(cols+1))/cols,th=cw*.26,ch=cw*.85;let y=g;for(let i=0;i<n;i+=cols){const m=Math.min(cols,n-i),off=(W-(m*cw+(m+1)*g))/2;for(let j=0;j<m;j++)C.push({X:g+off+j*(cw+g),Y:y,cw,ch,below:th,num:i+j+1,lnum:1});y+=ch+th+g}H=y}
else if(t=='card'){const L=parseLines(),title=(L[n]&&L[n]!='-')?L[n]:'今日要点',hh=W*.17;extra.head={h:hh,title};const iw=W*.4,rh=iw*.75;let y=hh+g;for(let i=0;i<n;i++){C.push({X:g*2,Y:y,cw:iw,ch:rh,right:W-iw-g*5,num:i+1});y+=rh+g*1.5}H=y+g}
else if(t=='mag'){let y=g,i=0,s=0;while(i<n){const m=n-i;if(m>=3){const bw=(W-3*g)*.64,sw=W-3*g-bw,bh=bw*.95,sh=(bh-g)/2,L0=s%2==0;C.push({X:L0?g:2*g+sw,Y:y,cw:bw,ch:bh});for(let j=0;j<2;j++)C.push({X:L0?2*g+bw:g,Y:y+j*(sh+g),cw:sw,ch:sh});i+=3;y+=bh+g;s++}else{y=grid(m,y,i,n,m==1?1.4:1);i=n}}H=y}
else if(t=='pola'){const cols=n<=2?n:n<=6?2:3,p=g*1.6,cw=(W-p*(cols+1))/cols,ch=cw*.9,fb=cw*.24;let y=p;for(let i=0;i<n;i+=cols){const m=Math.min(cols,n-i),off=(W-(m*cw+(m+1)*p))/2;for(let j=0;j<m;j++){const ii=i+j;C.push({X:p+off+j*(cw+p)+cw*.06,Y:y+cw*.06,cw:cw*.88,ch,frame:{X:p+off+j*(cw+p),Y:y,w:cw,h:ch+cw*.12+fb},below:fb,rot:((ii%3)-1)*1.6*Math.PI/180})}y+=ch+cw*.12+fb+p}H=y}
return{cells:C,H:Math.round(H),rad:(t=='pola'?0:S.rad)*k,ar,extra,k}}
function wrapText(x,s,w,max){const out=[];let cur='';for(const ch of s){if(x.measureText(cur+ch).width>w&&cur){out.push(cur);cur=ch;if(out.length==max)break}else cur+=ch}if(out.length<max&&cur)out.push(cur);return out}
function layout(W){return (S.tpl&&S.tpl!='auto')?tplLayout(W):autoLayout(W)}
function rr(x,X,Y,w,h,r){x.beginPath();if(x.roundRect)x.roundRect(X,Y,w,h,r);else x.rect(X,Y,w,h)}
let lastL=null,lastC=null;
function draw(W){if(!items.length||items.some(i=>!i.img))return null;const L=layout(W),ar=L.ar,rad=L.rad,k=W/1536,t=S.tpl||'auto';if(W==1536)lastL=L;
const c=document.createElement('canvas');c.width=W;c.height=L.H;const x=c.getContext('2d');x.fillStyle=t=='pola'&&S.bg=='#ffffff'?'#F4F1EC':S.bg;x.fillRect(0,0,W,L.H);
const dark=['#111111','#000000'].includes(S.bg),ink=dark?'#f2f2f2':'#222',sub=dark?'#aaa':'#666';
if(L.extra&&L.extra.head){const h=L.extra.head;x.fillStyle='#FF2442';x.fillRect(0,0,W,h.h);x.fillStyle='#fff';let fs=h.h*.36;x.font=`bold ${fs}px ${FONT}`;const mw=x.measureText(h.title).width;if(mw>W*.86){fs*=W*.86/mw;x.font=`bold ${fs}px ${FONT}`}x.textAlign='left';x.textBaseline='middle';x.fillText(h.title,W*.07,h.h/2)}
items.forEach((it,i)=>{const cell=L.cells[i];if(!cell)return;const {X,Y,cw,ch}=cell,im=it.img,tw=Math.min(cw,ch*ar);x.save();
if(cell.frame){const f=cell.frame;x.translate(f.X+f.w/2,f.Y+f.h/2);x.rotate(cell.rot||0);x.translate(-(f.X+f.w/2),-(f.Y+f.h/2));x.shadowColor='rgba(0,0,0,.18)';x.shadowBlur=24*k;x.shadowOffsetY=6*k;x.fillStyle='#fff';x.fillRect(f.X,f.Y,f.w,f.h);x.shadowColor='transparent'}
x.save();rr(x,X,Y,cw,ch,rad);x.clip();
const s=Math.max(cw/im.width,ch/im.height),sw=cw/s,sh=ch/s;x.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,X,Y,cw,ch);x.restore();
const raw=it.cap.split(/[\/|｜]/).map(s=>s.trim()).filter(Boolean);
if(cell.tag){const fs=cw*.07,p=fs*.5;x.font=`bold ${fs}px ${FONT}`;const w=x.measureText(cell.tag).width+p*2;x.fillStyle=cell.tag=='后'?'#FF2442':'rgba(0,0,0,.6)';rr(x,X+p*1.4,Y+p*1.4,w,fs+p*1.2,fs);x.fill();x.fillStyle='#fff';x.textAlign='left';x.textBaseline='middle';x.fillText(cell.tag,X+p*2.4,Y+p*1.4+(fs+p*1.2)/2)}
if(cell.num&&!cell.lnum&&!cell.right){const r=Math.max(tw*.075,22*k);x.fillStyle='#FF2442';x.beginPath();x.arc(X+r*1.4,Y+r*1.4,r,0,7);x.fill();x.fillStyle='#fff';x.font=`bold ${r*1.1}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(cell.num,X+r*1.4,Y+r*1.45)}
if(cell.below!=null&&cell.below){const by=Y+ch,bh=cell.frame?cell.frame.Y+cell.frame.h-by:cell.below;let fs=Math.min(bh*.3,cw*.075);x.textBaseline='middle';
if(cell.lnum){x.fillStyle='#FF2442';x.font=`bold ${fs}px ${FONT}`;x.textAlign='left';const ns=String(cell.num).padStart(2,'0');x.fillText(ns,X,by+bh*.5);const nw=x.measureText(ns).width+fs*.5;x.fillStyle=ink;x.font=`${fs}px ${FONT}`;const ls=wrapText(x,raw.join(' '),cw-nw,2);ls.forEach((l,j)=>x.fillText(l,X+nw,by+bh*.5+(j-(ls.length-1)/2)*fs*1.3))}
else{x.fillStyle='#333';x.font=`${fs}px ${FONT}`;x.textAlign='center';const ls=wrapText(x,raw.join(' '),cw*.94,2);ls.forEach((l,j)=>x.fillText(l,X+cw/2,by+bh*.5+(j-(ls.length-1)/2)*fs*1.35))}
x.restore();return}
if(cell.right){const rx=X+cw+L.k*40,rw=cell.right;let fs=60*L.k;x.textAlign='left';x.textBaseline='top';x.fillStyle='#FF2442';x.font=`bold ${fs*1.1}px ${FONT}`;x.fillText(String(cell.num).padStart(2,'0'),rx,Y+fs*.3);
x.fillStyle=ink;x.font=`bold ${fs}px ${FONT}`;const [h0,...rest]=raw;const l1=wrapText(x,h0||'',rw,2);l1.forEach((l,j)=>x.fillText(l,rx,Y+fs*1.8+j*fs*1.35));x.fillStyle=sub;x.font=`${fs*.8}px ${FONT}`;wrapText(x,rest.join(' '),rw,3).forEach((l,j)=>x.fillText(l,rx,Y+fs*1.9+l1.length*fs*1.35+j*fs*1.15));x.restore();return}
x.save();rr(x,X,Y,cw,ch,rad);x.clip();
const lines=raw.slice(0,3);
if(lines.length){let fs=Math.max(tw*S.fs/100,34*k);x.font=`bold ${fs}px ${FONT}`;const mw=Math.max(...lines.map(l=>x.measureText(l).width));if(mw>cw*.9){fs*=cw*.9/mw;x.font=`bold ${fs}px ${FONT}`}
const lh=fs*1.28,tot=lh*lines.length,pad=fs*.5;let y0=S.pos=='top'?Y+pad:S.pos=='center'?Y+(ch-tot)/2:Y+ch-tot-pad;
if(S.band){x.fillStyle='rgba(255,255,255,.9)';const by=S.pos=='top'?Y:y0-pad*.6;x.fillRect(X,by,cw,tot+pad*1.2+(S.pos=='center'?0:pad*.4))}
x.textAlign='center';x.textBaseline='top';x.lineJoin='round';
lines.forEach((l,j)=>{const ty=y0+j*lh+fs*.08,tx=X+cw/2;if(S.oc!='none'){x.shadowColor='rgba(0,0,0,.4)';x.shadowBlur=fs*.25;x.strokeStyle=S.oc;x.lineWidth=Math.max(2,fs*.16);x.strokeText(l,tx,ty);x.shadowBlur=0}
else if(!S.band){x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=fs*.3}x.fillStyle=S.tc;x.fillText(l,tx,ty);x.shadowBlur=0})}
x.restore();x.restore()});return c}
let rt;function schedule(){clearTimeout(rt);rt=setTimeout(render,120)}
function paint(cv,c){cv.width=c.width;cv.height=c.height;cv.getContext('2d').drawImage(c,0,0)}

var STORE_KEY = "collage.settings";
var storeReady = false;
var storeMode = "memory";
var dirty = false;
var saveTimer = 0;
var saveChain = Promise.resolve();
var busy = false;

function readBuildVersion(options) {
  var env = options && options.miniToolEnv;
  var value = Number(env && env.buildVersion);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getClientVersion() {
  var xhs = window.xhs;
  var build = readBuildVersion(xhs && xhs.launchOptions);
  var api = xhs && xhs.miniTool;
  if (build || !api || typeof api.getLaunchOptions !== "function") {
    return Promise.resolve(Math.floor(build / 1000));
  }
  return api.getLaunchOptions().then(function (options) {
    return Math.floor(readBuildVersion(options) / 1000);
  }, function () { return 0; });
}

function parseStored(data) {
  if (data == null || data === "") return null;
  var obj = typeof data === "string" ? JSON.parse(data) : data;
  if (!obj || typeof obj !== "object") return null;
  return obj;
}

function applySettings(obj) {
  var next = Object.assign({}, DEF);
  Object.keys(DEF).forEach(function (key) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) return;
    var value = obj[key];
    if (value == null) return;
    if (typeof DEF[key] === "number") {
      var num = Number(value);
      if (!Number.isFinite(num)) return;
      next[key] = num;
    } else {
      next[key] = String(value);
    }
  });
  if (next.fmt !== "png" && next.fmt !== "jpeg") next.fmt = "png";
  if (next.ow < 720) next.ow = 720;
  if (next.ow > 4096) next.ow = 4096;
  S = next;
}

function readLocalRaw() {
  try { return localStorage.getItem(STORE_KEY); }
  catch (error) { return null; }
}

function persistNow(json) {
  var api = window.xhs && window.xhs.miniTool;
  if (storeMode === "native") {
    if (!api || typeof api.setStorage !== "function") return Promise.resolve(false);
    return api.setStorage({ key: STORE_KEY, data: json }).then(function () { return true; });
  }
  if (storeMode === "local") {
    try { localStorage.setItem(STORE_KEY, json); return Promise.resolve(true); }
    catch (error) { return Promise.resolve(false); }
  }
  return Promise.resolve(false);
}

function schedulePersist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    var json = JSON.stringify(S);
    saveChain = saveChain.then(function () { return persistNow(json); }).then(function (ok) {
      if (!ok) toast("设置没有保存成功");
    }, function () { toast("设置没有保存成功"); });
  }, 240);
}

function save() {
  dirty = true;
  if (!storeReady || storeMode === "memory") return;
  schedulePersist();
}

function initStore() {
  return getClientVersion().then(function (version) {
    var api = window.xhs && window.xhs.miniTool;
    var migrated = false;
    var chain = Promise.resolve();
    if (version >= 9460) {
      if (!api || typeof api.getStorage !== "function" || typeof api.setStorage !== "function") {
        storeMode = "memory";
        toast("这个版本暂时存不了设置，刷新后会回到默认样式");
      } else {
        storeMode = "native";
        chain = api.getStorage({ key: STORE_KEY }).then(function (res) {
          var parsed = parseStored(res && res.data);
          if (parsed) {
            if (!dirty) applySettings(parsed);
          } else if (!dirty) {
            var legacyObj = null;
            try { legacyObj = parseStored(readLocalRaw()); }
            catch (error) { legacyObj = null; }
            if (legacyObj) { applySettings(legacyObj); migrated = true; }
          }
        });
      }
    } else {
      storeMode = "local";
      chain = Promise.resolve().then(function () {
        var obj = null;
        try { obj = parseStored(readLocalRaw()); }
        catch (error) { obj = null; }
        if (obj && !dirty) applySettings(obj);
      });
    }
    return chain.then(function () { return migrated; }, function () {
      toast("没能读出上次的设置，先用当前样式");
      return false;
    });
  }, function () {
    storeMode = "local";
    return false;
  }).then(function (migrated) {
    storeReady = true;
    syncUI();
    refresh();
    if (dirty && storeMode !== "memory") schedulePersist();
    if (!migrated || storeMode !== "native") return;
    return persistNow(JSON.stringify(S)).then(function (ok) {
      if (!ok) { toast("设置没有保存成功"); return; }
      try { localStorage.removeItem(STORE_KEY); } catch (error) {}
    }, function () { toast("设置没有保存成功"); });
  });
}

function render() {
  var c = draw(1536), cv = $("cv");
  lastC = c;
  $("pempty").hidden = !!c;
  cv.style.display = c ? "block" : "none";
  var has = !!c && !busy;
  ["dl", "post", "pvbtn", "vsave"].forEach(function (id) {
    var el = $(id);
    if (el) el.disabled = !has;
  });
  if (!c) { $("info").textContent = ""; return; }
  paint(cv, c);
  $("info").textContent = items.length + " 张 · " + c.width + "×" + c.height;
  var found = null;
  items.some(function (item) { if (item.cap) { found = item; return true; } return false; });
  var first = found ? found.cap.split(/[\/|｜]/)[0] : "";
  $("mtitle").textContent = first || "我的拼图";
  if ($("view").classList.contains("on")) paint($("vcv"), c);
}

function clipChars(text, max) {
  var chars = Array.from(text);
  if (chars.length <= max) return text;
  return chars.slice(0, max).join("");
}

function noteTitle() {
  var lines = parseLines();
  var i, part;
  for (i = 0; i < lines.length; i++) {
    if (lines[i] === "-" || lines[i] === "－") continue;
    part = lines[i].split(/[\/|｜]/)[0].replace(/\s+/g, " ").trim();
    if (part) return clipChars(part, 20);
  }
  return "我的拼图";
}

function noteBody() {
  return $("caps").value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function canvasURL(canvas) {
  if (S.fmt === "jpeg") return canvas.toDataURL("image/jpeg", 0.92);
  return canvas.toDataURL("image/png");
}

function exportPath(canvas) {
  var dataURI = canvasURL(canvas);
  if (!dataURI || dataURI.indexOf("data:image/") !== 0) {
    return Promise.reject({ errMsg: "这张图无法导出，请重新选择图片" });
  }
  var api = window.xhs && window.xhs.miniTool;
  if (api && typeof api.writeTempFile === "function") {
    return api.writeTempFile({ data: dataURI }).then(function (file) {
      if (!file || !file.filePath) throw { errMsg: "临时图片生成失败" };
      return file.filePath;
    });
  }
  return Promise.resolve(dataURI);
}

function runExport(action) {
  if (busy) return;
  var canvas = draw(+S.ow);
  if (!canvas) { toast("先添加图片"); return; }
  var api = window.xhs && window.xhs.miniTool;
  if (action === "save") {
    if (!api || typeof api.saveImageToPhotosAlbum !== "function") {
      toast("请在小红书里打开，才能保存到相册");
      return;
    }
  } else if (!api || typeof api.postNote !== "function") {
    toast("请在小红书里打开，才能发笔记");
    return;
  }
  busy = true;
  render();
  var full = noteBody();
  var content = clipChars(full, 1000);
  var clipped = content.length !== full.length;
  toast(action === "save" ? "正在保存…" : "正在准备笔记…", 8000);
  exportPath(canvas).then(function (filePath) {
    if (action === "save") {
      return api.saveImageToPhotosAlbum({ filePath: filePath }).then(function () {
        toast("已保存到相册");
      });
    }
    var payload = { title: noteTitle(), mediaInfo: { image_resources: [{ url: filePath }] } };
    if (content) payload.content = content;
    return api.postNote(payload).then(function () {
      toast(clipped ? "正文已按 1000 字截断，并已提交发布。是否通过审核以小红书为准" : "已提交发布。是否通过审核以小红书为准", 2800);
    });
  }).catch(function (err) {
    var msg = err && (err.errMsg || err.message);
    if (action === "save") toast(msg || "保存未完成，请检查相册权限后重试");
    else toast(msg || "没有发出，拼图还在，可以重试");
  }).then(function () {
    busy = false;
    render();
  });
}

function applyChromePad() {
  var probe = document.createElement("div");
  probe.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;height:0;padding:0;padding-top:constant(safe-area-inset-top);padding-top:env(safe-area-inset-top)";
  document.body.appendChild(probe);
  var sat = probe.offsetHeight || 0;
  probe.parentNode.removeChild(probe);
  var top = Math.max(sat, 76) + 12;
  document.documentElement.style.setProperty("--page-top", top + "px");
}

function bindViewport() {
  applyChromePad();
  if (!window.visualViewport) return;
  var vv = window.visualViewport;
  var apply = function () {
    var offset = window.innerHeight - vv.height - vv.offsetTop;
    if (!Number.isFinite(offset) || offset < 80) offset = 0;
    document.documentElement.style.setProperty("--kb", offset + "px");
    var cap = Math.min(window.innerHeight * 0.82, vv.height - 16);
    if (cap < 220) cap = 220;
    document.documentElement.style.setProperty("--sheet-max", Math.round(cap) + "px");
  };
  vv.addEventListener("resize", apply);
  vv.addEventListener("scroll", apply);
  apply();
}

function grow(){const t=$('caps');t.style.height='auto';t.style.height=t.scrollHeight+'px'}
function refresh(){renderStrip();if(document.activeElement!==$('caps'))syncText();else lineHint();schedule()}
let ct;$('caps').addEventListener('input',()=>{grow();clearTimeout(ct);ct=setTimeout(()=>{applyText();render()},150)});
/* viewer + edit */
function openView(){if(!lastC)return;paint($('vcv'),lastC);$('vinfo').textContent=`${items.length} 张`;$('view').classList.add('on')}
$('ph').onclick=openView;$('pvbtn').onclick=openView;$('vclose').onclick=()=>$('view').classList.remove('on');
let editI=-1;
$('vcv').addEventListener('click',e=>{if(!lastL)return;const r=e.target.getBoundingClientRect(),k=1536/r.width,px=(e.clientX-r.left)*k,py=(e.clientY-r.top)*k;
const i=lastL.cells.findIndex(c=>px>=c.X&&px<=c.X+c.cw&&py>=c.Y&&py<=c.Y+c.ch);if(i<0)return;editI=i;$('edTitle').textContent=`第 ${i+1} 张图的文字`;
$('editT').value=items[i].cap.replace(/\s*[\/|｜]\s*/g,'\n');$('edL').disabled=i==0;$('edR').disabled=i==items.length-1;showSheet('sheetEd');setTimeout(()=>$('editT').focus(),260)});
$('editT').addEventListener('input',e=>{if(editI<0)return;items[editI].cap=e.target.value.split('\n').map(s=>s.trim()).filter(Boolean).join('/');syncText();schedule()});
$('edOk').onclick=hideSheet;
$('mvL').onclick=()=>{selI=moveItem(selI,-1);markSel()};$('mvR').onclick=()=>{selI=moveItem(selI,1);markSel()};$('mvOk').onclick=()=>{selI=-1;markSel()};
const edMv=dir=>{if(editI<0)return;editI=moveItem(editI,dir);$('edTitle').textContent=`第 ${editI+1} 张图的文字`;$('edL').disabled=editI==0;$('edR').disabled=editI==items.length-1;setTimeout(()=>lastC&&paint($('vcv'),lastC),200)};$('edL').onclick=()=>edMv(-1);$('edR').onclick=()=>edMv(1);
/* misc */
$('sample').onclick=$('sample2').onclick=loadSamples;
$('file').onchange=e=>{addFiles(e.target.files);e.target.value=''};
document.addEventListener('dragover',e=>{e.preventDefault();const a=$('addTile');a&&a.classList.add('over')});
document.addEventListener('dragleave',e=>{if(!e.relatedTarget){const a=$('addTile');a&&a.classList.remove('over')}});
document.addEventListener('drop',e=>{e.preventDefault();const a=$('addTile');a&&a.classList.remove('over');if(e.dataTransfer.files.length)addFiles(e.dataTransfer.files)});

$("setDone").addEventListener("click", hideSheet);
$("dl").addEventListener("click", function(){ runExport("save"); });
$("vsave").addEventListener("click", function(){ runExport("save"); });
$("post").addEventListener("click", function(){ runExport("post"); });
$("clear").addEventListener("click", function(){
  if(!items.length && !$("caps").value) return;
  if(!confirm("清空所有图片和文字？")) return;
  items=[]; $("caps").value=""; refresh(); toast("已清空");
});
$("caps").addEventListener("focus", function(){
  setTimeout(function(){
    try { $("caps").scrollIntoView({block:"center"}); }
    catch (error) { $("caps").scrollIntoView(true); }
  }, 280);
});
syncUI();
refresh();
bindViewport();
initStore();
