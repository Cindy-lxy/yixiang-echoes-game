'use strict';
const ASSET_BASE=new URL('assets/',document.currentScript.src||location.href).href;
const $=s=>document.querySelector(s);
const clone=x=>JSON.parse(JSON.stringify(x));
const SAVE_KEY='vn:'+GAME_ID+':v3-cross-memory';
const speakerName=s=>({'我':'◇ 我','蒋麟':'✦ 蒋麟','男生':'✦ 男生','周启明':'✦ 周启明','系统':'— 系统'}[s]||s);
const speakerClass=s=>({'我':'me','蒋麟':'him','男生':'him','周启明':'him'}[s]||'system');
function canonicalText(el){return L10n.source(el)||el.textContent||'';}
function appendTextWithNames(parent,text){return L10n.append(parent,text);}
const fresh=()=>({schemaVersion:3,storyRevision:3,routeRevision:1,notebookRevision:1,notebookFormat:2,diaryRevision:1,caseDiary:{},caseProgress:{},taskStep:{},ch:0,phase:'intro',cursor:0,inv:[],selected:null,flags:{loop:0},chatProgress:{},chatChoices:{},unlocked:0,log:[],seen:[],notebook:[],personalNotes:'',ending:null,endings:[],checkpoints:{},field:null,reprise:null,nightReplay:null,nightReplayRevision:1,repriseCounts:{},fieldCheckpoints:{},fieldDone:{},memories:{me:[],karwin:[]},memoryBase:{me:[],karwin:[]},recognized:false,lastRewind:null,pendingRewind:false,hintRead:{},dayWindowRevision:1,rewindFloorDay:18,dayStarts:{},oldcaseRevision:2});
let rewinding=false;
let state=fresh(),storageOK=true;
function sanitizeNarrativePayload(x){
 if(typeof updatedNarrativeText!=='function')return x;
 const walk=v=>{
  if(typeof v==='string')return updatedNarrativeText(v);
  if(Array.isArray(v))return v.map(walk).filter(item=>!item||typeof item!=='object'||item.text!=='');
  if(v&&typeof v==='object'){for(const k of Object.keys(v))if(k!=='personalNotes')v[k]=walk(v[k]);}
  return v;
 };
 walk(x);
 if(Array.isArray(x.notebook))x.notebook=x.notebook.filter(n=>n&&n.title&&String(n.text||'').trim()&&!/^(?:这一轮由(?:女主|男主)触发回溯。|你们已经相认，也互相确认了轮回。)/.test(n.text));
 return x;
}

function toast(t){const e=$('#toast');L10n.set(e,t);e.style.whiteSpace='pre-line';e.classList.add('show');clearTimeout(e.timer);const len=t.length;e.timer=setTimeout(()=>e.classList.remove('show'),Math.max(1800,Math.min(4000,len*30)));}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){if(storageOK)toast('浏览器无法保存，当前进度仅在本页保留');storageOK=false;}}
function load(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;const x=sanitizeNarrativePayload(JSON.parse(raw));
 if(![2,3].includes(x.storyRevision)&&x.schemaVersion===3){
  if(x.ch>=5){
   if(!x.checkpoints||!x.checkpoints[5])throw Error('missing checkpoint');
   const cp=clone(x.checkpoints[5]);const archive={notebook:Array.isArray(x.notebook)?x.notebook:[],personalNotes:typeof x.personalNotes==='string'?x.personalNotes:''};
   Object.assign(x,cp,archive);x.ch=5;x.phase='intro';x.cursor=0;x.unlocked=5;x.ending=null;x.selected=null;x.pendingRewind=false;x.lastRewind=null;
   for(const k of Object.keys(x.checkpoints))if(Number(k)>5)delete x.checkpoints[k];
   x.migrationNotice=true;
  }
  x.storyRevision=3;x.caseProgress={};
 }
 x.caseProgress=x.caseProgress||{};
 x.repriseCounts=x.repriseCounts||{};x.reprise=x.reprise||null;
 x.hintRead=x.hintRead&&typeof x.hintRead==='object'?x.hintRead:{};x.pendingRewind=false;
 normalizeDaySave(x);normalizeNightReplay(x);
 x.fieldCheckpoints=x.fieldCheckpoints&&typeof x.fieldCheckpoints==='object'?x.fieldCheckpoints:{};x.fieldDone=x.fieldDone&&typeof x.fieldDone==='object'?x.fieldDone:{};x.taskStep=x.taskStep&&typeof x.taskStep==='object'?x.taskStep:{};
 if(x.storyRevision===2){for(const c of CHAPTERS){if(c.task?.kind==='sequence'&&x.ch>=CHAPTERS.indexOf(c)){x.taskStep[c.id]=1;x.fieldDone.handover=true;}}x.storyRevision=3;}
 if(x.field&&(!fieldScene(x.field.id)||fieldScene(x.field.id).chapter!==CHAPTERS[x.ch]?.id))throw Error('invalid field save');
 if(x.field){const f=x.field;if(f.stage==='recall'){f.stage='intro';f.index=0;}if(!f.stage){f.stage=f.failed?'failure':f.escaped?'success':!f.seen?'recall':!f.taken?'takeChoice':f.synced?'route':'communicateChoice';f.index=0;}if(f.stage==='recall'){f.stage='intro';f.index=0;}if(!['recall','recap','intro','observeChoice','finding','takeChoice','take','communicateChoice','discussion','route','success','failure'].includes(f.stage))throw Error('invalid field stage');f.index=Number.isInteger(f.index)?f.index:0;}
 for(const [i,cp] of Object.entries(x.checkpoints||{})){cp.fieldDone=cp.fieldDone||{};cp.fieldCheckpoints=cp.fieldCheckpoints||{};cp.taskStep=cp.taskStep||{};}
 x.notebook=Array.isArray(x.notebook)?x.notebook.filter(n=>n&&n.title&&n.text):[];
 x.personalNotes=typeof x.personalNotes==='string'?x.personalNotes:'';
 if(x.notebookRevision!==1)x.notebookRevision=1;
 if(x.routeRevision!==1){if(x.ch===1){x.phase='intro';x.cursor=0;x.selected=null;}x.routeRevision=1;}
 const c=CHAPTERS[x.ch];if(x.schemaVersion!==3||!Number.isInteger(x.ch)||!c||!['intro','task','outro','end'].includes(x.phase)||!Number.isInteger(x.cursor)||x.cursor<0||!Array.isArray(x.inv)||!Array.isArray(x.log)||!Array.isArray(x.seen)||!Array.isArray(x.endings)||!x.flags||!x.chatProgress||!x.chatChoices||!x.checkpoints)throw Error('save');
 if(['intro','outro'].includes(x.phase)&&x.cursor>=c[x.phase].length)throw Error('cursor');
 if(x.phase==='end'&&!ENDINGS.some(e=>e.id===x.ending))throw Error('ending');MemoryRules.init(x);ensureLateShared(x);normalizeCaseDiary(x);state=x;hydrateNotebook();return true;
 }catch(e){toast('存档不可用，可从头开始');return false;}}
