import type { DiagramPosition, DiagramReportLine } from '../../data/types.js';

/**
 * Head of each department = its first *detached root* — a member whose admin
 * parent lies outside the department (or has none). This is the only end that
 * the org→dept connector docks on the department frame top (`deptTop`, lines
 * spec §3.2/§8); every other member is reached at its card top.
 *
 * Roots are ordered by `positionId`, not by input order, so a host reordering
 * `positions` cannot change which member is the head — the routes stay
 * byte-identical across runs (H6). A department with no outside-rooted member
 * (e.g. an admin cycle closed inside it) is simply absent from the map, and the
 * caller falls back to the card-top port rather than crashing.
 */
export function resolveDeptHeads(
  positions: DiagramPosition[],
  reportLines: DiagramReportLine[],
): Map<string, string> {
  const deptOf = new Map<string, string | undefined>();
  for (const p of positions) deptOf.set(p.id, p.departmentId);

  // admin parent: reportLines fromId = manager, toId = report (self-links ignored).
  const adminParent = new Map<string, string>();
  for (const r of reportLines) {
    if (r.kind !== 'admin' || r.fromId === r.toId) continue;
    adminParent.set(r.toId, r.fromId);
  }

  const rootsByDept = new Map<string, string[]>();
  for (const p of positions) {
    const dept = p.departmentId;
    if (dept === undefined) continue;
    const parent = adminParent.get(p.id);
    if (parent !== undefined && deptOf.get(parent) === dept) continue; // parent inside dept → not a root
    const roots = rootsByDept.get(dept);
    if (roots) roots.push(p.id);
    else rootsByDept.set(dept, [p.id]);
  }

  const heads = new Map<string, string>();
  for (const [dept, roots] of rootsByDept) {
    roots.sort();
    heads.set(dept, roots[0]!);
  }
  return heads;
}
