import type { NodeRef } from '../core/index.js';

/** One-hop staff relation selector relocated unchanged from StaffChromeBackdrop. */
export function relatedStaffIds(
  lines: ReadonlyArray<{ fromId: string; toId: string }>,
  hoveredId: string,
): Set<string> {
  const rel = new Set<string>([hoveredId]);
  for (const l of lines) {
    if (l.fromId === hoveredId || l.toId === hoveredId) {
      rel.add(l.fromId);
      rel.add(l.toId);
    }
  }
  return rel;
}

/** Derived each paint; unknown/non-position hover leaves the scene unchanged. */
export function staffDimmedIds(
  hovered: NodeRef | null,
  lines: ReadonlyArray<{ fromId: string; toId: string }>,
  visiblePositionIds: ReadonlySet<string>,
): Set<string> {
  if (hovered?.kind !== 'position' || !visiblePositionIds.has(hovered.id)) return new Set();
  const related = relatedStaffIds(lines, hovered.id);
  return new Set([...visiblePositionIds].filter((id) => !related.has(id)));
}
