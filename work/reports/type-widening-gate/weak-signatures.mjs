import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = 'packages/sdk/src';
const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) files.push(p);
  }
})(root);

// 1. Іменовані рядкові юніони — саме вони є «вужчим типом, який існує».
const unions = new Map();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/export type (\w+)\s*=\s*((?:'[^']+'\s*\|\s*)+'[^']+')/g)) {
    unions.set(m[1], m[2].replace(/\s+/g, ' '));
  }
}

// 2. Експортовані сигнатури зі слабкими типами в параметрах.
const weak = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (!/^export (async )?function |^export const \w+ = \(/.test(line)) return;
    // зібрати сигнатуру до `{` або `=>`
    let sig = line, k = i;
    while (!/[{;]\s*$|=>\s*$/.test(sig) && k < lines.length - 1 && k - i < 12) sig += ' ' + lines[++k].trim();
    for (const m of sig.matchAll(/(\w+)\s*\??:\s*(string|unknown|any)\b/g)) {
      weak.push({ file: f, line: i + 1, param: m[1], type: m[2], sig: sig.slice(0, 110) });
    }
  });
}

console.log('ІМЕНОВАНІ РЯДКОВІ ЮНІОНИ:', unions.size);
for (const [n, v] of unions) console.log(`  ${n} = ${v.slice(0, 70)}`);
console.log('\nСЛАБКІ ПАРАМЕТРИ В ЕКСПОРТОВАНИХ СИГНАТУРАХ:', weak.length);
const byType = {};
for (const w of weak) byType[w.type] = (byType[w.type] ?? 0) + 1;
console.log('  за типом:', JSON.stringify(byType));
// підозрілі: ім'я параметра натякає на домен юніона
const domains = { lod: 'LodLevel', kind: 'NodeKind', mode: 'OrgDisplayMode', status: 'PositionStatus', format: 'ExportFormat', theme: 'ThemeName', scope: 'ExportScope' };
console.log('\n🔴 ПІДОЗРІЛІ (параметр має іменований юніон):');
let n = 0;
for (const w of weak) {
  const hit = Object.keys(domains).find((d) => w.param.toLowerCase().includes(d));
  if (hit && unions.has(domains[hit])) { n++; console.log(`  ${w.file}:${w.line} · ${w.param}: ${w.type} → мав би бути ${domains[hit]}`); }
}
if (n === 0) console.log('  нуль');
console.log('\nUNKNOWN/ANY у експортованих сигнатурах:');
for (const w of weak) if (w.type !== 'string') console.log(`  ${w.file}:${w.line} · ${w.param}: ${w.type}\n      ${w.sig}`);
