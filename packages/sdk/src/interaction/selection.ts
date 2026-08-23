import type { NodeRef } from './types.js';

export function sameNodeRef(a: NodeRef | null | undefined, b: NodeRef | null | undefined): boolean {
  if (!a || !b) return false;
  return a.kind === b.kind && a.id === b.id;
}

/** Replace-one semantics (compat). Prefer {@link replaceSelection} for Set API. */
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

/** Deduplicate by kind+id, preserving first-seen order. */
export function selectMany(nodes: readonly NodeRef[]): NodeRef[] {
  const out: NodeRef[] = [];
  for (const node of nodes) {
    if (!out.some((n) => sameNodeRef(n, node))) out.push(node);
  }
  return out;
}

export function sameSelectionSet(a: readonly NodeRef[], b: readonly NodeRef[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!sameNodeRef(a[i], b[i])) return false;
  }
  return true;
}

/** Plain click / programmatic select: replace entire set with one node (or clear). */
export function replaceSelection(
  current: readonly NodeRef[],
  next: NodeRef | null,
): { selections: NodeRef[]; changed: boolean } {
  if (next === null) {
    return { selections: [], changed: current.length > 0 };
  }
  if (current.length === 1 && sameNodeRef(current[0], next)) {
    return { selections: [current[0]!], changed: false };
  }
  return { selections: [next], changed: true };
}

/** Ctrl/Cmd/Shift+click: add or remove membership. */
export function toggleInSelection(
  current: readonly NodeRef[],
  node: NodeRef,
): { selections: NodeRef[]; changed: boolean } {
  const idx = current.findIndex((n) => sameNodeRef(n, node));
  if (idx >= 0) {
    const selections = current.slice(0, idx).concat(current.slice(idx + 1));
    return { selections, changed: true };
  }
  return { selections: [...current, node], changed: true };
}

export interface SelectionPointerMods {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/** Phase 1: ctrl/cmd and shift toggle set membership (no shift-range). */
export function isSelectionToggleModifier(mods: SelectionPointerMods): boolean {
  return Boolean(mods.ctrlKey || mods.metaKey || mods.shiftKey);
}

export function readSelectionPointerMods(e: {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}): SelectionPointerMods {
  return {
    ctrlKey: Boolean(e.ctrlKey),
    metaKey: Boolean(e.metaKey),
    shiftKey: Boolean(e.shiftKey),
  };
}

/** Pixi emits `pointertap` after `rightclick`; ignore non-primary button activations. */
export function isPrimaryPointerTap(e: { button?: number }): boolean {
  return e.button !== 2;
}
