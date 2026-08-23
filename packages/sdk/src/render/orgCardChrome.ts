import type { DiagramOrganization } from '../data/types.js';

/** E5: `N [M]` when either count is defined (missing side → 0). */
export function formatOrgCountsBadge(org: DiagramOrganization): string | undefined {
  if (org.filledCount === undefined && org.vacantCount === undefined) return undefined;
  return `${org.filledCount ?? 0} [${org.vacantCount ?? 0}]`;
}

/** E7 Phase 2 default vacancy copy (uk). */
export const VACANT_POSITION_LABEL = '(вакансія)';
