import type { DiagramData } from '../data/types.js';
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

export function buildSearchIndex(data: DiagramData): SearchIndex {
  const index: SearchIndex = { entries: [], byChar: new Map() };

  for (const org of data.organizations) {
    pushEntry(index, {
      node: { kind: 'organization', id: org.id, organizationId: org.id },
      label: org.name,
      haystack: org.name.toLowerCase(),
    });
  }

  const personById = new Map(data.persons.map((p) => [p.id, p]));
  for (const position of data.positions) {
    const person = position.personId ? personById.get(position.personId) : undefined;
    const label = person?.fullName ?? position.title;
    pushEntry(index, {
      node: {
        kind: 'person',
        id: person?.id ?? position.id,
        organizationId: position.organizationId,
        departmentId: position.departmentId,
        positionId: position.id,
        personId: position.personId,
      },
      label,
      haystack: `${label} ${position.title}`.toLowerCase(),
    });
    pushEntry(index, {
      node: {
        kind: 'position',
        id: position.id,
        organizationId: position.organizationId,
        departmentId: position.departmentId,
        positionId: position.id,
        personId: position.personId,
      },
      label: position.title,
      haystack: `${position.title} ${label}`.toLowerCase(),
    });
  }

  return index;
}

/**
 * Build index in chunks so large datasets do not block the main thread for one long turn.
 */
export async function buildSearchIndexAsync(
  data: DiagramData,
  options?: { chunkSize?: number; onChunk?: (done: number, total: number) => void },
): Promise<SearchIndex> {
  const chunkSize = Math.max(1, options?.chunkSize ?? 2_000);
  const index: SearchIndex = { entries: [], byChar: new Map() };

  const orgTotal = data.organizations.length;
  for (let i = 0; i < orgTotal; i += chunkSize) {
    for (const org of data.organizations.slice(i, i + chunkSize)) {
      pushEntry(index, {
        node: { kind: 'organization', id: org.id, organizationId: org.id },
        label: org.name,
        haystack: org.name.toLowerCase(),
      });
    }
    options?.onChunk?.(Math.min(i + chunkSize, orgTotal), orgTotal);
    await Promise.resolve();
  }

  const personById = new Map(data.persons.map((p) => [p.id, p]));
  const posTotal = data.positions.length;
  for (let i = 0; i < posTotal; i += chunkSize) {
    for (const position of data.positions.slice(i, i + chunkSize)) {
      const person = position.personId ? personById.get(position.personId) : undefined;
      const label = person?.fullName ?? position.title;
      pushEntry(index, {
        node: {
          kind: 'person',
          id: person?.id ?? position.id,
          organizationId: position.organizationId,
          departmentId: position.departmentId,
          positionId: position.id,
          personId: position.personId,
        },
        label,
        haystack: `${label} ${position.title}`.toLowerCase(),
      });
      pushEntry(index, {
        node: {
          kind: 'position',
          id: position.id,
          organizationId: position.organizationId,
          departmentId: position.departmentId,
          positionId: position.id,
          personId: position.personId,
        },
        label: position.title,
        haystack: `${position.title} ${label}`.toLowerCase(),
      });
    }
    options?.onChunk?.(Math.min(i + chunkSize, posTotal), posTotal);
    await Promise.resolve();
  }

  return index;
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
