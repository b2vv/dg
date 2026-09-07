import type { DiagramPosition, DiagramReportLine } from '../data/types.js';
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
export type ReparentRefusal = 'self' | 'cycle' | 'unchanged' | 'unknown' | 'root';

export interface ReparentCheck {
  ok: boolean;
  refusal: ReparentRefusal | null;
}

/**
 * Who exists, and which of them is the structural root of a structure.
 *
 * One object rather than two `ReadonlySet<string>` parameters, and the reason
 * is not tidiness: two adjacent sets of the same type swap silently at a
 * callsite, and neither the compiler nor a test would say so. Naming them as
 * fields also makes `headIds` **impossible to forget** — an optional guard
 * input is one that stops running the day a caller omits it, which is the same
 * argument that made `knownIds` required in the first place.
 */
export interface SeatRoster {
  knownIds: ReadonlySet<string>;
  headIds: ReadonlySet<string>;
}

/**
 * Build the roster from the seats themselves, so no caller assembles it by
 * hand and no two callers disagree about who counts as a head.
 *
 * Called once where the data is read, not per drag frame: `canReparent` runs on
 * every pointer move of a drag, and rebuilding sets from a million seats there
 * is the cost this shape exists to avoid.
 */
export function rosterOf(
  positions: readonly Pick<DiagramPosition, 'id' | 'isHead'>[],
): SeatRoster {
  const knownIds = new Set<string>();
  const headIds = new Set<string>();
  for (const p of positions) {
    knownIds.add(p.id);
    if (p.isHead === true) headIds.add(p.id);
  }
  return { knownIds, headIds };
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
 * Refuses five things, and says which: an id nothing answers to, the structural
 * root, the seat itself, a seat that already is its manager (nothing would
 * change, so no patch should be emitted), and any descendant — walking up from
 * the proposed manager and meeting the dragged seat is precisely what a cycle
 * looks like from here.
 *
 * The root guard is on the seat being **moved**, never on the seat it is
 * dropped onto (T117 Gap 1). A head that may not be moved is not a head nobody
 * may report to — reporting to the head is the ordinary case, and refusing it
 * would break the common gesture in the name of protecting the rare one. The
 * host this mirrors draws the same line: it disables move/merge/delete **on**
 * its `HierarchyRoot`, not drops onto it.
 *
 * `root` is answered before `self` and `unchanged` so the refusal stays a
 * property of the seat rather than of the target: a head is immovable wherever
 * it was dropped, and an answer that changed with the target would read as if
 * some other target might have worked.
 */
export function checkReparent(
  reports: readonly DiagramReportLine[],
  positionId: string,
  managerId: string,
  roster: SeatRoster,
): ReparentCheck {
  const { knownIds, headIds } = roster;
  if (!knownIds.has(positionId) || !knownIds.has(managerId)) {
    return { ok: false, refusal: 'unknown' };
  }
  if (headIds.has(positionId)) return { ok: false, refusal: 'root' };
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
  roster: SeatRoster,
): boolean {
  return checkReparent(reports, positionId, managerId, roster).ok;
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
  roster: SeatRoster,
): DiagramReportLine[] {
  const check = checkReparent(reports, positionId, managerId, roster);
  if (!check.ok) {
    throw new InteractionError(
      `Cannot report ${positionId} to ${managerId}: ${check.refusal}`,
    );
  }
  const next = reports.filter((r) => !(r.kind === 'admin' && r.toId === positionId));
  next.push({ fromId: managerId, toId: positionId, kind: 'admin' });
  return next;
}
