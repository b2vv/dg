import type { DiagramPosition, DiagramReportLine } from '../../data/types.js';
import type { StaffNodeBox, StaffOrgBlockResult } from './types.js';
import type { StaffGeom } from './coords.js';

/**
 * Managers who supervise seats in this block from outside the organisation.
 *
 * T91 GATE 3 allows a seat to report to a manager in another organisation. The
 * block layout cannot draw that on its own: it lays out `inOrg` positions, and
 * `adminParentMap` drops any line with an end outside the org. Left alone, the
 * result would be a reporting line that exists in the data and nowhere on
 * screen — the quiet loss that made "forbid it" the safer option before the
 * decision went the other way.
 *
 * So the outside manager is pinned above the block as a card of its own, the
 * way `scaleStaff` pins a manager who lives outside the visible window (T96).
 * It is a *reference* to a seat that belongs elsewhere, not a member of this
 * organisation: it is marked `external`, and nothing that counts the block's
 * positions counts it.
 */

/** One pinned card per outside manager, however many reports it has here. */
export interface ExternalManagerPin {
  managerId: string;
  reportIds: string[];
}

/** Outside admin managers of `inOrg`, in first-seen order. */
export function externalManagersFor(
  inOrg: readonly DiagramPosition[],
  reports: readonly DiagramReportLine[],
): ExternalManagerPin[] {
  const inside = new Set(inOrg.map((p) => p.id));
  const byManager = new Map<string, ExternalManagerPin>();
  for (const r of reports) {
    if (r.kind !== 'admin' || r.fromId === r.toId) continue;
    // A report of ours, whose manager is not one of ours.
    if (!inside.has(r.toId) || inside.has(r.fromId)) continue;
    const pin = byManager.get(r.fromId);
    if (pin) pin.reportIds.push(r.toId);
    else byManager.set(r.fromId, { managerId: r.fromId, reportIds: [r.toId] });
  }
  return [...byManager.values()];
}

/**
 * Pin the outside managers above an already-laid-out block.
 *
 * The block is pushed down by exactly one row and the pins occupy it, so the
 * arrangement the layout chose is preserved rather than recomputed — the pins
 * are chrome around a result, not an input to it.
 */
export function pinExternalManagers(
  block: StaffOrgBlockResult,
  inOrg: readonly DiagramPosition[],
  reports: readonly DiagramReportLine[],
  knownPositionIds: ReadonlySet<string>,
  geom: StaffGeom,
): StaffOrgBlockResult {
  const pins = externalManagersFor(inOrg, reports).filter((p) =>
    // A manager the host never sent has no card to draw and no name to show.
    knownPositionIds.has(p.managerId),
  );
  if (pins.length === 0) return block;

  const rowHeight = geom.nodeHeight + geom.verticalGap;
  const nodes: StaffNodeBox[] = block.nodes.map((n) => ({ ...n, y: n.y + rowHeight }));

  const pitchX = geom.nodeWidth + geom.horizontalGap;
  pins.forEach((pin, i) => {
    nodes.push({
      id: pin.managerId,
      organizationId: block.organizationId,
      x: geom.margin + i * pitchX,
      y: geom.margin,
      width: geom.nodeWidth,
      height: geom.nodeHeight,
      role: 'external',
    });
  });

  const edges = [
    ...block.edges,
    ...pins.flatMap((pin) =>
      pin.reportIds.map((toId) => ({ fromId: pin.managerId, toId, kind: 'admin' as const })),
    ),
  ];

  const maxX = Math.max(block.width, geom.margin + pins.length * pitchX);
  return {
    ...block,
    nodes,
    edges,
    width: maxX,
    height: block.height + rowHeight,
  };
}
