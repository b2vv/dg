import type { DiagramData } from '../data/types.js';
import type { NodeRef, SearchResult } from './types.js';

export interface SearchIndexEntry {
  node: NodeRef;
  label: string;
  haystack: string;
}

export interface SearchIndex {
  entries: SearchIndexEntry[];
}

export function buildSearchIndex(data: DiagramData): SearchIndex {
  const entries: SearchIndexEntry[] = [];

  for (const org of data.organizations) {
    entries.push({
      node: { kind: 'organization', id: org.id, organizationId: org.id },
      label: org.name,
      haystack: org.name.toLowerCase(),
    });
  }

  const personById = new Map(data.persons.map((p) => [p.id, p]));
  for (const position of data.positions) {
    const person = position.personId ? personById.get(position.personId) : undefined;
    const label = person?.fullName ?? position.title;
    const haystack = `${label} ${position.title}`.toLowerCase();
    entries.push({
      node: {
        kind: 'person',
        id: person?.id ?? position.id,
        organizationId: position.organizationId,
        departmentId: position.departmentId,
        positionId: position.id,
        personId: position.personId,
      },
      label,
      haystack,
    });
    entries.push({
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

  return { entries };
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
  for (const entry of index.entries) {
    const idx = entry.haystack.indexOf(q);
    if (idx < 0) continue;
    const score = idx === 0 ? 2 : 1;
    scored.push({ node: entry.node, label: entry.label, score });
  }

  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  return scored.slice(0, limit);
}
