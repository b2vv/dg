import type {
  DiagramData,
  DiagramOrganization,
  DiagramPerson,
  DiagramPosition,
  DiagramReportLine,
  DiagramOrgLink,
} from '../data/types.js';
import type { DataMapper } from './types.js';

/** Плоский рядок — універсальний вхід для demo / CSV-like */
export interface FlatDiagramRow {
  id: string;
  parentId?: string | null;
  kind: 'organization' | 'department' | 'position' | 'person';
  label: string;
  organizationId?: string;
  departmentId?: string;
  groupIds?: string[];
  personId?: string;
  photoUrl?: string;
  isTemporary?: boolean;
  status?: 'filled' | 'vacant' | 'acting';
  reportToId?: string;
  reportKind?: 'admin' | 'matrix' | 'dotted';
}

/**
 * Вбудований мапер: flat rows → DiagramData.
 * Host може передати свій mapper за тим самим контрактом.
 */
export const flatRowsToDiagram: DataMapper<FlatDiagramRow[], DiagramData> = (rows) => {
  const data: DiagramData = {
    organizations: [],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [],
  };

  const orgMap = new Map<string, DiagramOrganization>();

  for (const row of rows) {
    switch (row.kind) {
      case 'organization': {
        const org: DiagramOrganization = {
          id: row.id,
          name: row.label,
          parentOrgId: row.parentId ?? undefined,
          groupIds: row.groupIds ?? [],
        };
        data.organizations.push(org);
        orgMap.set(row.id, org);
        break;
      }
      case 'department':
        data.departments.push({
          id: row.id,
          name: row.label,
          organizationId: row.organizationId ?? row.parentId ?? '',
        });
        break;
      case 'person':
        data.persons.push({
          id: row.id,
          fullName: row.label,
          photoUrl: row.photoUrl,
        });
        break;
      case 'position':
        data.positions.push({
          id: row.id,
          title: row.label,
          organizationId: row.organizationId ?? '',
          departmentId: row.departmentId,
          groupIds: row.groupIds ?? [],
          personId: row.personId,
          status: row.status ?? (row.personId ? 'filled' : 'vacant'),
          isTemporary: row.isTemporary ?? false,
        });
        if (row.reportToId) {
          data.reportLines.push({
            fromId: row.reportToId,
            toId: row.id,
            kind: row.reportKind ?? 'admin',
          });
        }
        break;
    }
  }

  return data;
};

/** Merge incremental patch у існуючі дані */
export function mergeDiagramData(
  base: DiagramData,
  patch: Partial<DiagramData>,
): DiagramData {
  return {
    organizations: [...base.organizations, ...(patch.organizations ?? [])],
    groups: [...base.groups, ...(patch.groups ?? [])],
    departments: [...base.departments, ...(patch.departments ?? [])],
    persons: [...base.persons, ...(patch.persons ?? [])],
    positions: [...base.positions, ...(patch.positions ?? [])],
    reportLines: [...base.reportLines, ...(patch.reportLines ?? [])],
    orgLinks: [...(base.orgLinks ?? []), ...(patch.orgLinks ?? [])],
  };
}

/** Dedupe by id */
export const normalizeDiagram: DataMapper<DiagramData, DiagramData> = (data) => ({
  organizations: dedupeById(data.organizations),
  groups: dedupeById(data.groups),
  departments: dedupeById(data.departments),
  persons: dedupeById(data.persons),
  positions: dedupeById(data.positions),
  reportLines: dedupeReportLines(data.reportLines),
  orgLinks: dedupeOrgLinks(data.orgLinks ?? []),
});

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function dedupeReportLines(items: DiagramReportLine[]): DiagramReportLine[] {
  const seen = new Set<string>();
  return items.filter((r) => {
    const key = `${r.fromId}:${r.toId}:${r.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeOrgLinks(items: DiagramOrgLink[]): DiagramOrgLink[] {
  const seen = new Set<string>();
  return items.filter((l) => {
    const key = `${l.fromOrgId}:${l.toOrgId}:${l.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type { DiagramPerson, DiagramPosition, DiagramOrganization } from '../data/types.js';
