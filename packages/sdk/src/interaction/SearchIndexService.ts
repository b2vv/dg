import type { DiagramData } from '../data/types.js';
import type { WorkerPool } from '../worker/index.js';
import {
  buildSearchIndex,
  mergeSearchIndexes,
  searchIndex as querySearchIndex,
  type SearchIndex,
} from './searchIndex.js';
import type { SearchResult } from './types.js';
import { nodeEntityKey } from './nodeKey.js';
import { createSearchWorkerClient } from './searchWorker.js';

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
  /** This diagram's own worker — not the module-level one two diagrams shared. */
  private client: ReturnType<typeof createSearchWorkerClient> | null = null;

  constructor(private readonly scale: () => SearchScaleOptions) {}

  get current(): SearchIndex | null {
    return this.index;
  }

  /** Synchronous build — small datasets and tests. */
  rebuild(data: DiagramData): void {
    this.index = buildSearchIndex(data);
  }

  /**
   * Build the index for `data` and **return** it — nothing shared is touched.
   *
   * Returning instead of assigning is what lets a caller commit the data and
   * the index with no `await` between them (T103). While the assignment lived
   * in here, the caller had already written `this.data` and was waiting on this
   * build — a window in which a search answered from the previous index about
   * data the screen no longer held. That is the very defect this task exists
   * to remove, and an epoch check could not close it: it guards *which* index
   * is adopted, not *when*.
   */
  async buildForScale(data: DiagramData): Promise<SearchIndex> {
    const n = data.organizations.length + data.positions.length;
    if (n < ASYNC_THRESHOLD) return buildSearchIndex(data);
    const { useWorker, pool, workerFactory } = this.scale();
    this.client ??= createSearchWorkerClient({ workerFactory, fallbackToMainThread: true });
    return this.client.buildForScale(data, { useWorker, pool });
  }

  /** Adopt a built index. Synchronous on purpose — see {@link buildForScale}. */
  adopt(index: SearchIndex): void {
    this.index = index;
  }

  /** Size-aware build **and** adopt, for callers with nothing to keep in step. */
  async rebuildForScale(data: DiagramData): Promise<void> {
    this.adopt(await this.buildForScale(data));
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
  ): Promise<SearchIndex> {
    const index = this.index;
    if (!index || !known || patchUpdatesKnownEntities(patch, known)) {
      // Returned, not adopted: this branch awaits, and adopting here would let
      // a `setData` that landed meanwhile be overwritten by an index built from
      // pre-`setData` data (T103 review).
      return this.buildForScale(data);
    }
    return mergeSearchIndexes([
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

  /** Terminate the worker this service owns. Safe to call twice. */
  dispose(): void {
    this.client?.dispose();
    this.client = null;
  }

  query(query: string): SearchResult[] {
    return querySearchIndex(this.index, query);
  }
}

/** Ids the search index already holds (orgs + positions + their persons). */
export function knownSearchIds(data: DiagramData): Set<string> {
  const ids = new Set<string>();
  for (const org of data.organizations) ids.add(nodeEntityKey('organization', org.id));
  for (const position of data.positions) ids.add(nodeEntityKey('position', position.id));
  for (const person of data.persons) ids.add(nodeEntityKey('person', person.id));
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
    (patch.organizations ?? []).some((o) => known.has(nodeEntityKey('organization', o.id))) ||
    (patch.positions ?? []).some((p) => known.has(nodeEntityKey('position', p.id))) ||
    // A person update renames the seats that already reference them.
    (patch.persons ?? []).some((p) => known.has(nodeEntityKey('person', p.id)))
  );
}
