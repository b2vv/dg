import { readFileSync } from 'node:fs';
const old = JSON.parse(readFileSync('/tmp/dg29-golden-old.json','utf8'));
const neu = JSON.parse(readFileSync('/tmp/dg29-golden-new.json','utf8'));
const changes = [];
function walk(a, b, path) {
  if (a === b) return;
  const ta = Array.isArray(a) ? 'arr' : a === null ? 'null' : typeof a;
  const tb = Array.isArray(b) ? 'arr' : b === null ? 'null' : typeof b;
  if (ta !== tb) { changes.push(path + ` [type ${ta}→${tb}]`); return; }
  if (ta === 'arr') {
    if (a.length !== b.length) changes.push(path + `.length ${a.length}→${b.length}`);
    const n = Math.max(a.length, b.length);
    for (let i=0;i<n;i++) walk(a[i], b[i], `${path}[${i}]`);
    return;
  }
  if (ta === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) walk(a[k], b[k], path?`${path}.${k}`:k);
    return;
  }
  changes.push(`${path}: ${JSON.stringify(a)}→${JSON.stringify(b)}`);
}
walk(old, neu, '');
// Group by normalized pattern (strip indices + scene keys)
const buckets = new Map();
for (const c of changes) {
  const norm = c.replace(/\[\d+\]/g,'[]').replace(/^[^.]+\./, 'SCENE.');
  buckets.set(norm, (buckets.get(norm)||0)+1);
}
console.log('TOTAL leaf changes:', changes.length);
console.log('--- grouped by pattern ---');
[...buckets.entries()].sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`${v}\t${k}`));
console.log('--- sample 20 raw ---');
changes.slice(0,20).forEach(c=>console.log(c));