function ensureOldCaseNotes(s){
 const late=CHAPTERS.findIndex(c=>c.id==='invest');
 const reached=s.ch>=late||s.reprise?.fieldChapter>=late;
 if(s.oldcaseRevision!==2){
  const clearOldCase=book=>Array.isArray(book)?book.filter(n=>!(n.type==='oldcase'&&/(?::oldcase:(?:cafe|invest):)/.test(n.key||''))):book;
  s.notebook=clearOldCase(s.notebook);
  for(const cp of Object.values(s.checkpoints||{}))cp.notebook=clearOldCase(cp.notebook);
  if(reached){
   for(const key of ['cafe','invest']){
    const fullKey=(s.flags?.loop||0)+':oldcase:'+key+':migration-v2';
    if(!s.notebook.some(n=>n.key===fullKey))s.notebook.push({key:fullKey,type:'oldcase',loop:s.flags?.loop||0,chapter:key==='cafe'?'追踪前夜':'追踪',time:key==='cafe'?'九月二十日 · 下午':'九月二十一日 · 下午',title:OLD_CASE_CONTEXT.title,text:OLD_CASE_CONTEXT.notes[key]});
   }
  }
  s.oldcaseRevision=2;
 }
 const cafeIndex=CHAPTERS.findIndex(c=>c.id==='cafe');
 const heardCafe=s.ch>cafeIndex||(s.ch===cafeIndex&&s.cursor>=22);
 const activeKey=heardCafe?(s.ch===cafeIndex?'cafe':'cafe'):null;
 if(heardCafe&&!s.notebook.some(n=>n.type==='oldcase'&&n.key?.includes(':oldcase:cafe:')))s.notebook.push({key:(s.flags?.loop||0)+':oldcase:cafe:v2',type:'oldcase',loop:s.flags?.loop||0,chapter:'追踪前夜',time:'九月二十日 · 下午',title:OLD_CASE_CONTEXT.title,text:OLD_CASE_CONTEXT.notes.cafe});
 if(reached&&!s.notebook.some(n=>n.type==='oldcase'&&n.key?.includes(':oldcase:invest:')))s.notebook.push({key:(s.flags?.loop||0)+':oldcase:invest:v2',type:'oldcase',loop:s.flags?.loop||0,chapter:'追踪',time:'九月二十一日 · 下午',title:OLD_CASE_CONTEXT.title,text:OLD_CASE_CONTEXT.notes.invest});
}
function ensureLateShared(s){
 const late=CHAPTERS.findIndex(c=>c.id==='invest');
 if(s.ch<late&&!s.reprise&&!s.recognized)return;
 // 兼容上一版后期存档：恢复实际玩过的现场观察，绝不补入尚未发现的内容。
 if(!s.lateSharedRevision){
  for(const scene of FIELD_SCENES){const observed=(s.notebook||[]).some(n=>n.type==='action'&&n.text===scene.finding);if(observed)MemoryRules.remember(s,{id:'shared-migration:field:'+scene.id+':finding',who:'我',text:scene.finding},['me','karwin']);}
  s.lateSharedRevision=1;
 }
 MemoryRules.recognize(s);
 if(s.reprise){s.reprise.kind='both';const scene=fieldScene(s.reprise.fieldId);const e=s.memories.me.find(e=>e.text===scene.finding);s.reprise.reminder=e?.text||s.reprise.reminder||'';}
 if(s.pendingRewind&&s.lastRewind)s.lastRewind={...s.lastRewind,shared:true,retained:['me','karwin']};
 ensureOldCaseNotes(s);
}
function cur(){return CHAPTERS[state.ch];}
function baseCheckpoint(){return clone({inv:state.inv,flags:state.flags,chatProgress:state.chatProgress,chatChoices:state.chatChoices,caseProgress:state.caseProgress,taskStep:state.taskStep,log:state.log,seen:state.seen,notebook:state.notebook,personalNotes:state.personalNotes,fieldCheckpoints:state.fieldCheckpoints,fieldDone:state.fieldDone,memories:state.memories,memoryBase:state.memoryBase,recognized:state.recognized});}
function enterChapter(i){state.reprise=null;state.nightReplay=null;state.ch=i;state.phase='intro';state.cursor=0;state.field=null;state.selected=null;state.ending=null;state.unlocked=Math.max(state.unlocked,i);ensureLateShared(state);state.checkpoints[i]=baseCheckpoint();captureDayStart();addNote('chapter','chapter:'+i,'进入章节 · '+CHAPTERS[i].title,'当前时间地点：'+CHAPTERS[i].loc+'。线索笔记会保留我的选择、找到的证据、回溯尝试和已经完成的推理。',{time:CHAPTERS[i].loc});closeModal();save();render();}
function applyScene(scene){if(!scene)return;if(scene.bg!==undefined)setBG(scene.bg);if(scene.loc!==undefined)L10n.set($('#chLoc'),scene.loc);if(scene.task!==undefined){$('#objective').hidden=true;L10n.set($('#objText'),scene.task);}}
function setBG(name){const bg=$('#bg');bg.dataset.name=name||'';bg.style.backgroundImage=name?'url("'+ASSET_BASE+encodeURIComponent(name)+'.webp"),linear-gradient(135deg,#1d3a3d,#2c4a47)':'';}
function updateLoopDisplay(){const el=$('#loopCount');if(!el)return;const lp=state.flags.loop||0;L10n.set(el,'第 '+lp+' 次回溯');el.style.display='';}
function restoreScene(){const c=cur();setBG(c.bg);L10n.set($('#chTitle'),c.title);L10n.set($('#chLoc'),c.loc);L10n.set($('#chIndex'),String(state.ch+1).padStart(2,'0')+' / '+String(CHAPTERS.length).padStart(2,'0'));$('#objective').hidden=true;updateLoopDisplay();
 if(state.phase==='intro')c.intro.slice(0,state.cursor+1).forEach(n=>applyScene(n.scene));
 else{c.intro.forEach(n=>applyScene(n.scene));applyScene(c.task&&c.task.scene);if(state.phase==='outro')c.outro.slice(0,state.cursor+1).forEach(n=>applyScene(n.scene));}
}
function addLog(id,who,text,observedBy){if(state.seen.includes(id))return;state.seen.push(id);const e={id:state.flags.loop+':'+id,who,text};state.log.push(e);const observers=observedBy||((who==='蒋麟'||who==='男生'||id.startsWith('chat:'))?['me','karwin']:['me']);MemoryRules.remember(state,e,observers);if(who!=='系统'&&text)addNote('dialogue',id,speakerName(who),text);}
function addNote(type,key,title,text,meta={}){state.notebook=state.notebook||[];const fullKey=(state.flags.loop||0)+':'+key;if(key&&state.notebook.some(n=>n.key===fullKey&&n.type===type&&n.text===text))return;state.notebook.push({key:fullKey,type,loop:state.flags.loop||0,chapter:cur()?.title||'',time:cur()?.loc||canonicalText($('#chLoc'))||'',title,text,...meta});}
function recordClue(h){MemoryRules.remember(state,{id:'clue:'+cur().id+':'+h.id,who:'线索',text:h.label+'：'+(h.investText||'已确认位置'),clue:true},cur().id==='invest'?['me','karwin']:['me']);}
function recordClueNote(h){addNote('clue','clue:'+cur().id+':'+h.id,ITEM_NAMES[h.give],h.investText||h.label,{itemId:h.give});}
// ── 自选提示：仅由玩家主动点击灯泡打开 ──
function currentHint(){
 const sections=[],keys=[],inGame=!$('#cover').hidden?false:true;
 const add=(key,title,text)=>{keys.push(key);sections.push({title,text});};
 if(!inGame){add('welcome','操作方法','点击对白下方按钮或按空格继续。调查时点击场景中的发光点，已获得的物品可在物品栏再次查看。提示只在点击灯泡后显示。');return {keys,sections};}
 if(state.nightReplay){add('night-replay:'+state.flags.loop,'快速重走',REPRISE_COPY.bridge);}
 else if(state.reprise){add('reprise:'+state.reprise.fieldId+':'+state.flags.loop,'快速重走',REPRISE_COPY.bridge);if(state.reprise.reminder)add('recall:'+state.reprise.fieldId+':'+state.flags.loop,'上一轮核对过的现场',state.reprise.reminder);}
 else if(state.field){const s=fieldScene(state.field.id),memory=fieldMemory(s);add('field:'+s.id+':'+state.flags.loop,'现场调查',FIELD_COPY.mechanism+'\n'+FIELD_COPY.restart);
  if(memory)add('recall:'+s.id+':'+state.flags.loop,'上一轮核对过的现场',memory.events.map(e=>e.text).join('\n'));
  if(state.field.seen)add('observed:'+s.id+':'+state.flags.loop,'本轮观察',s.finding);
  if(state.field.taken){const item=fieldItem(s);add('taken:'+s.id+':'+state.flags.loop,'本轮已取得',ITEM_NAMES[item.give]+'\n'+item.investText);}
  if(state.field.synced)add('synced:'+s.id+':'+state.flags.loop,'已和蒋麟核对','撤离前确认两个人的位置；证据和人都要离开现场。');
 }
 else if(state.phase==='task'){
  const t=activeTask();
  if(t?.kind==='hotspot'){
   const all=visibleHotspots(t).filter(h=>h.give),collected=all.filter(h=>state.inv.includes(h.give)),use=visibleHotspots(t).find(h=>h.autoUse);
   let text=t.objective||'点击场景中的发光点进行调查。';
   if(all.length)text+='\n已找到 '+collected.length+'/'+all.length+' 条线索。';
   if(use)text+='\n'+(state.inv.includes(use.autoUse)?'已获得「'+ITEM_NAMES[use.autoUse]+'」，点击「'+use.label+'」使用。':'先找到「'+ITEM_NAMES[use.autoUse]+'」，再点击「'+use.label+'」。');
   else text+='\n继续点击未完成的发光点，物品栏可反复查看已取得的证据。';
   const taskKey='task:'+cur().id+':'+state.flags.loop+':'+collected.length+(use?':'+(state.inv.includes(use.autoUse)?'ready':'need'):'');add(taskKey,'收集证据',text);
  }else if(t?.kind==='caseboard'){
   const p=state.caseProgress[cur().id]||{step:0},r=t.rounds[p.step];
   add('case:'+cur().id+':'+p.step,'核验方法',CASE_COPY.instructions);
   if(r&&!p.solved)add('case-clue:'+cur().id+':'+p.step,r.title,r.hint);
  }else if(t?.kind==='chat')add('chat:'+t.topic,'当前任务',t.objective);
 }

 if(state.lastRewind?.toDay>=20)add('day:'+state.rewindFloorDay,'回溯范围',DAY_COPY.rule+'\n当前最早回到：'+dayLabel(state.rewindFloorDay));
 if(sections.length<=1)add('controls','操作方法','点击对白按钮或按空格继续；点击场景发光点调查；点击物品栏可反复查看描述。');
 return {keys,sections};
}
function updateHintDot(){
 const dot=$('#hintDot');if(!dot)return;const h=currentHint();dot.hidden=!h.keys.some(key=>!state.hintRead?.[key]);
}
function openHint(){
 if(rewinding)return;
 const h=currentHint(),m=openModal('提示');state.hintRead=state.hintRead||{};
 h.sections.forEach(sec=>{const box=noteElement(m,'section',undefined,'hint-section');noteElement(box,'h4',sec.title);noteElement(box,'p',sec.text);});
 h.keys.forEach(key=>{state.hintRead[key]=true;});
 if(state.phase==='task'&&!state.field&&!state.reprise&&activeTask()?.kind==='caseboard'){
  const p=state.caseProgress[cur().id],r=activeTask().rounds[p?.step||0];if(r)addNote('hint','hint:'+cur().id+':'+(p?.step||0),r.title,r.hint);
 }
 updateHintDot();save();m.append(button('收起提示','small-btn',closeModal));
}
function openMemory(){const m=openModal(MEMORY_COPY.journalTitle);const bank=state.memories.me;if(!bank.length){const e=document.createElement('p');L10n.set(e,MEMORY_COPY.empty);m.append(e);}bank.forEach(e=>{const row=document.createElement('p');row.className='log-entry';appendTextWithNames(row,e.text);m.append(row);});}
function button(text,cls,fn){const b=document.createElement('button');b.type='button';b.className=cls;appendTextWithNames(b,text);b.onclick=fn;return b;}

