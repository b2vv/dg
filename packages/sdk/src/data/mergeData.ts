import type { DiagramData } from './types.js';

/** Structural check for «host passed DiagramData, not a raw payload». */
export function isDiagramData(v: unknown): v is DiagramData {
  return (
    typeof v === 'object' &&
    v !== null &&
    'organizations' in v &&
    'persons' in v &&
    'positions' in v
  );
}

/** Merge a streamed chunk into the live snapshot — patch wins per key (T77-M04). */
export function mergePartial(base: DiagramData, patch: Partial<DiagramData>): DiagramData {
  return {
    organizations: mergeById(base.organizations, patch.organizations),
    groups: mergeById(base.groups, patch.groups),
    departments: mergeById(base.departments, patch.departments),
    persons: mergeById(base.persons, patch.persons),
    positions: mergeById(base.positions, patch.positions),
    reportLines: mergeReportLines(base.reportLines, patch.reportLines),
    orgLinks: mergeOrgLinks(base.orgLinks ?? [], patch.orgLinks),
  };
}

export function mergeById<T extends { id: string }>(
  base: readonly T[],
  patch: readonly T[] | undefined,
): T[] {
  if (!patch?.length) return [...base];
  const map = new Map(base.map((item) => [item.id, item]));
  for (const item of patch) {
    map.set(item.id, item);
  }
  return [...map.values()];
}

/** Edges have no id — their endpoints and kind are the identity. */
function mergeByKey<T>(
  base: readonly T[],
  patch: readonly T[] | undefined,
  keyOf: (item: T) => string,
): T[] {
  if (!patch?.length) return [...base];
  const map = new Map(base.map((item) => [keyOf(item), item]));
  for (const item of patch) {
    map.set(keyOf(item), item);
  }
  return [...map.values()];
}

export function mergeReportLines(
  base: DiagramData['reportLines'],
  patch: DiagramData['reportLines'] | undefined,
): DiagramData['reportLines'] {
  return mergeByKey(base, patch, (l) => `${l.fromId}\0${l.toId}\0${l.kind}`);
}

export function mergeOrgLinks(
  base: NonNullable<DiagramData['orgLinks']>,
  patch: DiagramData['orgLinks'] | undefined,
): DiagramData['orgLinks'] {
  return mergeByKey(base, patch, (l) => `${l.fromOrgId}\0${l.toOrgId}\0${l.kind}`);
}
