'use strict';
function noteElement(parent,tag,text,cls){const e=document.createElement(tag);if(text!==undefined){if(tag==='option')L10n.set(e,text);else if(!['textarea','input'].includes(tag))appendTextWithNames(e,text);}if(cls)e.className=cls;parent.append(e);return e;}
function taskHotspots(t){return t?.kind==='sequence'?t.steps.flatMap(s=>s.hotspots||[]):(t?.hotspots||[]);}
function itemRecord(id){for(const c of CHAPTERS){const h=taskHotspots(c.task).find(h=>h.give===id);if(h)return {chapter:c,h};}const f=FIELD_SCENES.find(s=>s.reward?.give===id);if(f)return {chapter:CHAPTERS.find(c=>c.id===f.chapter),h:{investText:f.reward.investText,label:f.reward.label}};return null;}
function itemOriginal(id){const r=itemRecord(id);return r?.h.investText||r?.h.label||ITEM_NAMES[id]||'';}
function knownItemIds(){const ids=new Set(state.inv);for(const n of state.notebook||[]){if(n.itemId)ids.add(n.itemId);if(n.type!=='clue')continue;for(const [id,d] of Object.entries(ITEM_DESCRIPTIONS)){const r=itemRecord(id);if(n.title===d[0]||n.title===ITEM_NAMES[id]||n.key==='legacy-item:'+id||n.key?.endsWith(':clue:'+r?.chapter.id+':'+r?.h.id))ids.add(id);}}return [...ids].filter(id=>ITEM_DESCRIPTIONS[id]);}
function hydrateNotebook(){
 if(state.notebookFormat===2)return;
 state.notebook=Array.isArray(state.notebook)?state.notebook:[];
 const known=new Set(state.notebook.map(n=>n.text));let count=0;
 const add=(type,title,text,meta={})=>{if(!text||known.has(text))return;known.add(text);state.notebook.push({key:'restored:'+state.notebook.length,type,loop:'—',chapter:'旧存档记录',time:'',title,text,...meta});count++;};
 for(const e of state.log||[])if(e.who!=='系统')add('dialogue',speakerName(e.who),e.text);
 for(const id of state.inv){const r=itemRecord(id);add('clue',ITEM_NAMES[id],itemOriginal(id),{itemId:id,chapter:r?.chapter.title||'',time:ITEM_DESCRIPTIONS[id]?.[0]||''});}
 for(const e of state.memories.me||[]){if(e.clue){const match=CHAPTERS.flatMap(c=>(c.task?.hotspots||[]).map(h=>({c,h}))).find(x=>e.id==='clue:'+x.c.id+':'+x.h.id);add('clue',match?ITEM_NAMES[match.h.give]:NOTE_COPY.original,e.text,match?{itemId:match.h.give,chapter:match.c.title}:{});}}
 for(const [cid,p] of Object.entries(state.caseProgress||{})){const c=CHAPTERS.find(c=>c.id===cid),t=c?.task?.kind==='sequence'?c.task.steps.find(t=>t.kind==='caseboard'):c?.task;if(t?.kind!=='caseboard'||!Number.isInteger(p.step))continue;t.rounds.forEach((r,i)=>{if(i<p.step||(i===p.step&&p.solved)){const g=CASE_GUIDES[i];add('deduction',r.title,r.reveal+'\n'+NOTE_COPY.boundary+'：'+g.boundary,{chapter:c.title});}});}
 if(count)state.notebook.unshift({key:'legacy-notice-v2',type:'hint',loop:'—',chapter:'旧存档',title:'旧存档笔记补录',text:NOTE_COPY.legacy});
 state.notebookFormat=2;
}
function openItemPreview(h,onConfirm){
 const field=h.field?fieldScene(h.field):null,id=h.give||fieldItem(field)?.give;
 const m=openModal(ITEM_NAMES[id]||h.label);m.classList.add('item-preview');
 noteElement(m,'p',field?ITEM_PREVIEW_COPY.onsite:ITEM_PREVIEW_COPY.pending,'note-status');
 noteElement(m,'h3',ITEM_PREVIEW_COPY.title);noteElement(m,'p',ITEM_BRIEFS[id]||h.label,'item-brief');
 if(!field&&h.investText){noteElement(m,'h3',NOTE_COPY.original);noteElement(m,'p',h.investText,'item-original');}
 noteElement(m,'h3',field?ITEM_EXPLANATION_COPY.purpose:ITEM_EXPLANATION_COPY.title);noteElement(m,'p',(field?ITEM_PREVIEW_EXPLANATIONS[id]:ITEM_EXPLANATIONS[id])||'','item-explanation');
 const actions=noteElement(m,'div',undefined,'note-controls');let confirmed=false;
 const confirm=button(field?ITEM_PREVIEW_COPY.inspect:ITEM_PREVIEW_COPY.collect,'small-btn item-preview-confirm',()=>{if(confirmed)return;confirmed=true;closeModal();onConfirm();});
 actions.append(confirm,button(ITEM_PREVIEW_COPY.cancel,'small-btn',closeModal));
}
function openItemDescription(id,fromNotebook=false){
 if(!knownItemIds().includes(id)){toast(NOTE_COPY.unknown);return;}
 const r=itemRecord(id),d=ITEM_DESCRIPTIONS[id];const m=openModal(ITEM_NAMES[id]);m.classList.add('item-detail');
 noteElement(m,'p',state.inv.includes(id)?NOTE_COPY.held:NOTE_COPY.archived,'note-status');
 noteElement(m,'h3',ITEM_PREVIEW_COPY.title);noteElement(m,'p',ITEM_BRIEFS[id]||r?.h.label||ITEM_NAMES[id],'item-brief');
 noteElement(m,'h3',NOTE_COPY.source);noteElement(m,'p',d[0]);
 noteElement(m,'h3',NOTE_COPY.original);noteElement(m,'p',itemOriginal(id),'item-original');
 noteElement(m,'h3',ITEM_EXPLANATION_COPY.title);noteElement(m,'p',ITEM_EXPLANATIONS[id]||d[1],'item-explanation');
 const actions=noteElement(m,'div',undefined,'note-controls');actions.append(button(NOTE_COPY.return,'small-btn',()=>openNotebook('clues')));actions.append(button(NOTE_COPY.close,'small-btn',closeModal));
}
function recordItemExplanation(id){
 const text=ITEM_EXPLANATIONS[id];if(!text)return;
 addNote('discussion','item-explanation:'+id,ITEM_NAMES[id]+' · '+ITEM_EXPLANATION_COPY.title,text,{itemId:id});
 MemoryRules.remember(state,{id:state.flags.loop+':item-explanation:'+id,who:'我',text,clue:true},['me']);
}
function recordCaseDiary(ch,ending=null,s=state){
 const c=CHAPTERS[ch];if(!c)return;
 s.caseDiary=s.caseDiary||{};
 if(c.id==='truth'){if(ENDING_DIARIES[ending])s.caseDiary.truth=ending;}
 else if(CHAPTER_DIARIES[c.id])s.caseDiary[c.id]=true;
 s.diaryRevision=1;
}
function normalizeCaseDiary(s){
 const legacy=s.diaryRevision!==1,raw=s.caseDiary;
 s.caseDiary={};
 if(raw&&typeof raw==='object'&&!Array.isArray(raw))for(const c of CHAPTERS){if(c.id==='truth'){if(ENDING_DIARIES[raw.truth])s.caseDiary.truth=raw.truth;}else if(raw[c.id]===true&&CHAPTER_DIARIES[c.id])s.caseDiary[c.id]=true;}
 if(legacy){
  // Only prior chapters are complete; a current chapter or historical ending is not proof.
  let reached=Math.max(s.ch,Number.isInteger(s.unlocked)?Math.min(s.unlocked,CHAPTERS.length-1):0);
  for(const n of s.notebook||[]){const m=n.type==='chapter'&&String(n.key||'').match(/(?:^|:)chapter:(\d+)$/);if(m&&Number(m[1])<CHAPTERS.length)reached=Math.max(reached,Number(m[1]));}
  for(let i=0;i<reached;i++)recordCaseDiary(i,null,s);
  if(s.phase==='end')recordCaseDiary(CHAPTERS.length-1,s.ending,s);
 }
 s.diaryRevision=1;
}
function caseDiaryEntries(s=state){return CHAPTERS.flatMap((c,i)=>{const mark=s.caseDiary?.[c.id],page=c.id==='truth'?ENDING_DIARIES[mark]:mark===true?CHAPTER_DIARIES[c.id]:null;return page?[{...page,id:c.id,chapter:c.title,number:i+1}]:[];});}
function renderCaseDiary(m){
 m.classList.add('case-diary');noteElement(m,'h3',DIARY_COPY.title,'diary-title');
 const entries=caseDiaryEntries();noteElement(m,'p',DIARY_COPY.pages+' '+entries.length+' '+DIARY_COPY.unit,'note-status');
 if(!entries.length){noteElement(m,'p',DIARY_COPY.empty,'diary-empty');return;}
 for(const entry of entries){const page=noteElement(m,'article',undefined,'diary-entry');page.dataset.chapter=entry.id;noteElement(page,'small',String(entry.number).padStart(2,'0')+' · '+entry.chapter+' / '+entry.date);noteElement(page,'h4',entry.title);for(const paragraph of entry.text.split('\n').filter(Boolean))noteElement(page,'p',paragraph);}
 if(!state.caseDiary?.truth)noteElement(m,'p',DIARY_COPY.next,'diary-empty');
}
function notebookText(){return [NOTE_COPY.title,NOTE_COPY.scope,...(state.notebook||[]).map(n=>'['+(NOTE_COPY.types[n.type]||n.type)+'] '+(n.chapter||'')+' · '+NOTE_COPY.loop+' '+n.loop+'\n'+n.title+'\n'+n.text),DIARY_COPY.title,...caseDiaryEntries().map(e=>e.chapter+' · '+e.date+'\n'+e.title+'\n'+e.text),NOTE_COPY.personal].map(L10n.text).concat(state.personalNotes||'').join('\n\n');}
function exportNotebook(){const blob=new Blob(['\ufeff'+notebookText()],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=L10n.language==='en'?'Echoes-notebook.txt':NOTE_COPY.exportFile;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function noteCurrentGoal(){
 if($('#cover')&&!$('#cover').hidden)return NOTE_COPY.start;
 if(state.phase==='end')return NOTE_COPY.complete;
 if(state.reprise)return REPRISE_COPY.goal;
 if(state.field){const f=state.field;const stageMap={recall:FIELD_COPY.recall,intro:fieldScene(f.id).title,observeChoice:FIELD_COPY.observe,finding:FIELD_COPY.observe,takeChoice:FIELD_COPY.take,take:FIELD_COPY.take,communicateChoice:FIELD_COPY.route,discussion:FIELD_COPY.sync,route:FIELD_COPY.route,success:FIELD_COPY.saved};return fieldScene(f.id).title+' · '+(stageMap[f.stage]||FIELD_COPY.title);}
 if(state.phase==='task'){const t=activeTask();return t?.kind==='caseboard'?t.rounds[state.caseProgress[cur().id]?.step||0].question:t?.objective||cur().title;}
 const n=cur()[state.phase]?.[state.cursor];return n?.choices?n.text:cur().title+' · '+(canonicalText($('#chLoc'))||cur().loc);
}
function openOldCaseReview(){
 const m=openModal(OLD_CASE_CONTEXT.title);m.classList.add('notebook-body');
 noteElement(m,'p','不会改变剧情进度，只复盘目前已知的旧案信息。','notebook-scope');
 discussionBlock(m,OLD_CASE_CONTEXT.talk.map(line=>({speaker:line[0],text:line[1]})));
 const controls=noteElement(m,'div',undefined,'note-controls');controls.append(button(NOTE_COPY.close,'small-btn',closeModal));
}
function openNotebook(tab='overview'){
 const m=openModal(NOTE_COPY.title);m.classList.add('notebook-body');
 noteElement(m,'p',tab==='diary'?DIARY_COPY.scope:NOTE_COPY.scope,'notebook-scope');
 const tabs=noteElement(m,'div',undefined,'note-tabs');for(const [id,label] of NOTE_COPY.tabs){const b=button(label,'small-btn note-tab',()=>openNotebook(id));b.dataset.tab=id;b.setAttribute('aria-pressed',String(id===tab));tabs.append(b);}
 const action=noteElement(m,'div',undefined,'note-controls');action.append(button(NOTE_COPY.export,'small-btn export-notes',exportNotebook));
 if(tab==='diary'){renderCaseDiary(m);return;}
 if(tab==='personal'){noteElement(m,'p',NOTE_COPY.draft);const input=noteElement(m,'textarea');input.id='personalNotes';L10n.attr(input,'aria-label',NOTE_COPY.personal);input.value=state.personalNotes||'';const saved=noteElement(m,'p',NOTE_COPY.saved,'note-status');input.addEventListener('input',()=>{state.personalNotes=input.value;save();L10n.set(saved,storageOK?NOTE_COPY.saved:'当前浏览器无法保存');});return;}
 if(tab==='overview'){
  const goal=noteElement(m,'section',undefined,'note-goal');noteElement(goal,'small',NOTE_COPY.current);noteElement(goal,'p',noteCurrentGoal());
  if(state.ch>=CHAPTERS.findIndex(c=>c.id==='cafe')){
   const controls=noteElement(m,'div',undefined,'note-controls');controls.append(button(OLD_CASE_CONTEXT.button,'small-btn',openOldCaseReview));
  }
  noteElement(m,'h3',NOTE_COPY.outline);
 }
 if(tab==='clues'){
  const ids=knownItemIds();if(!ids.length)noteElement(m,'p',NOTE_COPY.empty);
  for(const id of ids){const card=noteElement(m,'section',undefined,'note-entry');noteElement(card,'small',state.inv.includes(id)?NOTE_COPY.held:NOTE_COPY.archived);card.append(button(ITEM_NAMES[id],'clue-detail-button',()=>openItemDescription(id,true)));noteElement(card,'p',itemOriginal(id));noteElement(card,'p',ITEM_EXPLANATIONS[id]||'','item-explanation');}
  return;
 }
 const filter=noteElement(m,'div',undefined,'note-controls');const search=noteElement(filter,'input');search.type='search';L10n.attr(search,'placeholder',NOTE_COPY.search);L10n.attr(search,'aria-label',NOTE_COPY.search);
 const select=noteElement(filter,'select');L10n.attr(select,'aria-label',NOTE_COPY.all);const all=noteElement(select,'option',NOTE_COPY.all);all.value='';for(const ch of new Set((state.notebook||[]).map(n=>n.chapter).filter(Boolean))){const op=noteElement(select,'option',ch);op.value=ch;}
 const list=noteElement(m,'div',undefined,'note-list');const draw=()=>{list.replaceChildren();let notes=(state.notebook||[]).filter(n=>tab==='overview'?n.type!=='dialogue'&&n.type!=='discussion':tab==='reasoning'?['question','discussion','deduction','attempt','hint'].includes(n.type):true);if(select.value)notes=notes.filter(n=>n.chapter===select.value);const q=search.value.trim().toLowerCase();if(q)notes=notes.filter(n=>(n.title+' '+n.text+' '+L10n.english(n.title+' '+n.text)).toLowerCase().includes(q));if(!notes.length)noteElement(list,'p',NOTE_COPY.empty);for(const n of notes){const box=noteElement(list,'details',undefined,'note-entry');const summary=noteElement(box,'summary',n.title);noteElement(box,'small',(NOTE_COPY.types[n.type]||n.type)+' · '+n.chapter+' · '+NOTE_COPY.loop+' '+n.loop+(n.time?' · '+n.time:''));noteElement(box,'p',n.text);if(tab==='overview'&&['deduction','question','ending'].includes(n.type))box.open=true;}};
 search.oninput=draw;select.onchange=draw;draw();
}
function discussionBlock(parent,lines){const box=noteElement(parent,'div',undefined,'case-discussion');for(const line of lines){const row=noteElement(box,'div',undefined,'case-line '+speakerClass(line.speaker));noteElement(row,'small',speakerName(line.speaker));noteElement(row,'p',line.text);}return box;}
function recordCaseResult(r,step){const g=CASE_GUIDES[step];const prefix=cur().id+':'+step;addNote('deduction','result:'+prefix,NOTE_COPY.conclusion+' · '+r.title,NOTE_COPY.selection+r.pair.map(id=>r.evidence.find(e=>e.id===id)?.title||id).join(' + ')+'\n'+g.status+'\n'+r.reveal+'\n'+NOTE_COPY.chain+'：'+g.chain+'\n'+NOTE_COPY.boundary+'：'+g.boundary);for(const [i,line] of (r.discussion||[]).entries())addNote('discussion','postcase:'+prefix+':'+i,NOTE_COPY.discussion+' · '+r.title,line.speaker+'：'+line.text);}