// ── 后半段现场取证：沿用对白、选择与原有死亡动画 ──
function fieldScene(id){return FIELD_SCENES.find(s=>s.id===id);}
function fieldItem(s){return s.reward||taskHotspots(CHAPTERS.find(c=>c.id===s.chapter)?.task).find(h=>h.id===s.hotspot);}
function startField(id){
 if(rewinding)return;
 const s=fieldScene(id);if(!s||s.chapter!==cur().id)throw Error('未知取证现场');
 if(state.fieldDone[id])return;ensureLateShared(state);
 const repeatActs=fieldRepeatedActions(s);
 state.field={id,stage:repeatActs.length?'recap':'intro',index:0,seen:false,taken:false,synced:false,escaped:false,repeatActs};
 closeModal();save();render();
}
function fieldRepeatedActions(s){
 const past=(state.notebook||[]).filter(n=>n.loop<(state.flags.loop||0));
 const has=key=>past.some(n=>n.key?.endsWith(':'+key));
 if(!has('field-observe:'+s.id))return [];
 const acts=['observe'];
 if(!has('field-item:'+s.id))return acts;
 acts.push('take');
 const talk=past.filter(n=>n.key?.endsWith(':field-communication:'+s.id)).at(-1);
 const sync=fieldMemory(s)?.events.some(e=>e.id?.endsWith(':sync'));
 if(talk)acts.push(talk.action);
 else if(sync)acts.push('sync');
 else if(has('field-route:'+s.id))acts.push('leave');
 return acts;
}
function finishFieldRecap(){
 const f=state.field,s=fieldScene(f.id),acts=f.repeatActs||[];
 if(!acts.includes('observe'))return fieldGo('intro');
 f.seen=true;addLog('field:'+s.id+':finding','我',s.finding,['me','karwin']);
 addNote('action','field-observe:'+s.id,'现场观察 · '+s.title,s.finding);
 if(acts.includes('take'))fieldTakeItem(s);
 if(acts.includes('sync')){f.synced=true;addLog('field:'+s.id+':sync','我',s.finding,['me','karwin']);}
 fieldGo(acts.includes('sync')||acts.includes('leave')?'route':acts.includes('take')?'communicateChoice':'takeChoice');
}
function fieldMemory(s){
 const prior=who=>(state.memories[who]||[]).filter(e=>{
  const id=e.id||'';return id.includes(':field:'+s.id+':')&&!id.startsWith((state.flags.loop||0)+':')&&(/:finding$|:sync$|:outcome$/.test(id));
 });
 let events=prior('me'),kind='me';
 if(state.recognized){events=events.concat(prior('karwin'));kind='both';}
 else if(!events.length){events=prior('karwin');kind='him';}
 events=[...new Map(events.map(e=>[e.text,e])).values()];
 return events.length?{kind,events,text:kind==='both'?FIELD_COPY.recallBoth:kind==='him'?FIELD_COPY.recallHim:FIELD_COPY.recallMe}:null;
}
function openFieldRecall(s){
 const r=fieldMemory(s),m=openModal(FIELD_COPY.recall);
 if(!r)noteElement(m,'p',FIELD_COPY.noRoute);
 else{noteElement(m,'p',r.text,'case-chain');r.events.forEach((e,i)=>{
  noteElement(m,'p',e.text,'log-entry');
  if(r.kind==='him')addLog('field:'+s.id+':retold:'+state.flags.loop+':'+i,'蒋麟',e.text,['me','karwin']);
 });}
 m.append(button(FIELD_COPY.return,'small-btn',()=>{save();closeModal();render();}));
}
function fieldGo(stage,index=0){state.field.stage=stage;state.field.index=index;save();render();}
function fieldTakeItem(s){
 const f=state.field;if(f.taken)return;f.taken=true;
 const h=fieldItem(s);if(h?.give&&!state.inv.includes(h.give)){
  state.inv.push(h.give);addNote('clue','field-item:'+s.id,ITEM_NAMES[h.give],h.investText,{itemId:h.give});recordItemExplanation(h.give);
  MemoryRules.remember(state,{id:state.flags.loop+':field:'+s.id+':item',who:'线索',text:h.investText,clue:true},['me']);
 }
}
function fieldChoose(act){
 if(rewinding)return;
 const s=fieldScene(state.field.id),f=state.field;
 if(act==='recall'){openFieldRecall(s);return;}
 if(act==='enter')return fieldGo('intro',0);
 if(act==='observe'){
  f.seen=true;
  addLog('field:'+s.id+':finding','我',s.finding,['me']);
  addNote('action','field-observe:'+s.id,'现场观察 · '+s.title,s.finding);
  return fieldGo('finding',0);
 }
 if(act==='take')return fieldGo('take',0);
 if(act==='sync'||act==='leave')addNote('choice','field-communication:'+s.id,s.title,act==='sync'?FIELD_COPY.sync:'暂时不说，先找出口',{action:act});
 if(act==='sync'){
  f.synced=true;addLog('field:'+s.id+':sync','我',s.finding,['me','karwin']);
  s.discussion.forEach(([who,text],i)=>addLog('field:'+s.id+':discussion:'+i,who,text,['me','karwin']));
  return fieldGo('discussion',0);
 }
 if(act==='leave')return fieldGo('route',0);
 addNote('choice','field-route:'+s.id,s.title,act==='safe'?s.safe:s.bad);
 if(act==='bad'){
  addNote('death','field-death:'+s.id,FIELD_COPY.failure,s.failure,{time:s.loc});
  if(s.deathOf==='karwin'||state.recognized)addLog('field:'+s.id+':outcome','我',s.failure,['me']);
  state.field=null;triggerDeath({death:true,deathOf:s.deathOf,rewind:1,fromField:true,fieldId:s.id,text:s.failure});return;
 }
 f.escaped=true;f.synced=true;
 addLog('field:'+s.id+':sync','我',s.finding,['me','karwin']);
 const h=fieldItem(s);if(h?.give)MemoryRules.remember(state,{id:state.flags.loop+':field:'+s.id+':item',who:'线索',text:h.investText,clue:true},['me','karwin']);
 s.success.forEach(([who,text],i)=>addLog('field:'+s.id+':success:'+i,who,text,['me','karwin']));
 addNote('action','field-success:'+s.id,FIELD_COPY.saved,s.safe);fieldGo('success',0);
}
function evidenceRequirementDone(h){
 if(h.field&&!state.fieldDone[h.field])return false;
 return !h.give||state.inv.includes(h.give);
}
function hotspotById(t,id){return t?.hotspots?.find(h=>h.id===id)||null;}
function hotspotAvailable(t,h){
 if(!h.requires)return true;
 // Old saves may already be inside or past the archive; never strand completed evidence.
 if(evidenceRequirementDone(h)||(h.field&&state.field?.id===h.field))return true;
 return h.requires.every(id=>{const req=hotspotById(t,id);return req&&evidenceRequirementDone(req);});
}
function visibleHotspots(t){return t?.kind==='hotspot'?t.hotspots.filter(h=>hotspotAvailable(t,h)):[];}
function missingEvidence(t){
 return t?.kind==='hotspot'&&t.collectAll?visibleHotspots(t).filter(h=>(h.give||h.field)&&!evidenceRequirementDone(h)):[];
}
function lockedEvidence(t){
 return t?.kind==='hotspot'&&t.collectAll?t.hotspots.filter(h=>h.requires&&!hotspotAvailable(t,h)):[];
}
function evidenceBlocked(t){return missingEvidence(t).length+lockedEvidence(t).length;}
function mustCollectAllEvidence(){
 return ['invest','deeptrace'].includes(cur().id)&&state.phase==='task';
}
function finishField(){
 const f=state.field;if(!f?.escaped)return;state.fieldDone[f.id]=true;state.field=null;closeModal();
 const t=activeTask();
 if(!mustCollectAllEvidence()&&t?.kind==='hotspot'&&(!t.collectAll||!evidenceBlocked(t))){
  state.flags[cur().id+':complete']=true;advanceActiveTask();
 }else{save();render();}
}
function currentFieldNode(){
 const s=fieldScene(state.field.id),f=state.field,choice=(text,act)=>({text,act});
 if(f.stage==='recap')return {speaker:'我',text:fieldReplayText(s,f.repeatActs||[]),observers:['me','karwin'],recap:true};
 if(f.stage==='failure')return {speaker:'我',text:s.failure,death:true};
 if(f.stage==='recall'){f.stage='intro';f.index=0;return currentFieldNode();}
 if(f.stage==='intro'){const n=s.intro[f.index];return {speaker:n[0],text:n[1],observers:n[0]==='我'?['me']:['me','karwin'],next:f.index+1<s.intro.length?['intro',f.index+1]:['observeChoice',0]};}
 if(f.stage==='observeChoice')return {speaker:'我',text:'楼道里很安静，墙角贴着一张褪色的示意图。',choices:[choice(FIELD_COPY.observe,'observe')]};
 if(f.stage==='finding')return {speaker:'我',text:s.finding,observers:['me'],next:[f.taken?'communicateChoice':'takeChoice',0]};
 if(f.stage==='takeChoice')return {speaker:'我',text:'柜门打开了，资料就在里面。',choices:[choice(FIELD_COPY.take,'take')]};
 if(f.stage==='take'){fieldTakeItem(s);const h=fieldItem(s);return {speaker:'我',text:'我把「'+ITEM_NAMES[h.give]+'」取了出来。'+(ITEM_EXPLANATIONS[h.give]||'先收好，离开现场后再和蒋麟核对。'),observers:['me'],next:['communicateChoice',0]};}
 if(f.stage==='communicateChoice')return {speaker:'我',text:'我按住口袋里的资料，听见电话那端传来的呼吸声。',choices:[choice(FIELD_COPY.sync,'sync'),choice('暂时不说，先找出口','leave')]};
 if(f.stage==='discussion'){const n=s.discussion[f.index];return {speaker:n[0],text:n[1],observers:['me','karwin'],next:f.index+1<s.discussion.length?['discussion',f.index+1]:['route',0]};}
 if(f.stage==='route')return {speaker:'我',text:'我站在楼道的岔口，脚步停了一下。',choices:[choice(s.bad,'bad'),choice(s.safe,'safe')]};
 const n=s.success[f.index];return {speaker:n[0],text:n[1],observers:['me','karwin'],next:f.index+1<s.success.length?['success',f.index+1]:null,end:true};
}
function fieldAdvance(){
 if(rewinding||!state.field)return;const node=currentFieldNode();if(node?.choices)return;
 if(node?.recap){finishFieldRecap();return;}
 if(node?.death){fieldChoose('bad');return;}
 if(node?.next){fieldGo(node.next[0],node.next[1]);return;}if(node?.end)finishField();
}
function renderField(){
 const s=fieldScene(state.field.id),f=state.field,n=currentFieldNode();if(!n)return;
 setBG(s.bg);L10n.set($('#chTitle'),FIELD_COPY.title);L10n.set($('#chLoc'),s.loc);updateLoopDisplay();
 $('#dialogue').hidden=false;$('#hotspots').replaceChildren();$('#objective').hidden=true;L10n.set($('#objText'),s.title);
 const id='field:'+s.id+':dialogue:'+f.stage+':'+f.index;
 addLog(id,n.speaker,n.text,n.observers);
 L10n.set($('#speaker'),speakerName(n.speaker));$('#speaker').dataset.speaker=n.speaker;
 $('#lineText').replaceChildren();appendTextWithNames($('#lineText'),n.text);$('#lineText').dataset.speaker=n.speaker;L10n.set($('#moment'),s.loc);
 $('#choices').replaceChildren();$('#nextBtn').hidden=!!n.choices;
 (n.choices||[]).forEach(o=>{const b=button(o.text,'choice',()=>fieldChoose(o.act));b.dataset.fieldAction=o.act;$('#choices').append(b);});
 renderInventory();save();
}

