'use strict';
// Localization is presentation-only. Story strings, IDs, branches and saved progress stay Chinese.
window.L10n=(()=>{
 const key='vn:yixiang-echo-7f3a2b8c:language',catalog=window.EN_TEXT||{},hasHan=/[\u3400-\u9fff]/;
 let language='zh';try{language=localStorage.getItem(key)==='en'?'en':'zh';}catch(e){}
 const records=new Set(),sources=new WeakMap(),attributes=new WeakMap(),cache=new Map(),missing=new Set();
 const trie={};for(const [zh,en] of Object.entries(catalog)){if(!zh)continue;let n=trie;for(const ch of zh)n=n[ch]||(n[ch]={});n.$=en;}
 function english(value){
  const s=String(value??'');if(!s||!hasHan.test(s))return s;if(cache.has(s))return cache.get(s);
  if(Object.hasOwn(catalog,s)){cache.set(s,catalog[s]);return catalog[s];}
  const trimmed=s.trim();if(trimmed!==s&&Object.hasOwn(catalog,trimmed)){const v=s.slice(0,s.indexOf(trimmed))+catalog[trimmed]+s.slice(s.indexOf(trimmed)+trimmed.length);cache.set(s,v);return v;}
  let out='';for(let i=0;i<s.length;){let node=trie,j=i,best=-1,replacement='';while(j<s.length&&node[s[j]]){node=node[s[j++]];if(Object.hasOwn(node,'$')){best=j;replacement=node.$;}}
   if(best>=0){out+=replacement;i=best;}else out+=s[i++];
  }
  if(hasHan.test(out))missing.add(s);cache.set(s,out);return out;
 }
 function text(value){return language==='en'?english(value):String(value??'');}
 function source(el){if(!el)return '';const r=sources.get(el);if(r)return r.zh;if(el.nodeType===Node.TEXT_NODE)return el.data;return Array.from(el.childNodes||[],source).join('');}
 function paint(r){
  const v=text(r.zh);if(r.kind==='attribute'){if(r.node.getAttribute(r.name)!==v)r.node.setAttribute(r.name,v);return;}
  if(r.kind==='text'){if(r.node.data!==v)r.node.data=v;return;}
  const fragment=document.createDocumentFragment();let pos=0;
  const re=language==='en'?/Jiang Lin/g:/蒋麟/g;
  for(const match of v.matchAll(re)){if(match.index>pos)fragment.append(document.createTextNode(v.slice(pos,match.index)));const name=document.createElement('span');name.className='male-name';name.textContent=match[0];fragment.append(name);pos=match.index+match[0].length;}
  if(pos<v.length)fragment.append(document.createTextNode(v.slice(pos)));r.node.replaceChildren(fragment);
 }
 function record(node,zh,kind='text'){const r={node,zh:String(zh??''),kind};records.add(r);sources.set(node,r);paint(r);return r;}
 function append(parent,value){if(value===undefined||value===null){parent.replaceChildren();return parent;}const span=document.createElement('span');span.className='localized-copy';record(span,value,'rich');parent.append(span);return parent;}
 function set(el,value){el.replaceChildren();const node=document.createTextNode('');record(node,value);el.append(node);return value;}
 function attr(el,name,value){let map=attributes.get(el);if(!map){map={};attributes.set(el,map);}const old=map[name];if(old){old.zh=String(value??'');paint(old);}else{const r={node:el,name,zh:String(value??''),kind:'attribute'};map[name]=r;records.add(r);paint(r);}return value;}
 function nativeStatic(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];let n;
  while(n=walker.nextNode()){if(!sources.has(n)&&!n.parentElement?.closest('script,style,textarea,input,#languageBtn,.localized-copy,[data-no-translate]')&&hasHan.test(n.data))nodes.push(n);}
  nodes.forEach(n=>record(n,n.data));
  for(const el of root.querySelectorAll('[aria-label],[title],[placeholder],[data-tooltip]')){if(el.id==='languageBtn')continue;for(const name of ['aria-label','title','placeholder','data-tooltip']){const value=el.getAttribute(name);if(value&&hasHan.test(value)&&!attributes.get(el)?.[name])attr(el,name,value);}}
 }
 function updateButton(){const b=document.getElementById('languageBtn');if(!b)return;b.textContent=language==='zh'?'EN':'ZH';const label=language==='zh'?'Switch to English':'Switch to Chinese';b.setAttribute('aria-label',label);b.setAttribute('title',label);b.dataset.tooltip=label;b.dataset.language=language;}
 function choose(next){if(!['zh','en'].includes(next))return;language=next;document.documentElement.lang=next==='en'?'en':'zh-CN';document.documentElement.dataset.language=next;
  // Update existing nodes without re-rendering: preserves open panels, scroll, choices and input focus.
  for(const r of records){if(!r.node.isConnected){records.delete(r);continue;}paint(r);}
  document.title=next==='en'?'Echoes':'遗响';updateButton();try{localStorage.setItem(key,next);}catch(e){}
  document.dispatchEvent(new CustomEvent('languagechange',{detail:{language:next}}));
 }
 function init(){nativeStatic(document.body);const b=document.getElementById('languageBtn');b.onclick=e=>{e.preventDefault();e.stopPropagation();choose(language==='zh'?'en':'zh');};choose(language);}
 document.documentElement.lang=language==='en'?'en':'zh-CN';document.documentElement.dataset.language=language;
 document.addEventListener('DOMContentLoaded',init,{once:true});
 setInterval(()=>{for(const r of records)if(!r.node.isConnected)records.delete(r);},10000);
 return {text,english,source,append,set,attr,choose,get language(){return language;},get missing(){return [...missing];},get size(){return records.size;},key};
})();
