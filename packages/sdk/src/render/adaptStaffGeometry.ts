// T126 R7 A4.2b — the output adapter.
//
// Maps the Rust `StaffGeometryResult` (the one geometry source, T66 V2a) back into
// the render-layer shapes the Pixi renderer and the golden consume: `StaffCanvasResult`
// (nodes, org cards, edges), the enriched zone bands, the routed edge segments, and the
// marked-crossing list. Pure: no WASM, no paint — the inverse of `buildStaffLayoutInput`.
//
// Three enrichments live here because Rust deliberately does not carry them (they are
// not geometry): org-card `name`/`positionCount`/`expanded`, zone `label`/`role`, and
// the `marked`→`markedCrossings` inversion. `positionCount` is counted from the *full*
// `DiagramData`, never the collapse-filtered input, so a collapsed child card still shows
// its true size (A4.2a review, non-blocking a).
import type { DiagramData, DiagramOrganization } from '../data/types.js';
import type { StaffEdgePoint, StaffEdgeSegment } from '../layout/staffEdgeGeometry.js';
import type {
  StaffCanvasResult,
  StaffNodeBox,
  StaffOrgCard,
  StaffTierBand,
} from '../layout/staff/types.js';
import type {
  StaffEdgeRoute,
  StaffGeometryResult,
  StaffNamespace,
  StaffNodeGeo,
  StaffOrgCardGeo,
} from '../wasm/layoutBridge.js';

/** The slice of `DiagramData` the enrichments need. */
type StaffData = Pick<DiagramData, 'organizations' | 'positions'>;

export interface AdaptStaffGeometryArgs {
  result: StaffGeometryResult;
  data: StaffData;
  /** Child orgs expanded after the cap — orgCard `expanded` flag (A4.2a cap). */
  cappedExpandedOrgIds: ReadonlySet<string>;
  /** `config.staffZoneChrome`: when false the renderer paints no zones (parity). */
  staffZoneChrome: boolean;
  /** Cap diagnostic(s) the adapter owns; prepended to the Rust diagnostics. */
  capDiagnostics: readonly string[];
}

export interface AdaptedStaffGeometry {
  canvas: StaffCanvasResult;
  zones: StaffTierBand[];
  routes: StaffEdgeSegment[];
  markedCrossings: Array<{ fromId: string; toId: string }>;
}

const TIERS = new Set([1, 2, 3]);
const NODE_ROLES = new Set(['anchor', 'floating', 'tree', 'matrix', 'detached', 'external']);
const EDGE_KINDS = new Set(['admin', 'matrix', 'dotted', 'lead-org']);

function narrowTier(tier: number): 1 | 2 | 3 | undefined {
  return TIERS.has(tier) ? (tier as 1 | 2 | 3) : undefined;
}

function narrowRole(role: string | undefined): StaffNodeBox['role'] {
  return role !== undefined && NODE_ROLES.has(role) ? (role as StaffNodeBox['role']) : undefined;
}

function narrowEdgeKind(kind: string): StaffEdgeSegment['kind'] {
  if (!EDGE_KINDS.has(kind)) {
    throw new Error(`adaptStaffGeometry: unknown edge kind "${kind}"`);
  }
  return kind as StaffEdgeSegment['kind'];
}

function adaptNode(n: StaffNodeGeo): StaffNodeBox {
  return {
    id: n.id,
    organizationId: n.organizationId,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
    depth: n.depth,
    tier: narrowTier(n.tier),
    role: narrowRole(n.role),
  };
}

function adaptOrgCards(
  cards: readonly StaffOrgCardGeo[],
  data: StaffData,
  orgName: ReadonlyMap<string, string>,
  cappedExpandedOrgIds: ReadonlySet<string>,
): StaffOrgCard[] {
  // positionCount from the full data: a collapsed/unexpanded child still shows its
  // real headcount (Rust never carries the count; it is TS-enriched — rust-types §).
  const countByOrg = new Map<string, number>();
  for (const p of data.positions) {
    countByOrg.set(p.organizationId, (countByOrg.get(p.organizationId) ?? 0) + 1);
  }
  return cards.map((c) => ({
    orgId: c.orgId,
    name: orgName.get(c.orgId) ?? c.orgId,
    x: c.x,
    y: c.y,
    width: c.width,
    height: c.height,
    positionCount: countByOrg.get(c.orgId) ?? 0,
    expanded: cappedExpandedOrgIds.has(c.orgId),
  }));
}

function adaptZone(
  ns: StaffNamespace,
  orgName: ReadonlyMap<string, string>,
  orgRole: ReadonlyMap<string, DiagramOrganization['role']>,
  cardsByOrgCardsTier: StaffOrgCard[],
): StaffTierBand {
  const kind = ns.kind === 'org-cards' ? 'org-cards' : 'staff-block';
  const label =
    (ns.organizationId ? orgName.get(ns.organizationId) : undefined) ??
    (kind === 'org-cards' ? undefined : ns.organizationId);
  return {
    tier: (narrowTier(ns.tier) ?? 1) as 1 | 2 | 3,
    kind,
    organizationId: ns.organizationId,
    x: ns.x,
    y: ns.y,
    width: ns.width,
    height: ns.height,
    label,
    role: ns.organizationId ? orgRole.get(ns.organizationId) : undefined,
    ...(kind === 'org-cards' ? { cards: cardsByOrgCardsTier } : {}),
  };
}

function adaptRoute(route: StaffEdgeRoute): StaffEdgeSegment {
  const points: StaffEdgePoint[] = route.points.map((p) => ({ x: p.x, y: p.y }));
  const first = points[0] ?? { x: 0, y: 0 };
  const last = points[points.length - 1] ?? first;
  return {
    fromId: route.fromId,
    toId: route.toId,
    kind: narrowEdgeKind(route.kind),
    points,
    x1: first.x,
    y1: first.y,
    x2: last.x,
    y2: last.y,
    endsOnDeptTop: route.endsOnDeptTop,
  };
}

/** Map the Rust `StaffGeometryResult` into the render-layer `StaffLiveGeometry` pieces. */
export function adaptStaffGeometry(args: AdaptStaffGeometryArgs): AdaptedStaffGeometry {
  const { result, data, cappedExpandedOrgIds, staffZoneChrome, capDiagnostics } = args;
  const orgName = new Map(data.organizations.map((o) => [o.id, o.name]));
  const orgRole = new Map(data.organizations.map((o) => [o.id, o.role]));

  const positionNodes = result.nodes.map(adaptNode);
  const orgCards = adaptOrgCards(result.orgCards, data, orgName, cappedExpandedOrgIds);
  const edges = result.edges.map((e) => ({
    fromId: e.fromId,
    toId: e.toId,
    kind: narrowEdgeKind(e.kind),
  }));

  const canvas: StaffCanvasResult = {
    currentOrgId: result.currentOrgId,
    // FORK1 (E1): Rust owns no raw tier bands; `canvas.tiers` is read only by the
    // golden `bands` field (the renderer paints `zones`). Honest empty — see A4.4/A4.5.
    tiers: [],
    positionNodes,
    edges,
    orgCards,
    width: result.width,
    height: result.height,
    diagnostics: [...capDiagnostics, ...result.diagnostics],
  };

  const zones = staffZoneChrome
    ? result.namespaces.map((ns) => adaptZone(ns, orgName, orgRole, orgCards))
    : [];

  const routes = result.routes.segments.map(adaptRoute);
  const markedCrossings = result.routes.segments
    .filter((s) => s.marked === true)
    .map((s) => ({ fromId: s.fromId, toId: s.toId }));

  return { canvas, zones, routes, markedCrossings };
}