// ── 滚动日期窗口：只能退一天，下限不因再次回溯后移 ──
function chapterDay(i){return [18,18,18,18,20,21,21,22][i]||18;}
function chapterForDay(day){return day>=22?7:day>=21?5:day>=19?4:1;}
function currentDay(s=state){return s.nightReplay?.wakeDay||s.reprise?.wakeDay||chapterDay(s.ch);}
function captureDayStart(s=state){
 const day=currentDay(s);s.rewindFloorDay=Math.max(s.rewindFloorDay||18,day-1);s.dayStarts=s.dayStarts||{};
 if(!s.dayStarts[day])s.dayStarts[day]=clone(s.checkpoints?.[s.ch]||baseCheckpoint());
}
function dayCheckpoint(s,day){
 if(s.dayStarts?.[day])return clone(s.dayStarts[day]);
 const target=chapterForDay(day),cp=s.checkpoints?.[target];if(cp)return clone(cp);
 const prior=Object.keys(s.checkpoints||{}).map(Number).filter(i=>chapterDay(i)<=day).sort((a,b)=>b-a)[0];
 return clone(prior!==undefined?s.checkpoints[prior]:fresh());
}
function normalizeDaySave(s){
 s.dayStarts=s.dayStarts||{};s.rewindFloorDay=Math.max(18,s.rewindFloorDay||18);
 if(s.dayWindowRevision!==1){const cp=s.reprise?.resume?.checkpoints||s.checkpoints||{};for(const i of Object.keys(cp).map(Number).sort((a,b)=>a-b)){const d=chapterDay(i);if(!s.dayStarts[d])s.dayStarts[d]=clone(cp[i]);}}
 const r=s.reprise;
 if(r){
  const field=fieldScene(r.fieldId);if(!field)throw Error('invalid reprise scene');
  if(s.dayWindowRevision!==1||r.wakeDay===undefined){
   r.fieldChapter=CHAPTERS.findIndex(c=>c.id===field.chapter);r.wakeDay=Math.max(field.day-1,s.rewindFloorDay);r.target=chapterForDay(r.wakeDay);
   const cp=dayCheckpoint(s,r.wakeDay);s.inv=clone(cp.inv||[]);s.ch=r.target;s.phase='intro';s.cursor=0;
   r.index=Math.min(r.index||0,5);
  }
  if(!Number.isInteger(r.index)||r.index<0||r.index>5||!r.resume||!Array.isArray(r.resume.inv)||s.ch!==r.target||CHAPTERS[r.fieldChapter]?.id!==field.chapter)throw Error('invalid reprise save');
  if(r.compactRevision!==1){r.index=Math.min(2,Math.floor(r.index/2));r.compactRevision=1;}
  if(r.index>=repriseDialogue(r).length)throw Error('invalid compact reprise');
  s.rewindFloorDay=Math.max(s.rewindFloorDay,r.wakeDay);
 }else s.rewindFloorDay=Math.max(s.rewindFloorDay,chapterDay(s.ch)-1);
 s.dayWindowRevision=1;
}

