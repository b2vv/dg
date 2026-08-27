import type { DiagramData, DiagramOrganization, DiagramPerson, DiagramPosition } from '../data/types.js';
import { orgTestId, personTestId, positionTestId } from './nodeTestId.js';
import { TopKCollector } from './topK.js';
import type { NodeRef, SearchResult } from './types.js';

export interface SearchIndexEntry {
  node: NodeRef;
  label: string;
  haystack: string;
}

export interface SearchIndex {
  entries: SearchIndexEntry[];
  /** Entries that contain this character — used for one-character queries. */
  byChar: Map<string, number[]>;
  /**
   * Entries that contain this 2-gram. A bigram is far more selective than a
   * single character: «or» narrows a roster where every second name contains
   * «o». Queries of two characters or more intersect the two rarest bigram
   * lists instead of scanning everything that shares one letter.
   *
   * Lists are kept whole. Dropping the common ones would save memory, but a
   * dropped key comes back half-filled after {@link mergeSearchIndexes} — the
   * postings of the entries indexed before the drop are gone — and a partial
   * list silently loses hits. Commonness is judged at query time instead.
   */
  byBigram: Map<string, number[]>;
}

/**
 * Share of entries above which a bigram no longer narrows anything worth the
 * intersection pass. Judged per query against the live entry count.
 */
export const COMMON_BIGRAM_SHARE = 0.1;

/** Structured-clone / JSON-friendly form for worker transfer. */
export interface SearchIndexDTO {
  entries: SearchIndexEntry[];
  byChar: [string, number[]][];
  byBigram: [string, number[]][];
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
  return { entries: [], byChar: new Map(), byBigram: new Map() };
}

export function searchIndexToDTO(index: SearchIndex): SearchIndexDTO {
  return {
    entries: index.entries,
    byChar: [...index.byChar.entries()],
    byBigram: [...index.byBigram.entries()],
  };
}

export function searchIndexFromDTO(dto: SearchIndexDTO): SearchIndex {
  return {
    entries: dto.entries,
    byChar: new Map(dto.byChar),
    // Older worker payloads predate the bigram map; a missing one only costs
    // selectivity, never correctness (the query still verifies with indexOf).
    byBigram: new Map(dto.byBigram ?? []),
  };
}

/** Case-fold then NFC so combining marks compose after lowercase (N3). */
function foldSearchText(s: string): string {
  return s.toLowerCase().normalize('NFC');
}

/** Code points of a folded string — surrogate pairs stay one unit (B5). */
function codePoints(text: string): string[] {
  return [...text];
}

function addPosting(map: Map<string, number[]>, key: string, i: number): void {
  const bucket = map.get(key);
  if (bucket) bucket.push(i);
  else map.set(key, [i]);
}

function pushEntry(index: SearchIndex, entry: SearchIndexEntry): void {
  const i = index.entries.length;
  index.entries.push(entry);
  const chars = codePoints(entry.haystack);
  const seenChars = new Set<string>();
  const seenBigrams = new Set<string>();
  for (let k = 0; k < chars.length; k += 1) {
    const ch = chars[k]!;
    if (!seenChars.has(ch)) {
      seenChars.add(ch);
      addPosting(index.byChar, ch, i);
    }
    if (k + 1 < chars.length) {
      const bigram = ch + chars[k + 1]!;
      if (seenBigrams.has(bigram)) continue;
      seenBigrams.add(bigram);
      addPosting(index.byBigram, bigram, i);
    }
  }
}

export function buildOrgSearchIndex(organizations: DiagramOrganization[]): SearchIndex {
  const index = emptySearchIndex();
  for (const org of organizations) {
    pushEntry(index, {
      node: { kind: 'organization', id: org.id, organizationId: org.id },
      label: org.name,
      haystack: foldSearchText(`${org.name} ${orgTestId(org)} ${org.id}`),
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
      haystack: foldSearchText(
        `${row.label} ${row.title} ${row.personTestId ?? ''} ${row.positionTestId ?? ''} ${row.positionId}`,
      ),
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
      haystack: foldSearchText(
        `${row.title} ${row.label} ${row.positionTestId ?? ''} ${row.positionId}`,
      ),
    });
  }
  return index;
}

