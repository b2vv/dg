import type { DiagramReportLine } from '../data/types.js';

/** Raw report-line ids: ancestors and direct reports, ignoring matrix/dotted links. */
export function reportPath(
  nodeId: string,
  lines: readonly DiagramReportLine[],
): { nodeKeys: Set<string>; edgeKeys: Set<string> } {
  const nodeKeys = new Set<string>();
  const edgeKeys = new Set<string>();
  if (!nodeId) return { nodeKeys, edgeKeys };
  const childToParent = new Map<string, string>();
  const parentToChildren = new Map<string, string[]>();
  for (const line of lines) {
    if (line.kind !== 'admin') continue;
    childToParent.set(line.toId, line.fromId);
    const children = parentToChildren.get(line.fromId) ?? [];
    children.push(line.toId);
    parentToChildren.set(line.fromId, children);
  }
  if (childToParent.size > 0 && !childToParent.has(nodeId) && !parentToChildren.has(nodeId)) {
    return { nodeKeys, edgeKeys };
  }
  let current: string | undefined = nodeId;
  while (current !== undefined && !nodeKeys.has(current)) {
    nodeKeys.add(current);
    const parent = childToParent.get(current);
    if (parent === undefined || nodeKeys.has(parent)) break;
    edgeKeys.add(`${parent}\u0000${current}`);
    current = parent;
  }
  for (const child of parentToChildren.get(nodeId) ?? []) {
    nodeKeys.add(child);
    edgeKeys.add(`${nodeId}\u0000${child}`);
  }
  return { nodeKeys, edgeKeys };
}
