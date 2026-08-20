import type { NodeRef } from './types.js';

export function sameNodeRef(a: NodeRef | null | undefined, b: NodeRef | null | undefined): boolean {
  if (!a || !b) return false;
  return a.kind === b.kind && a.id === b.id;
}

export function selectNode(
  current: NodeRef | null,
  next: NodeRef | null,
): { selection: NodeRef | null; changed: boolean } {
  if (next === null) {
    return { selection: null, changed: current !== null };
  }
  if (sameNodeRef(current, next)) {
    return { selection: current, changed: false };
  }
  return { selection: next, changed: true };
}
