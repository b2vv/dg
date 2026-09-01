import type { DiagramReportLine } from '../data/types.js';
import { InteractionError } from './types.js';

/**
 * Re-parenting a seat: which manager a position reports to.
 *
 * Supervision lives in `reportLines` with `fromId` = manager and `toId` = report
 * (`layout/staff/resolveHead.ts`). One seat has at most one **admin** manager;
 * `matrix` and `dotted` lines are a different relation and are never touched
 * here.
 *
 * Unlike the layout's `adminParentMap`, the walk below is **not scoped to one
 * organisation**. T91 GATE 3 allows a manager from another org, and a cycle
 * check that stopped at the org boundary would miss exactly the cycles that
 * decision makes possible.
 */

/** Why a drop target cannot be accepted, or `null` when it can. */
export type ReparentRefusal = 'self' | 'cycle' | 'unchanged' | 'unknown';

export interface ReparentCheck {
  ok: boolean;
  refusal: ReparentRefusal | null;
}

/** Admin parent of every seat: `toId → fromId`, across all organisations. */
export function adminParentsOf(reports: readonly DiagramReportLine[]): Map<string, string> {
  const parents = new Map<string, string>();
  for (const r of reports) {
    if (r.kind !== 'admin') continue;
    // A self-edge is not supervision; the staff layout drops it too.
    if (r.fromId === r.toId) continue;
    parents.set(r.toId, r.fromId);
  }
  return parents;
}

/**
 * May `positionId` be made to report to `managerId`?
 *
 * Refuses four things, and says which: an id nothing answers to, the seat
 * itself, a seat that already is its manager (nothing would change, so no patch
 * should be emitted), and any descendant — walking up from the proposed manager
 * and meeting the dragged seat is precisely what a cycle looks like from here.
 *
 * `knownIds` is required rather than optional on purpose: an existence check
 * that callers may omit is one that stops running the day someone forgets it.
 */
export function checkReparent(
  reports: readonly DiagramReportLine[],
  positionId: string,
  managerId: string,
  knownIds: ReadonlySet<string>,
): ReparentCheck {
  if (!knownIds.has(positionId) || !knownIds.has(managerId)) {
    return { ok: false, refusal: 'unknown' };
  }
  if (positionId === managerId) return { ok: false, refusal: 'self' };
  const parents = adminParentsOf(reports);
  if (parents.get(positionId) === managerId) return { ok: false, refusal: 'unchanged' };

  // Walk up from the *proposed* manager. `seen` guards data that already holds
  // a cycle — this function is exported and nothing upstream refuses one for
  // `reportLines` (only `parentOrgId` is validated, in `layout/orgTree.ts`).
  const seen = new Set<string>([managerId]);
  let cursor: string | undefined = parents.get(managerId);
  while (cursor && !seen.has(cursor)) {
    if (cursor === positionId) return { ok: false, refusal: 'cycle' };
    seen.add(cursor);
    cursor = parents.get(cursor);
  }
  return { ok: true, refusal: null };
}

/** True when the drop is allowed — the shape the drag preview asks for. */
export function canReparent(
  reports: readonly DiagramReportLine[],
  positionId: string,
  managerId: string,
  knownIds: ReadonlySet<string>,
): boolean {
  return checkReparent(reports, positionId, managerId, knownIds).ok;
}

/**
 * Replace the seat's admin manager, returning new report lines.
 *
 * Replaces rather than adds: a seat with two admin parents has no meaning the
 * layout can draw — `adminParentMap` would keep whichever came last and the
 * other line would vanish without saying so.
 */
export function reparentPosition(
  reports: readonly DiagramReportLine[],
  positionId: string,
  managerId: string,
  knownIds: ReadonlySet<string>,
): DiagramReportLine[] {
  const check = checkReparent(reports, positionId, managerId, knownIds);
  if (!check.ok) {
    throw new InteractionError(
      `Cannot report ${positionId} to ${managerId}: ${check.refusal}`,
    );
  }
  const next = reports.filter((r) => !(r.kind === 'admin' && r.toId === positionId));
  next.push({ fromId: managerId, toId: positionId, kind: 'admin' });
  return next;
}
