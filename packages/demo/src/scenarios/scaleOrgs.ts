import type { DiagramData, DiagramOrganization } from '@org-hierarchy/sdk';
import { revealOrgPath } from '@org-hierarchy/sdk';

/** Full universe size for the scale demo (address space, not all drawn). */
export const SCALE_ORG_TOTAL = 100_000;
/** Orgs materialized into Pixi for one viewport window. */
export const SCALE_ORG_WINDOW = 400;

export interface ScaleOrgsWindow {
  total: number;
  windowSize: number;
  focusIndex: number;
  startIndex: number;
  data: DiagramData;
  /** ms to build parent index + window (for status). */
  buildMs: number;
}

/** Branching factor for synthetic tree (parent = floor((i-1)/BRANCH)). */
const BRANCH = 9;

/**
 * Compact parent index for `total` orgs — O(n) typed array, no DiagramOrganization alloc.
 */
export function buildScaleParentIndex(total: number): Int32Array {
  const n = Math.max(1, total | 0);
  const parents = new Int32Array(n);
  parents[0] = -1;
  for (let i = 1; i < n; i += 1) {
    parents[i] = Math.floor((i - 1) / BRANCH);
  }
  return parents;
}

export function resolveScaleWindowStart(
  focusIndex: number,
  windowSize: number,
  total: number,
): number {
  const w = Math.min(windowSize, total);
  const half = Math.floor(w / 2);
  let start = focusIndex - half;
  if (start < 0) start = 0;
  if (start + w > total) start = Math.max(0, total - w);
  return start;
}

/**
 * Materialize an org window around `focusIndex`.
 * Default: expand ancestors→focus so mode is **row-tree**; Collapse all → matrix.
 * Does not allocate 100k org objects — only `windowSize` cards.
 */
export function buildScaleOrgsWindow(options: {
  total?: number;
  windowSize?: number;
  focusIndex?: number;
  parents?: Int32Array;
  /** Expand focus path for row-tree (default true). False = all collapsed → matrix. */
  expandFocusPath?: boolean;
}): ScaleOrgsWindow {
  const t0 = typeof performance === 'undefined' ? Date.now() : performance.now();
  const total = options.total ?? SCALE_ORG_TOTAL;
  const windowSize = Math.min(options.windowSize ?? SCALE_ORG_WINDOW, total);
  const focusIndex = Math.max(0, Math.min(options.focusIndex ?? 0, total - 1));
  const parents = options.parents ?? buildScaleParentIndex(total);
  const start = resolveScaleWindowStart(focusIndex, windowSize, total);
  const end = Math.min(total, start + windowSize);
  const inWindow = new Set<number>();
  for (let i = start; i < end; i += 1) inWindow.add(i);

  let organizations: DiagramOrganization[] = [];
  for (let i = start; i < end; i += 1) {
    let parentOrgId: string | undefined;
    if (i !== start) {
      let p = parents[i] ?? -1;
      while (p >= 0 && !inWindow.has(p)) p = parents[p] ?? -1;
      parentOrgId = p >= 0 ? `org-${p}` : `org-${start}`;
      if (parentOrgId === `org-${i}`) parentOrgId = `org-${start}`;
    }
    organizations.push({
      id: `org-${i}`,
      name: i === focusIndex ? `Org ${i} · focus` : `Org ${i}`,
      parentOrgId,
      groupIds: [],
      collapsed: true,
      matrixOrder: i - start,
    });
  }

  if (options.expandFocusPath !== false) {
    organizations = revealOrgPath(organizations, `org-${focusIndex}`);
  }

  const orgLinks = organizations
    .filter((o) => o.parentOrgId)
    .map((o) => ({
      fromOrgId: o.parentOrgId!,
      toOrgId: o.id,
      kind: 'administrative' as const,
    }));

  const t1 = typeof performance === 'undefined' ? Date.now() : performance.now();
  return {
    total,
    windowSize: end - start,
    focusIndex,
    startIndex: start,
    buildMs: Math.round(t1 - t0),
    data: {
      organizations,
      groups: [],
      departments: [],
      persons: [],
      positions: [],
      reportLines: [],
      orgLinks,
    },
  };
}

/** Parse "org-123" / "123" search into an index, or null. */
export function parseScaleOrgQuery(query: string, total: number): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const m = /^org-?(\d+)$/.exec(q) ?? /^(\d+)$/.exec(q);
  if (!m) return null;
  const idx = Number(m[1]);
  if (!Number.isFinite(idx) || idx < 0 || idx >= total) return null;
  return idx;
}
