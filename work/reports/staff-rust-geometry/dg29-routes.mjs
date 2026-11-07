import { readFileSync } from 'node:fs';
const old = JSON.parse(readFileSync('/tmp/dg29-golden-old.json','utf8'));
const neu = JSON.parse(readFileSync('/tmp/dg29-golden-new.json','utf8'));
const s='staff-tree';
const n=neu[s].live.routes, o=old[s].live.routes;
for(const lod of ['near','mid','far']){
  console.log(`\n=== ${s} routes.${lod}: OLD ${o[lod]?.length} vs NEW ${n[lod]?.length} ===`);
  const nn=n[lod]||[], oo=o[lod]||[];
  const m=Math.max(oo.length,nn.length);
  for(let i=0;i<m;i++){
    const a=oo[i], b=nn[i];
    const af=a?`${a.fromId}->${a.toId}[${a.kind}] pts=${JSON.stringify(a.points)}`:'—';
    const bf=b?`${b.fromId}->${b.toId}[${b.kind}] pts=${JSON.stringify(b.points)}`:'—';
    console.log(`OLD: ${af}`);
    console.log(`NEW: ${bf}`);
  }
}
// staff-1m sizes
console.log('\n=== staff-1m canvas OLD vs NEW ===', old['staff-1m'].live.width, old['staff-1m'].live.height, '|', neu['staff-1m'].live.width, neu['staff-1m'].live.height);
console.log('staff-1m nodes OLD vs NEW count:', old['staff-1m'].live.nodes.length, neu['staff-1m'].live.nodes.length);
