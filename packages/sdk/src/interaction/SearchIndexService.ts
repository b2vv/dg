import type { DiagramData } from '../data/types.js';
import type { WorkerPool } from '../worker/index.js';
import {
  buildSearchIndex,
  buildSearchIndexAsync,
  mergeSearchIndexes,
  searchIndex as querySearchIndex,
  type SearchIndex,
} from './searchIndex.js';
import type { SearchResult } from './types.js';
import { buildSearchIndexForScale } from './searchWorker.js';

/** Prefer the chunked / worker build once org+position count exceeds this. */
const ASYNC_THRESHOLD = 10_000;

export interface SearchScaleOptions {
  useWorker: boolean;
  pool: WorkerPool | null;
  workerFactory: () => Worker;
}

/**
 * Owns the diagram's search index: when to rebuild on the main thread, when to
 * hand the build to a worker, and when a streamed chunk may be merged in
 * instead of re-walking the whole roster.
 */
export class SearchIndexService {
  private index: SearchIndex | null = null;

  constructor(private readonly scale: () => SearchScaleOptions) {}

  get current(): SearchIndex | null {
    return this.index;
  }

  /** Synchronous build — small datasets and tests. */
  rebuild(data: DiagramData): void {
    this.index = buildSearchIndex(data);
  }

  async rebuildAsync(data: DiagramData): Promise<void> {
    this.index = await buildSearchIndexAsync(data);
  }

  /** Size-aware build: sync under the threshold, worker/pool above it. */
  async rebuildForScale(data: DiagramData): Promise<void> {
    const n = data.organizations.length + data.positions.length;
    if (n < ASYNC_THRESHOLD) {
      this.rebuild(data);
      return;
    }
    this.index = await buildSearchIndexForScale(data, this.scale());
  }

  /**
   * Streaming append: index only the chunk and merge it into the live index.
   * Rebuilding per chunk made a streamed load O(N²) — every chunk re-walked the
   * whole roster. A chunk that **updates** an entity cannot merge (the old
   * entry would linger as a duplicate hit), so that case still rebuilds.
   */
  async append(
    data: DiagramData,
    patch: Partial<DiagramData>,
    known: ReadonlySet<string> | null,
  ): Promise<void> {
    const index = this.index;
    if (!index || !known || patchUpdatesKnownEntities(patch, known)) {
      await this.rebuildForScale(data);
      return;
    }
    this.index = mergeSearchIndexes([
      index,
      buildSearchIndex({
        organizations: patch.organizations ?? [],
        groups: [],
        departments: [],
        persons: data.persons,
        positions: patch.positions ?? [],
        reportLines: [],
      }),
    ]);
  }

  query(query: string): SearchResult[] {
    return querySearchIndex(this.index, query);
  }
}

/** Ids the search index already holds (orgs + positions + their persons). */
export function knownSearchIds(data: DiagramData): Set<string> {
  const ids = new Set<string>();
  for (const org of data.organizations) ids.add(`org:${org.id}`);
  for (const position of data.positions) ids.add(`pos:${position.id}`);
  for (const person of data.persons) ids.add(`person:${person.id}`);
  return ids;
}

/**
 * True when the chunk touches something already indexed — an updated label has
 * to replace its entry, which merging cannot do.
 */
export function patchUpdatesKnownEntities(
  patch: Partial<DiagramData>,
  known: ReadonlySet<string>,
): boolean {
  return (
    (patch.organizations ?? []).some((o) => known.has(`org:${o.id}`)) ||
    (patch.positions ?? []).some((p) => known.has(`pos:${p.id}`)) ||
    // A person update renames the seats that already reference them.
    (patch.persons ?? []).some((p) => known.has(`person:${p.id}`))
  );
}
