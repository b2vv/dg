import type { DiagramOrganization, DiagramPosition } from '../data/types.js';

/** E5: `N [M]` — tree counts when set, else filled/vacant fallback. */
export function formatOrgCountsBadge(org: DiagramOrganization): string | undefined {
  if (org.childrenCount !== undefined || org.allDescendantCount !== undefined) {
    return `${org.childrenCount ?? 0} [${org.allDescendantCount ?? 0}]`;
  }
  if (org.filledCount === undefined && org.vacantCount === undefined) return undefined;
  return `${org.filledCount ?? 0} [${org.vacantCount ?? 0}]`;
}

/** Position row count bar ``N [M]`` (GoJS staff). */
export function formatPositionCountsBadge(position: DiagramPosition): string | undefined {
  if (position.childrenCount !== undefined || position.allDescendantCount !== undefined) {
    return `${position.childrenCount ?? 0} [${position.allDescendantCount ?? 0}]`;
  }
  return undefined;
}

/** E7 Phase 2 default vacancy copy (uk). */
export const VACANT_POSITION_LABEL = '(вакансія)';