/** Merge partial indexes; remaps posting offsets. Posting lists stay ascending. */
export function mergeSearchIndexes(parts: SearchIndex[]): SearchIndex {
  const out = emptySearchIndex();
  for (const part of parts) {
    const offset = out.entries.length;
    for (const entry of part.entries) out.entries.push(entry);
    mergePostings(out.byChar, part.byChar, offset);
    mergePostings(out.byBigram, part.byBigram, offset);
  }
  return out;
}

function mergePostings(
  into: Map<string, number[]>,
  from: ReadonlyMap<string, number[]>,
  offset: number,
): void {
  for (const [key, idxs] of from) {
    const bucket = into.get(key) ?? [];
    for (const i of idxs) bucket.push(i + offset);
    into.set(key, bucket);
  }
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

/**
 * One collator for the whole module: `label.localeCompare(other)` builds (or
 * looks up) a collator on every call, which dominates the cost once a query
 * matches thousands of entries. Default options keep the previous ordering.
 */
const labelCollator = new Intl.Collator();

interface RankedEntry {
  result: SearchResult;
  /** Candidate order — keeps ties deterministic, like the old stable sort. */
  seq: number;
}

function compareRanked(a: RankedEntry, b: RankedEntry): number {
  const byLabel = labelCollator.compare(a.result.label, b.result.label);
  return byLabel === 0 ? a.seq - b.seq : byLabel;
}

/**
 * Candidate entry ids for a folded query: the rarest bigram list, narrowed by
 * intersecting with the second rarest. One character has no bigram, so it falls
 * back to the character map — such a query is broad by nature.
 *
 * Returns `null` when the query cannot match anything.
 */
function candidatesFor(index: SearchIndex, q: string): readonly number[] | null {
  const chars = codePoints(q);
  if (chars.length === 1) return index.byChar.get(chars[0]!) ?? null;

  const ceiling = index.entries.length * COMMON_BIGRAM_SHARE;
  const lists: number[][] = [];
  for (let i = 0; i + 1 < chars.length; i += 1) {
    const bucket = index.byBigram.get(chars[i]! + chars[i + 1]!);
    // Nobody holds this bigram → no entry can contain the query.
    if (!bucket) return null;
    // A list covering a large share of the index cannot narrow enough to pay
    // for the pass over it.
    if (bucket.length < ceiling) lists.push(bucket);
  }
  if (lists.length === 0) return index.byChar.get(chars[0]!) ?? null;

  lists.sort((a, b) => a.length - b.length);
  const rarest = lists[0]!;
  const second = lists[1];
  return second ? intersectSorted(rarest, second) : rarest;
}

/** Both lists are ascending by construction (entries are pushed in order). */
function intersectSorted(a: readonly number[], b: readonly number[]): number[] {
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const av = a[i]!;
    const bv = b[j]!;
    if (av === bv) {
      out.push(av);
      i += 1;
      j += 1;
    } else if (av < bv) i += 1;
    else j += 1;
  }
  return out;
}

export function searchIndex(
  index: SearchIndex | null | undefined,
  query: string,
  limit = 50,
): SearchResult[] {
  if (!index) return [];
  const q = foldSearchText(query.trim());
  if (!q) return [];

  const candidateIdx = candidatesFor(index, q);
  if (!candidateIdx || candidateIdx.length === 0) return [];

  // Top-k per bucket instead of sorting every match: a broad query can still
  // match thousands of entries while the host asks for fifty rows.
  const exact = new TopKCollector<RankedEntry>(limit, compareRanked);
  const partial = new TopKCollector<RankedEntry>(limit, compareRanked);

  let seq = 0;
  for (const i of candidateIdx) {
    const entry = index.entries[i]!;
    const pos = entry.haystack.indexOf(q);
    if (pos < 0) continue;
    const ranked: RankedEntry = {
      result: { node: entry.node, label: entry.label, score: pos === 0 ? 2 : 1 },
      seq: seq++,
    };
    if (pos === 0) exact.push(ranked);
    else partial.push(ranked);
  }

  const exactHits = exact.drain().map((r) => r.result);
  const take = Math.max(0, limit - exactHits.length);
  if (take === 0) return exactHits;
  return [...exactHits, ...partial.drain().slice(0, take).map((r) => r.result)];
}