// ── 黑影路线：清晨醒来后用三段概述直达当晚 ──
function prepareNightReplay(node,wakeDay){
 if(node.fromField||cur().id!=='deeptrace'||state.phase!=='intro'||![6,8,11].includes(state.cursor))return null;
 return {index:0,wakeDay,resumeCursor:state.cursor===11?10:5,resume:baseCheckpoint()};
}
function normalizeNightReplay(s){
 s.nightReplay=s.nightReplay||null;
 // 兼容上一版已经回到白天的存档，只识别上一轮最后停在黑影分支的情况。
 if(s.nightReplayRevision!==1&&!s.nightReplay&&!s.reprise&&!s.field&&s.ch<6&&s.lastRewind?.fromDay===21){
  const prefix=((s.flags?.loop||0)-1)+':';
  const last=(s.memoryBase?.me||[]).filter(e=>String(e.id).startsWith(prefix)).at(-1);
  const match=last&&new RegExp('^'+prefix+'6:intro:(6|8|11)$').exec(last.id);
  if(match&&s.checkpoints?.[6])s.nightReplay={index:0,wakeDay:s.lastRewind.toDay,resumeCursor:Number(match[1])===11?10:5,resume:clone(s.checkpoints[6])};
 }
 s.nightReplayRevision=1;
 const r=s.nightReplay;
 if(r&&(!Number.isInteger(r.index)||r.index<0||r.index>2||![5,10].includes(r.resumeCursor)||![20,21].includes(r.wakeDay)||!r.resume||!Array.isArray(r.resume.inv)||!r.resume.flags||!r.resume.chatProgress||!r.resume.chatChoices||s.reprise||s.field))throw Error('invalid night replay');
}
function renderNightReplay(){
 const r=state.nightReplay,n=NIGHT_REPLAY_COPY.dialogue(r.wakeDay,r.resumeCursor===10)[r.index];
 L10n.set($('#chTitle'),NIGHT_REPLAY_COPY.title);L10n.set($('#chLoc'),n.loc);setBG(n.bg);
 $('#dialogue').hidden=false;$('#objective').hidden=true;L10n.set($('#speaker'),speakerName(n.speaker));$('#speaker').dataset.speaker=n.speaker;
 $('#lineText').replaceChildren();appendTextWithNames($('#lineText'),n.text);$('#lineText').dataset.speaker=n.speaker;L10n.set($('#moment'),n.loc);
 $('#choices').replaceChildren();$('#nextBtn').hidden=false;
 addLog('night-replay:'+r.index,n.speaker,n.text,['me','karwin']);save();
}
function advanceNightReplay(){
 const r=state.nightReplay;if(r.index<2){r.index++;save();render();return;}
 const loop=state.flags.loop,cp=r.resume;
 // 叙事里重新取得旧证据，只恢复实际完成过的内容，不解锁新线索。
 for(const key of ['inv','chatProgress','chatChoices','caseProgress','taskStep','fieldCheckpoints','fieldDone'])state[key]=clone(cp[key]||(key==='inv'?[]:{}));
 state.flags={...cp.flags,loop};state.nightReplay=null;state.reprise=null;state.field=null;
 state.ch=6;state.phase='intro';state.cursor=r.resumeCursor;state.selected=null;state.ending=null;state.unlocked=Math.max(state.unlocked,6);
 ensureLateShared(state);captureDayStart();
 addNote('action','night-replay',NIGHT_REPLAY_COPY.note,NIGHT_REPLAY_COPY.dialogue(r.wakeDay,r.resumeCursor===10)[1].text);
 save();render();
}
// ── 清晨重逢与快速重走 ──
function prepareReprise(node,wakeDay){
 if(!node.fromField||!node.fieldId)return null;
 const s=fieldScene(node.fieldId);if(!s)return null;
 const failItem=fieldItem(s)?.give;
 return {fieldId:s.id,target:chapterForDay(wakeDay),wakeDay,fieldChapter:state.ch,index:0,compactRevision:1,reply:null,count:(state.repriseCounts?.[s.id]||0)+1,
  resume:{inv:state.inv.filter(id=>id!==failItem),flags:clone(state.flags),chatProgress:clone(state.chatProgress),chatChoices:clone(state.chatChoices),fieldDone:clone(state.fieldDone),checkpoints:clone(state.checkpoints)}};
}
function initializeReprise(r){
 if(!r)return;const held=fieldMemory(fieldScene(r.fieldId));r.kind='both';
 r.reminder=held?.events.find(e=>e.text===fieldScene(r.fieldId).finding)?.text||held?.events[0]?.text||'';
 state.repriseCounts=state.repriseCounts||{};state.repriseCounts[r.fieldId]=r.count;state.reprise=r;
}
function renderReprise(){
 ensureLateShared(state);const r=state.reprise,n=repriseDialogue(r)[r.index];
 L10n.set($('#chTitle'),REPRISE_COPY.title);L10n.set($('#chLoc'),n.loc);setBG(n.bg);
 $('#dialogue').hidden=false;$('#objective').hidden=true;L10n.set($('#objText'),REPRISE_COPY.goal);
 L10n.set($('#speaker'),speakerName(n.speaker));$('#speaker').dataset.speaker=n.speaker;
 $('#lineText').replaceChildren();appendTextWithNames($('#lineText'),n.text);$('#lineText').dataset.speaker=n.speaker;L10n.set($('#moment'),n.loc);
 addLog('reprise:'+r.fieldId+':'+r.index,n.speaker,n.text,n.observers);
 if(n.reminder&&r.reminder)addLog('field:'+r.fieldId+':retold:'+r.count,'蒋麟',r.reminder,['me','karwin']);
 $('#choices').replaceChildren();$('#nextBtn').hidden=false;
 save();
}
function advanceReprise(){
 const r=state.reprise,n=repriseDialogue(r)[r.index];if(n.choice||n.routeChoice)return;
 if(n.montage){finishReprise();return;}r.index++;save();render();
}
function finishReprise(){
 const r=state.reprise;if(!r)return;const s=fieldScene(r.fieldId),loop=state.flags.loop;
 // 叙事压缩重走，不把上一轮物品直接当作跨轮携带。
 const got=r.resume.inv.filter(id=>ITEM_NAMES[id]&&id!==fieldItem(s)?.give);
 state.inv=[...new Set(got)];state.flags={...r.resume.flags,loop};
 state.chatProgress=clone(r.resume.chatProgress);state.chatChoices=clone(r.resume.chatChoices);
 state.fieldDone=clone(r.resume.fieldDone);delete state.fieldDone[r.fieldId];
 state.taskStep={};state.caseProgress={};state.reprise=null;
 state.checkpoints=clone(r.resume.checkpoints||state.checkpoints);
 enterChapter(r.fieldChapter);state.phase='task';state.cursor=0;
 addNote('action','reprise-montage:'+r.fieldId,REPRISE_COPY.note,REPRISE_COPY.bridge+'\n'+(state.inv.map(id=>ITEM_NAMES[id]).join('、')||'这段路线没有已取得的实物。'));
 state.inv.forEach(id=>{const rec=itemRecord(id);const text=itemOriginal(id);addNote('clue','reprise-item:'+id,ITEM_NAMES[id],REPRISE_COPY.notCarried+'\n'+text,{itemId:id,chapter:rec?.chapter.title||cur().title});MemoryRules.remember(state,{id:loop+':reprise:item:'+id,who:'线索',text,clue:true},['me','karwin']);});
 addLog('reprise:'+r.fieldId+':arrival','系统',REPRISE_COPY.arrival,['me','karwin']);
 startField(r.fieldId);save();
}

