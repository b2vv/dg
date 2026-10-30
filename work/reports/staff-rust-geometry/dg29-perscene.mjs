import { readFileSync } from 'node:fs';
const old = JSON.parse(readFileSync('/tmp/dg29-golden-old.json','utf8'));
const neu = JSON.parse(readFileSync('/tmp/dg29-golden-new.json','utf8'));
function diffs(a,b,cnt={n:0,byField:{}},field=null){
  if (a===b) return cnt;
  const ta=Array.isArray(a)?'arr':a===null?'null':typeof a;
  const tb=Array.isArray(b)?'arr':b===null?'null':typeof b;
  if(ta!==tb||ta!=='object'&&ta!=='arr'){cnt.n++;if(field)cnt.byField[field]=(cnt.byField[field]||0)+1;return cnt;}
  if(ta==='arr'){const m=Math.max(a.length,b.length);for(let i=0;i<m;i++)diffs(a[i],b[i],cnt,field);return cnt;}
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  for(const k of keys)diffs(a[k],b[k],cnt, field||k);
  return cnt;
}
for(const s of Object.keys(old)){
  const c=diffs(old[s].live, neu[s].live);
  const top=Object.entries(c.byField).sort((x,y)=>y[1]-x[1]).slice(0,4).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`${c.n===0?'✓':'✗'} ${s.padEnd(22)} diffs=${String(c.n).padStart(5)}  ${top}`);
}
