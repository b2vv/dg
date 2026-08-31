import type { DiagramOrganization } from './types.js';

/**
 * Which organisations are open when the diagram first appears.
 *
 * The rule the host asked for (T97 §В1): show the minimum that makes «our»
 * organisation legible and no more.
 *
 * ```text
 * our root has a governing org        our root IS the diagram root
 *   0  diagram root                     0  our root
 *   1  our root                         1  its children
 *   2  its children
 * ```
 *
 * Both cases are the same rule stated once: an organisation is **open** when it
 * is our root or an ancestor of it; everything else is closed. `collapsed` hides
 * an org's children rather than the org itself, so opening the ancestor chain is
 * exactly what makes our root visible, and leaving our root open is what shows
 * its children while their own children stay put.
 *
 * That also answers the case the requirement did not mention: if our root sits
 * three levels down, the chain above it opens and the siblings along that chain
 * stay closed. Without the chain our root would not be on screen at all, and the
 * promise is a minimum, not a context tour.
 */
export function initialExpandedOrgIds(
  organizations: readonly DiagramOrganization[],
  rootOrgId?: string,
): Set<string> {
  const byId = new Map(organizations.map((o) => [o.id, o]));

  // No id, or one nothing answers to: every root of the forest is «ours». That
  // is the two-level case for a single-root diagram, and for a forest it keeps
  // each root's own children one step away rather than picking a winner.
  const anchors =
    rootOrgId && byId.has(rootOrgId)
      ? [rootOrgId]
      : organizations.filter((o) => !o.parentOrgId || !byId.has(o.parentOrgId)).map((o) => o.id);

  const open = new Set<string>();
  for (const anchor of anchors) {
    let cursor: string | undefined = anchor;
    // `parentOrgId` is host data. A cycle is refused by `validateOrgHierarchy`
    // before this runs, but the guard costs nothing and this function is
    // exported — it can be called with data that never went through create().
    const guard = new Set<string>();
    while (cursor && !guard.has(cursor)) {
      guard.add(cursor);
      open.add(cursor);
      const parent: string | undefined = byId.get(cursor)?.parentOrgId;
      cursor = parent && byId.has(parent) ? parent : undefined;
    }
  }
  return open;
}

/**
 * Apply {@link initialExpandedOrgIds} as `collapsed` flags.
 *
 * Overwrites what the host sent, which is only correct because reaching this
 * function is opt-in: a host that ships its own collapsed state and does not ask
 * for an initial depth keeps it untouched. `flatOrgs` in the demo marks every
 * organisation collapsed, and silently overriding that would change scenes that
 * work today (T97 Б2).
 */
export function applyInitialExpand(
  organizations: readonly DiagramOrganization[],
  rootOrgId?: string,
): DiagramOrganization[] {
  const open = initialExpandedOrgIds(organizations, rootOrgId);
  let changed = false;
  const next = organizations.map((org) => {
    const collapsed = !open.has(org.id);
    if (org.collapsed === collapsed) return org;
    changed = true;
    return { ...org, collapsed };
  });
  return changed ? next : [...organizations];
}