// ── 死亡/回溯 ──
function triggerDeath(node={}){
 if(rewinding)return;ensureLateShared(state);
 const dead=node.deathOf==='karwin'?'karwin':'me',loopCount=(state.flags.loop||0)+1;
 const fromDay=currentDay(),timed=!!node.fromField||fromDay>=20;
 const wakeDay=timed?Math.max(fromDay-1,state.rewindFloorDay||18):18;
 const target=timed?chapterForDay(wakeDay):(Number.isInteger(node.rewind)?node.rewind:state.ch);
 if(!CHAPTERS[target])throw Error('无效回溯目标');
 if(!timed&&state.ch<2&&target===state.ch+1)recordCaseDiary(state.ch);
 const nightReplay=prepareNightReplay(node,wakeDay),replay=prepareReprise(node,wakeDay),cp=timed?dayCheckpoint(state,wakeDay):(state.checkpoints[target]||state.checkpoints[state.ch]||baseCheckpoint());
 const report=MemoryRules.rewind(state,dead);report.fromDay=fromDay;report.toDay=wakeDay;
 const kept=clone({diaryRevision:1,caseDiary:state.caseDiary,memories:state.memories,memoryBase:state.memoryBase,notebook:state.notebook,personalNotes:state.personalNotes,recognized:state.recognized,endings:state.endings,repriseCounts:state.repriseCounts||{},dayStarts:state.dayStarts||{},rewindFloorDay:Math.max(state.rewindFloorDay||18,wakeDay),dayWindowRevision:1,hintRead:state.hintRead||{},checkpoints:state.checkpoints});
 Object.assign(state,clone(cp),kept);state.reprise=null;state.nightReplay=nightReplay;state.nightReplayRevision=1;state.field=null;
 state.ch=target;state.flags.loop=loopCount;state.phase='intro';state.cursor=0;state.selected=null;state.ending=null;
 addNote('rewind','rewind:'+loopCount,MEMORY_COPY.rewindTitle,NOTE_COPY.returnTo+(timed?dayLabel(wakeDay):CHAPTERS[target].title)+'\n'+NOTE_COPY.archiveOnly);
 state.log=clone(state.memories.me);state.seen=[];state.lastRewind=report;state.pendingRewind=false;initializeReprise(replay);
 if(!state.checkpoints[target])state.checkpoints[target]=baseCheckpoint();
 save();closeModal();rewinding=true;
 const ov=$('#deathOverlay'),im=$('#impactOverlay');L10n.set(ov.querySelector('.death-text'),MEMORY_COPY.rewindTitle);
 L10n.set(ov.querySelector('.death-sub'),'声音渐渐远去，指针开始倒转。');
 const finish=()=>{im.classList.remove('show');ov.classList.remove('show');rewinding=false;render();};
 if(timed){
  L10n.set($('#impactText'),node.impact||(node.fieldId?fieldScene(node.fieldId)?.impact:null)||DAY_COPY.impact);
  im.classList.add('show');
  setTimeout(()=>{ov.classList.add('show');im.classList.remove('show');},900);
  setTimeout(finish,2700);
 }else{ov.classList.add('show');setTimeout(finish,1800);}
}

function recordOldCaseNote(key){
 if(!OLD_CASE_CONTEXT?.notes?.[key])return;
 addNote('oldcase','oldcase:'+key+':'+state.ch,OLD_CASE_CONTEXT.title,OLD_CASE_CONTEXT.notes[key]);
}
function repeatedStoryChoice(n){
 if(!state.lastRewind||!n?.choices)return null;
 // Only routine replies: divergent routes and ending decisions remain interactive.
 if(!n.choices.every(o=>o.goto===undefined)&&!(state.ch===2&&state.phase==='intro'&&state.cursor===4))return null;
 const prefix=':choice:'+state.ch+':'+state.phase+':'+state.cursor+':';
 const past=(state.notebook||[]).filter(e=>e.type==='choice'&&e.loop<(state.flags.loop||0)&&e.key?.includes(prefix)).at(-1);
 return past?n.choices.find(o=>o.text===past.text)||null:null;
}
function render(){
 $('#cover').hidden=true;$('#play').hidden=false;$('#ending').hidden=true;$('.inventory').hidden=false;$('#hotspots').replaceChildren();
 const th=$('#taskHint');if(th)th.className='task-hint';
 restoreScene();renderInventory();updateHintDot();
 if(state.nightReplay){renderNightReplay();return;}
 if(state.reprise){renderReprise();return;}
 if(state.field){renderField();return;}
 if(state.phase==='end'){renderEnding();return;}
 if(state.phase==='task'){$('#dialogue').hidden=true;renderTask();save();return;}
 $('#dialogue').hidden=false;
 const n=cur()[state.phase][state.cursor];if(!n){advancePhase();return;}
 // Removed narration keeps its node index for old saves, but never renders or records an empty page.
 if(n.text===''&&!n.memoryText&&!n.choices&&!n.death&&!n.ending&&!n.endPath&&!n.recognize&&!n.caseNote){state.cursor=n.goto===undefined?state.cursor+1:n.goto;render();return;}
 const repeated=repeatedStoryChoice(n);
 const lineSource=repeated?REPEAT_CHOICE_COPY.before+'“'+repeated.text+'”'+REPEAT_CHOICE_COPY.after:n.memoryText?memoryNodeText(n.memoryText,state):n.text;
 L10n.set($('#speaker'),speakerName(n.speaker));$('#speaker').dataset.speaker=n.speaker;$('#lineText').replaceChildren();appendTextWithNames($('#lineText'),lineSource);$('#lineText').dataset.speaker=n.speaker;L10n.set($('#moment'),canonicalText($('#chLoc'))||cur().loc);
 addLog(state.ch+':'+state.phase+':'+state.cursor,n.speaker,lineSource,n.observers);
 if(n.caseNote)recordOldCaseNote(n.caseNote);
 if(n.recognize){MemoryRules.recognize(state);updateLoopDisplay();}
 $('#choices').replaceChildren();$('#nextBtn').hidden=!!n.choices&&!repeated;
 if(n.text===''){$('#nextBtn').hidden=false;}
 (repeated?[]:n.choices||[]).forEach((o,i)=>$('#choices').append(button(o.text,'choice',()=>{
  Object.assign(state.flags,o.set||{});addLog(state.ch+':'+state.phase+':'+state.cursor+':choice','我',o.text);addNote('choice','choice:'+state.ch+':'+state.phase+':'+state.cursor+':'+i,'我的选择 · '+cur().title,o.text);
  state.cursor=o.goto===undefined?state.cursor+1:o.goto;render();})));
 save();
}
function advance(){if(rewinding)return;
 if(state.nightReplay){advanceNightReplay();return;}
 if(state.reprise){advanceReprise();return;}
 if(state.field){fieldAdvance();return;}
 if(state.phase==='task'||state.phase==='end')return;
 const nodes=cur()[state.phase];const n=nodes[state.cursor];
 const repeated=repeatedStoryChoice(n);
 if(repeated){Object.assign(state.flags,repeated.set||{});state.cursor=repeated.goto===undefined?state.cursor+1:repeated.goto;render();return;}
 if(n?.choices)return;
 if(n?.death){triggerDeath(n);return;}
 if(n?.ending){finish(n.ending);return;}
 if(n?.endPath){advancePhase();return;}
 state.cursor=n?.goto===undefined?state.cursor+1:n.goto;if(state.cursor>=nodes.length){advancePhase();return;}render();}
