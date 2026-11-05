import type { DiagramPosition, DiagramReportLine } from '../data/types.js';

type SubordinateCounts = { childrenCount: number; allDescendantCount: number };

/** Counts every admin tree; distinct direct children, descendants each once. */
export function computeSubordinateCounts(
  positions: readonly DiagramPosition[],
  reportLines: readonly DiagramReportLine[],
): Map<string, SubordinateCounts> {
  const ids = new Set(positions.map((position) => position.id));
  const children = new Map<string, string[]>();
  for (const line of reportLines) {
    if (line.kind !== 'admin' || line.fromId === line.toId) continue;
    if (!ids.has(line.fromId) || !ids.has(line.toId)) continue;
    const list = children.get(line.fromId);
    if (list) list.push(line.toId);
    else children.set(line.fromId, [line.toId]);
  }
  const counts = new Map<string, SubordinateCounts>();
  for (const [id, direct] of children) {
    const visited = new Set([id]);
    const stack = [...direct];
    while (stack.length > 0) {
      const child = stack.pop();
      if (child === undefined || visited.has(child)) continue;
      visited.add(child);
      for (const descendant of children.get(child) ?? []) stack.push(descendant);
    }
    // Distinct children: a duplicate admin edge must not push childrenCount above
    // allDescendantCount (which dedups via `visited`), and host `node.children` is a set.
    counts.set(id, { childrenCount: new Set(direct).size, allDescendantCount: visited.size - 1 });
  }
  return counts;
}
