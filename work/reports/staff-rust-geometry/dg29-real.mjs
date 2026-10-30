import { readFileSync } from 'node:fs';
const old = JSON.parse(readFileSync('/tmp/dg29-golden-old.json','utf8'));
const neu = JSON.parse(readFileSync('/tmp/dg29-golden-new.json','utf8'));
const TOL=1;
function diffs(a,b,field,topField,acc){
  if(a===b)return;
  const ta=Array.isArray(a)?'arr':a===null?'null':typeof a;
  const tb=Array.isArray(b)?'arr':b===null?'null':typeof b;
  if(ta==='number'&&tb==='number'){ if(Math.abs(a-b)>TOL){acc.push(topField);} return; }
  if(ta!==tb){acc.push(topField+`<type>`);return;}
  if(ta==='arr'){ if(a.length!==b.length)acc.push(topField+'.len'); const m=Math.max(a.length,b.length); for(let i=0;i<m;i++)diffs(a[i],b[i],field,topField,acc); return; }
  if(ta==='object'){ const keys=new Set([...Object.keys(a),...Object.keys(b)]); for(const k of keys)diffs(a[k],b[k],k,topField||k,acc); return; }
  acc.push(topField);
}
let grand=0;
for(const s of Object.keys(old)){
  const acc=[];
  // compare live fields except bands (expected FORK1 change)
  const o={...old[s].live}, n={...neu[s].live};
  delete o.bands; delete n.bands;
  diffs(o,n,null,null,acc);
  const by={}; acc.forEach(f=>by[f]=(by[f]||0)+1);
  grand+=acc.length;
  const top=Object.entries(by).sort((x,y)=>y[1]-x[1]).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`${acc.length===0?'✓':'✗'} ${s.padEnd(22)} REAL(>1px,excl bands)=${String(acc.length).padStart(5)}  ${top}`);
}
console.log('\nGRAND real diffs (excl bands, >1px):', grand);