function advancePhase(){state.cursor=0;
 if(state.phase==='intro'){state.phase='task';if(!cur().task){advancePhase();return;}}
 else if(state.phase==='task'){
  if(mustCollectAllEvidence()&&(state.field||evidenceBlocked(activeTask())))return;
  state.phase='outro';
 }
 else if(state.ch+1<CHAPTERS.length){recordCaseDiary(state.ch);enterChapter(state.ch+1);return;}
 else{finish();return;}render();}
function activeTask(){const t=cur().task;if(t?.kind==='sequence'){const step=state.taskStep[cur().id]||0;const active=t.steps[step];return active||t.steps[0];}return t;}
function advanceActiveTask(){const t=cur().task;if(t?.kind!=='sequence'){advancePhase();return;}const key=cur().id,next=(state.taskStep[key]||0)+1;if(next>=t.steps.length){advancePhase();return;}state.taskStep[key]=next;save();render();}
function renderTask(){const t=activeTask();$('#objective').hidden=true;L10n.set($('#objText'),t.objective);
 applyScene(t.scene);if(t.kind==='caseboard'){renderCaseboard(t);return;}
 if(t.kind==='hotspot')visibleHotspots(t).forEach(h=>{
  const alreadyHave=h.give&&evidenceRequirementDone(h);
  const el=button('','hotspot',()=>{
   if(h.autoUse){
    if(state.inv.includes(h.autoUse)){addNote('action','action:'+cur().id+':'+h.id,NOTE_COPY.used+h.label,ITEM_NAMES[h.autoUse]+' → '+h.label);state.flags[cur().id+':'+h.id]=true;state.flags[cur().id+':complete']=true;advanceActiveTask();return;}
    if(h.deathWithoutItem){triggerDeath({rewind:state.ch});return;}
    updateHintDot();return;}
   if(h.give&&state.inv.includes(h.give)&&(!h.field||state.fieldDone[h.field])){openItemDescription(h.give);return;}
   const chapter=state.ch;
   if(!hotspotAvailable(t,h))return;
   const collect=()=>{
    if(state.ch!==chapter||state.phase!=='task'||activeTask()!==t)return;
    if(h.field&&!state.fieldDone[h.field]){startField(h.field);return;}
    if(h.give){recordClue(h);}
    if(h.give&&!state.inv.includes(h.give)){state.inv.push(h.give);recordClueNote(h);recordItemExplanation(h.give);}
    save();render();
    if(!mustCollectAllEvidence()&&(t.collectAll?!evidenceBlocked(t):h.complete)){state.flags[cur().id+':complete']=true;advanceActiveTask();}
   };
   if(cur().id==='deeptrace'){
    if(h.field&&!state.fieldDone[h.field])startField(h.field);
    else{collect();if(h.give)openItemDescription(h.give);}
   }else openItemPreview(h,collect);
  });
 el.dataset.hot=h.id;L10n.attr(el,'aria-label',h.label);L10n.attr(el,'title',h.label);el.style.left=h.x+'%';el.style.top=h.y+'%';
 if(alreadyHave){el.classList.add('done');}
 const dot=document.createElement('span');dot.className='dot';el.append(dot);const label=document.createElement('span');label.className='hotlabel';L10n.set(label,h.label);el.append(label);$('#hotspots').append(el);});
 updateHintDot();renderEvidenceGate(t);
 if(t.kind==='chat'){$('#hotspots').append(button('打开聊天','chat-open',()=>openChat(t.topic)));openChat(t.topic);}
 else if(t.kind!=='hotspot')throw Error('未实现的任务类型：'+t.kind);
}
function renderEvidenceGate(t){
 if(t.kind!=='hotspot'||!t.collectAll||!mustCollectAllEvidence())return;
 const required=visibleHotspots(t).filter(h=>h.give||h.field),missing=missingEvidence(t),done=required.length-missing.length;
 const panel=document.createElement('div');panel.className='evidence-gate';
 const count=document.createElement('span');count.className='evidence-count';count.setAttribute('role','status');L10n.set(count,EVIDENCE_GATE_COPY.count(done,required.length));panel.append(count);
 if(!missing.length&&!lockedEvidence(t).length){
  const chapter=state.ch,go=button(EVIDENCE_GATE_COPY.continue,'task-continue',()=>{
   if(state.ch!==chapter||!mustCollectAllEvidence()||activeTask()!==t||state.field||rewinding||!$('#modal').hidden||evidenceBlocked(t))return;
   state.flags[cur().id+':complete']=true;advanceActiveTask();
  });panel.append(go);
 }
 $('#hotspots').append(panel);
}
function addCaseGuideNotes(t,p){
 const g=CASE_GUIDES[p.step];if(!g)return;
 g.talk.forEach((line,i)=>addNote('discussion','precase:'+cur().id+':'+p.step+':'+i,NOTE_COPY.discussion+' · '+(p.step+1),line[0]+'：'+line[1]));
}
function renderCaseboard(t){
 const key=cur().id;state.caseProgress=state.caseProgress||{};
 const p=state.caseProgress[key]||(state.caseProgress[key]={step:0,selected:[],answer:null,solved:false,feedback:'',hint:false});
 const r=t.rounds[p.step];if(!r)throw Error('无效推理进度');
 $('#hotspots').replaceChildren();$('#objective').hidden=true;
 const panel=document.createElement('section');panel.className='case-panel';L10n.attr(panel,'aria-label',CASE_COPY.title);
 const put=(tag,text,cls)=>{const e=document.createElement(tag);appendTextWithNames(e,text);if(cls)e.className=cls;panel.append(e);return e;};
 put('small',CASE_COPY.title+' · '+(p.step+1)+' / '+t.rounds.length,'case-eyebrow');put('h3',r.title);put('p',r.setup,'case-setup');
 if(p.solved){
  recordCaseResult(r,p.step);
  const guide=CASE_GUIDES[p.step];
  put('p',CASE_COPY.solved,'case-success');
  if(guide){put('p','核验状态：'+guide.status,'case-chain');put('p',NOTE_COPY.chain+'：'+guide.chain,'case-chain');put('p',NOTE_COPY.boundary+'：'+guide.boundary,'case-boundary');}
  put('p',NOTE_COPY.conclusion+'：'+r.reveal,'case-reveal');
  const talk=document.createElement('div');talk.className='case-discussion';panel.append(talk);
  (r.discussion||[]).forEach(line=>{const row=document.createElement('div');row.className='case-line '+speakerClass(line.speaker);const who=document.createElement('small');L10n.set(who,speakerName(line.speaker));const txt=document.createElement('p');appendTextWithNames(txt,line.text);row.append(who,txt);talk.append(row);});
  const solvedActions=document.createElement('div');solvedActions.className='case-actions';panel.append(solvedActions);
  solvedActions.append(button(p.step===t.rounds.length-1?CASE_COPY.finish:CASE_COPY.next,'small-btn case-next',()=>{
   if(p.step===t.rounds.length-1){state.flags.caseComplete=true;advanceActiveTask();return;}
   Object.assign(p,{step:p.step+1,selected:[],answer:null,solved:false,feedback:'',hint:false,discussion:false,scroll:0});save();render();
  }));
 }else{
  addNote('question','question:'+key+':'+p.step,r.title,r.setup+'\n'+r.question);
  panel.append(button(NOTE_COPY.discuss,'small-btn case-discuss',()=>{p.discussion=!p.discussion;if(p.discussion)addCaseGuideNotes(t,p);save();render();}));
  const guide=CASE_GUIDES[p.step];
  if(guide&&p.discussion)discussionBlock(panel,guide.talk.map(line=>({speaker:line[0],text:line[1]})));
  // 操作说明收进灯泡，面板只保留证据和推理。
  const cards=document.createElement('div');cards.className='case-cards';panel.append(cards);
  for(const e of r.evidence){
   const b=button('','evidence-card',()=>{const pos=p.selected.indexOf(e.id);if(pos>=0)p.selected.splice(pos,1);else if(p.selected.length<2)p.selected.push(e.id);else{p.feedback=CASE_COPY.tooMany;}save();render();});
   b.dataset.evidence=e.id;b.setAttribute('aria-pressed',String(p.selected.includes(e.id)));const title=document.createElement('strong');appendTextWithNames(title,e.title);const text=document.createElement('span');appendTextWithNames(text,e.text);b.append(title,text);cards.append(b);
  }
  put('p',r.question,'case-question');const opts=document.createElement('div');opts.className='case-options';panel.append(opts);
  r.answers.forEach((a,i)=>{const b=button(a,'case-answer',()=>{p.answer=i;save();render();});b.dataset.answer=i;b.setAttribute('aria-pressed',String(p.answer===i));opts.append(b);});
  const status=put('p',p.feedback,'case-feedback');status.setAttribute('role','status');
  // 旧存档的已展开提示不再自动出现。
  const actions=document.createElement('div');actions.className='case-actions';panel.append(actions);
  actions.append(button(CASE_COPY.verify,'small-btn case-verify',()=>{
   if(p.selected.length!==2||p.answer===null)p.feedback=CASE_COPY.incomplete;
   else if(p.answer===r.correct&&r.pair.every(id=>p.selected.includes(id))){
    p.solved=true;p.feedback='';p.scroll=0;addLog('case:'+key+':'+p.step,'调查',r.reveal,['me','karwin']);recordCaseResult(r,p.step);
   }else if(p.answer!==r.correct&&r.pair.every(id=>p.selected.includes(id)))p.feedback=NOTE_COPY.reasonWrong+r.mismatch+'\n'+NOTE_COPY.retry;
   else p.feedback=NOTE_COPY.pairWrong+r.mismatch+'\n'+NOTE_COPY.retry;
   if(p.feedback)addNote('attempt','attempt:'+key+':'+p.step+':'+state.notebook.length,r.title,NOTE_COPY.selection+p.selected.map(id=>r.evidence.find(e=>e.id===id)?.title||id).join(' + ')+'\n'+NOTE_COPY.answer+(r.answers[p.answer]||'—')+'\n'+p.feedback);
   save();render();const status=$('.case-feedback');if(status)status.scrollIntoView({block:'nearest'});
  }));
 }
 panel.append(button(NOTE_COPY.review,'small-btn case-notebook',()=>openNotebook('reasoning')));
 $('#hotspots').append(panel);panel.scrollTop=p.scroll||0;panel.onscroll=()=>{p.scroll=panel.scrollTop;};
}
function renderInventory(){$('#items').replaceChildren();state.inv.forEach(id=>{const b=button(ITEM_NAMES[id]||id,'item'+(state.selected===id?' selected':''),()=>{state.selected=id;save();renderInventory();openItemDescription(id);});b.dataset.item=id;$('#items').append(b);});if(state.inv.length===0){const empty=document.createElement('span');empty.className='no-items';L10n.set(empty,'暂无物品');$('#items').append(empty);}}
function openModal(title){$('#modalBody').replaceChildren();$('#modalBody').className='';$('#modal').hidden=false;$('.modal-card').scrollTop=0;const h=document.createElement('h2');appendTextWithNames(h,title);$('#modalBody').append(h);return $('#modalBody');}
function closeModal(){$('#modal').hidden=true;}
function openChat(topic){const msgs=CHATS[topic];if(!msgs)throw Error('未知聊天主题');
 let i=state.chatProgress[topic]||0;if(!Number.isInteger(i)||i<0||i>msgs.length){i=0;state.chatProgress[topic]=0;toast('该聊天进度不可用，已从头打开');}
 const replies=state.chatChoices[topic]||(state.chatChoices[topic]={});const m=openModal('聊天');
 const shell=document.createElement('div');shell.className='chat-shell';const body=document.createElement('div');body.id='chatBody';body.className='chat-body';const ctl=document.createElement('div');ctl.id='chatCtl';ctl.className='chat-controls';shell.append(body,ctl);m.append(shell);
 function bubble(who,text){const d=document.createElement('div');d.className='bubble '+speakerClass(who);const small=document.createElement('small');appendTextWithNames(small,speakerName(who));const t=document.createElement('span');appendTextWithNames(t,text);d.append(small,t);body.append(d);}
 function paint(){body.replaceChildren();msgs.slice(0,i).forEach((n,k)=>{bubble(n.speaker,n.text);if(n.choices&&replies[k]!==undefined)bubble('我',n.choices[replies[k]].text);});ctl.replaceChildren();
 const pending=i>0&&msgs[i-1].choices&&replies[i-1]===undefined;
 if(pending)msgs[i-1].choices.forEach((o,k)=>ctl.append(button(o.text,'chat-choice',()=>{replies[i-1]=k;Object.assign(state.flags,o.set||{});addLog('chat:'+topic+':'+(i-1)+':reply','我',o.text);addNote('choice','chat-choice:'+topic+':'+(i-1)+':'+k,'聊天中的选择',o.text);save();paint();})));
 else if(i<msgs.length)ctl.append(button('继续','chat-next',()=>{addLog('chat:'+topic+':'+i,msgs[i].speaker,msgs[i].text);i++;state.chatProgress[topic]=i;save();paint();}));
 else ctl.append(button('结束对话','chat-finish',()=>{closeModal();advancePhase();}));body.scrollTop=body.scrollHeight;
 }paint();save();
}
function finish(id){const e=id?ENDINGS.find(x=>x.id===id):ENDINGS.find(x=>x.when(state));if(!e)throw Error('没有匹配结局');state.phase='end';state.ending=e.id;recordCaseDiary(CHAPTERS.length-1,e.id);if(!state.endings.includes(e.id))state.endings.push(e.id);addNote('ending','ending:'+e.id,'抵达结局 · '+e.title,e.tag+'\n\n'+e.text+'\n\n'+NOTE_COPY.complete);save();render();}
function renderEnding(){const e=ENDINGS.find(x=>x.id===state.ending);$('#dialogue').hidden=true;$('#objective').hidden=true;$('.inventory').hidden=true;$('#ending').hidden=false;L10n.set($('#endingTag'),e.tag);L10n.set($('#endingTitle'),e.title);$('#endingText').replaceChildren();appendTextWithNames($('#endingText'),e.text);}
function startNew(){const endings=state.endings.slice();state=fresh();state.endings=endings;enterChapter(0);}
function openLog(){const m=openModal('对白回看');state.log.forEach(l=>{const d=document.createElement('div');d.className='log-entry';const name=document.createElement('small');appendTextWithNames(name,speakerName(l.who));d.append(name);appendTextWithNames(d,l.text);m.append(d);});}
function openChapters(){const m=openModal('章节');CHAPTERS.forEach((c,i)=>{const b=button(String(i+1).padStart(2,'0')+' · '+c.title,'chapter-link',()=>{const cp=state.checkpoints[i];if(!cp){toast('尚无该章起点，请从头开始');return;}const archive={notebook:state.notebook,personalNotes:state.personalNotes,diaryRevision:1,caseDiary:state.caseDiary};Object.assign(state,clone(cp),archive);state.ch=i;state.phase='intro';state.cursor=0;state.field=null;state.reprise=null;state.nightReplay=null;state.selected=null;state.ending=null;for(const k of Object.keys(state.checkpoints))if(Number(k)>i)delete state.checkpoints[k];state.unlocked=i;state.lastRewind=null;state.pendingRewind=false;closeModal();save();render();});b.disabled=i>state.unlocked||!state.checkpoints[i];m.append(b);});}
$('#startBtn').onclick=startNew;$('#replayBtn').onclick=startNew;
$('#continueBtn').onclick=()=>{if(load()){render();if(state.migrationNotice){toast(CASE_COPY.migrated);state.migrationNotice=false;save();}}else startNew();};
$('#memoryBtn').onclick=openMemory;
$('#hintBtn').onclick=openHint;
$('#notebookBtn').onclick=()=>openNotebook();
$('#nextBtn').onclick=advance;$('#closeModal').onclick=closeModal;$('.modal-shade').onclick=closeModal;
$('#logBtn').onclick=openLog;$('#chapterBtn').onclick=openChapters;$('#endingChapterBtn').onclick=openChapters;
$('#helpBtn').onclick=()=>{const p=document.createElement('p');appendTextWithNames(p,MEMORY_COPY.help);openModal('怎么玩').append(p);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();return;}if(![' ','Enter'].includes(e.key)||e.repeat)return;
 if(e.target.closest('button,input,textarea,select,[contenteditable]'))return;
 if($('#play').hidden||!$('#modal').hidden||$('#dialogue').hidden||$('#nextBtn').hidden||!$('#ending').hidden||$('#deathOverlay').classList.contains('show'))return;e.preventDefault();advance();});
if(load())$('#continueBtn').hidden=false;
