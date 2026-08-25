import type { DiagramOrganization, DiagramPosition } from '../data/types.js';

/** E5: `N [M]` — tree counts when set, else filled/vacant fallback. */
export function formatOrgCountsBadge(org: DiagramOrganization): string | undefined {
  if (org.childrenCount !== undefined || org.allDescendantCount !== undefined) {
    return `${org.childrenCount ?? 0} [${org.allDescendantCount ?? 0}]`;
  }
  if (org.filledCount === undefined && org.vacantCount === undefined) return undefined;
  return `${org.filledCount ?? 0} [${org.vacantCount ?? 0}]`;
}

/** GoJS position row 2 — direct / all-descendant counts. */
export function formatPositionCountsBadge(position: DiagramPosition): string | undefined {
  if (position.childrenCount !== undefined || position.allDescendantCount !== undefined) {
    return `${position.childrenCount ?? 0} [${position.allDescendantCount ?? 0}]`;
  }
  return undefined;
}

/** E7 Phase 2 default vacancy copy (uk). */
export const VACANT_POSITION_LABEL = '(вакансія)';

/**
 * Approximate rendered width of a Pixi `Text`. Pixi measures via a canvas
 * context, which jsdom/worker hosts lack — layout code that only needs an
 * offset (badge after a name, reserved gutter) uses this estimate instead.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.55;
}
