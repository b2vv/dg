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

/** Edges have no id — from/to/kind is the identity. */
function reportLineKey(line: { fromId: string; toId: string; kind: string }): string {
  return `${line.fromId}\0${line.toId}\0${line.kind}`;
}

export function mergeReportLines(
  base: DiagramData['reportLines'],
  patch: DiagramData['reportLines'] | undefined,
): DiagramData['reportLines'] {
  if (!patch?.length) return [...base];
  const map = new Map(base.map((line) => [reportLineKey(line), line]));
  for (const line of patch) {
    map.set(reportLineKey(line), line);
  }
  return [...map.values()];
}

function orgLinkKey(link: { fromOrgId: string; toOrgId: string; kind: string }): string {
  return `${link.fromOrgId}\0${link.toOrgId}\0${link.kind}`;
}

export function mergeOrgLinks(
  base: NonNullable<DiagramData['orgLinks']>,
  patch: DiagramData['orgLinks'] | undefined,
): DiagramData['orgLinks'] {
  if (!patch?.length) return [...base];
  const map = new Map(base.map((link) => [orgLinkKey(link), link]));
  for (const link of patch) {
    map.set(orgLinkKey(link), link);
  }
  return [...map.values()];
}
