'use strict';
// Each bank contains only events that character observed or was explicitly told.
const MemoryRules = (() => {
  const copy = x => JSON.parse(JSON.stringify(x));
  const empty = () => ({me:[],karwin:[]});
  const merge = (...banks) => [...new Map(banks.flat().map(e=>[e.id,e])).values()];
  function init(s){s.memories=s.memories||empty();s.memoryBase=s.memoryBase||empty();s.recognized=!!s.recognized;}
  function remember(s,event,observers=['me']){init(s);for(const who of (s.recognized?['me','karwin']:observers))s.memories[who]=merge(s.memories[who],[copy(event)]);}
  function recognize(s){init(s);const all=merge(s.memories.me,s.memories.karwin);s.memories={me:copy(all),karwin:copy(all)};s.recognized=true;}
  function rewind(s,dead){init(s);if(s.recognized)recognize(s);else s.memories[dead]=copy(s.memoryBase[dead]);s.memoryBase=copy(s.memories);return {dead,retained:s.recognized?['me','karwin']:[dead==='me'?'karwin':'me'],shared:s.recognized};}
  return {init,remember,recognize,rewind};
})();
if(typeof module!=='undefined')module.exports=MemoryRules;
