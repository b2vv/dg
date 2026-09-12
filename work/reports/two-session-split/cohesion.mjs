import fs from 'node:fs';
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8').split('\n');

// class members start at exactly 2 spaces of indent and end at a line that is exactly "  }"
const memberRe = /^ {2}(?:(private|public|protected)\s+)?(?:(static)\s+)?(?:(readonly)\s+)?(?:(async)\s+)?([A-Za-z_][\w]*)\s*(?:<[^>]*>)?\(/;
const fieldRe  = /^ {2}(?:(private|public|protected)\s+)?(?:readonly\s+)?([A-Za-z_][\w]*)\s*[:=]/;

const methods = [];
const fields = [];
for (let i = 0; i < src.length; i++) {
  const line = src[i];
  const m = line.match(memberRe);
  if (m && !/^\s*(if|for|while|switch|catch|return|else)\b/.test(line.trim())) {
    // find end
    let j = i;
    for (j = i; j < src.length; j++) if (src[j] === '  }') break;
    methods.push({ name: m[5], vis: m[1] ?? 'public', start: i + 1, end: j + 1, len: j - i + 1 });
    i = j;
    continue;
  }
  const f = line.match(fieldRe);
  if (f) fields.push(f[2]);
}

for (const mth of methods) {
  const body = src.slice(mth.start, mth.end).join('\n');
  const touched = new Set();
  for (const mm of body.matchAll(/this\.([A-Za-z_][\w]*)/g)) touched.add(mm[1]);
  mth.touch = [...touched].sort();
}

methods.sort((a, b) => b.len - a.len);
console.log('name'.padEnd(32), 'vis'.padEnd(8), 'len'.padStart(5), 'this'.padStart(5), '  members touched');
for (const m of methods) {
  console.log(m.name.padEnd(32), m.vis.padEnd(8), String(m.len).padStart(5), String(m.touch.length).padStart(5), '  ' + m.touch.join(' '));
}
console.log('\n--- fields:', fields.length, '| methods:', methods.length, '| total lines:', src.length);
