import type { DiagramData, DiagramOrganization, DiagramPerson, DiagramPosition } from '../data/types.js';
import { orgTestId, personTestId, positionTestId } from './nodeTestId.js';
import type { NodeRef, SearchResult } from './types.js';

export interface SearchIndexEntry {
  node: NodeRef;
  label: string;
  haystack: string;
}

export interface SearchIndex {
  entries: SearchIndexEntry[];
  /** Entries that contain this character (for candidate narrowing). */
  byChar: Map<string, number[]>;
}

/** Structured-clone / JSON-friendly form for worker transfer. */
export interface SearchIndexDTO {
  entries: SearchIndexEntry[];
  byChar: [string, number[]][];
}

/** Denormalized position row for worker chunks (no full persons array). */
export interface PositionSearchRow {
  positionId: string;
  title: string;
  organizationId: string;
  departmentId?: string;
  personId?: string;
  label: string;
  personTestId?: string;
  positionTestId?: string;
}

export function emptySearchIndex(): SearchIndex {
  return { entries: [], byChar: new Map() };
}

export function searchIndexToDTO(index: SearchIndex): SearchIndexDTO {
  return {
    entries: index.entries,
    byChar: [...index.byChar.entries()],
  };
}

export function searchIndexFromDTO(dto: SearchIndexDTO): SearchIndex {
  return {
    entries: dto.entries,
    byChar: new Map(dto.byChar),
  };
}

function pushEntry(index: SearchIndex, entry: SearchIndexEntry): void {
  const i = index.entries.length;
  index.entries.push(entry);
  const seen = new Set<string>();
  for (const ch of entry.haystack) {
    if (seen.has(ch)) continue;
    seen.add(ch);
    const bucket = index.byChar.get(ch);
    if (bucket) bucket.push(i);
    else index.byChar.set(ch, [i]);
  }
}

export function buildOrgSearchIndex(organizations: DiagramOrganization[]): SearchIndex {
  const index = emptySearchIndex();
  for (const org of organizations) {
    pushEntry(index, {
      node: { kind: 'organization', id: org.id, organizationId: org.id },
      label: org.name,
      haystack: `${org.name} ${orgTestId(org)} ${org.id}`.toLowerCase(),
    });
  }
  return index;
}

export function flattenPositionSearchRows(
  positions: DiagramPosition[],
  persons: DiagramPerson[],
): PositionSearchRow[] {
  const personById = new Map(persons.map((p) => [p.id, p]));
  return positions.map((position) => {
    const person = position.personId ? personById.get(position.personId) : undefined;
    return {
      positionId: position.id,
      title: position.title,
      organizationId: position.organizationId,
      departmentId: position.departmentId,
      personId: position.personId,
      label: person?.fullName ?? position.title,
      personTestId: person ? personTestId(person) : undefined,
      positionTestId: positionTestId(position, person),
    };
  });
}

export function buildSearchIndexFromPositionRows(rows: PositionSearchRow[]): SearchIndex {
  const index = emptySearchIndex();
  for (const row of rows) {
    pushEntry(index, {
      node: {
        kind: 'person',
        id: row.personId ?? row.positionId,
        organizationId: row.organizationId,
        departmentId: row.departmentId,
        positionId: row.positionId,
        personId: row.personId,
      },
      label: row.label,
      haystack: `${row.label} ${row.title} ${row.personTestId ?? ''} ${row.positionTestId ?? ''} ${row.positionId}`.toLowerCase(),
    });
    pushEntry(index, {
      node: {
        kind: 'position',
        id: row.positionId,
        organizationId: row.organizationId,
        departmentId: row.departmentId,
        positionId: row.positionId,
        personId: row.personId,
      },
      label: row.title,
      haystack: `${row.title} ${row.label} ${row.positionTestId ?? ''} ${row.positionId}`.toLowerCase(),
    });
  }
  return index;
}

/** Merge partial indexes; remaps byChar offsets. */
export function mergeSearchIndexes(parts: SearchIndex[]): SearchIndex {
  const out = emptySearchIndex();
  for (const part of parts) {
    const offset = out.entries.length;
    for (const entry of part.entries) out.entries.push(entry);
    for (const [ch, idxs] of part.byChar) {
      const bucket = out.byChar.get(ch) ?? [];
      for (const i of idxs) bucket.push(i + offset);
      out.byChar.set(ch, bucket);
    }
  }
  return out;
}

export function buildSearchIndex(data: DiagramData): SearchIndex {
  return mergeSearchIndexes([
    buildOrgSearchIndex(data.organizations),
    buildSearchIndexFromPositionRows(flattenPositionSearchRows(data.positions, data.persons)),
  ]);
}

/**
 * Build index in chunks so large datasets do not block the main thread for one long turn.
 */
export async function buildSearchIndexAsync(
  data: DiagramData,
  options?: { chunkSize?: number; onChunk?: (done: number, total: number) => void },
): Promise<SearchIndex> {
  const chunkSize = Math.max(1, options?.chunkSize ?? 2_000);
  const parts: SearchIndex[] = [];

  const orgTotal = data.organizations.length;
  for (let i = 0; i < orgTotal; i += chunkSize) {
    parts.push(buildOrgSearchIndex(data.organizations.slice(i, i + chunkSize)));
    options?.onChunk?.(Math.min(i + chunkSize, orgTotal), orgTotal);
    await Promise.resolve();
  }

  const rows = flattenPositionSearchRows(data.positions, data.persons);
  const posTotal = rows.length;
  for (let i = 0; i < posTotal; i += chunkSize) {
    parts.push(buildSearchIndexFromPositionRows(rows.slice(i, i + chunkSize)));
    options?.onChunk?.(Math.min(i + chunkSize, posTotal), posTotal);
    await Promise.resolve();
  }

  return mergeSearchIndexes(parts);
}

export function searchIndex(
  index: SearchIndex | null | undefined,
  query: string,
  limit = 50,
): SearchResult[] {
  if (!index) return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: SearchResult[] = [];
  const seed = q[0]!;
  const candidateIdx = index.byChar.get(seed);
  const candidates = candidateIdx
    ? candidateIdx.map((i) => index.entries[i]!)
    : index.entries;

  for (const entry of candidates) {
    const idx = entry.haystack.indexOf(q);
    if (idx < 0) continue;
    const score = idx === 0 ? 2 : 1;
    scored.push({ node: entry.node, label: entry.label, score });
  }

  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  return scored.slice(0, limit);
}
