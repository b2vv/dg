import { describe, expect, it } from '@rstest/core';
import { emptyDiagramData, type DiagramData } from '../data/types.js';
import { SearchIndexService, knownSearchIds, patchUpdatesKnownEntities } from './SearchIndexService.js';

const scale = () => ({ useWorker: false, pool: null, workerFactory: () => new Worker('') });

function dataWith(orgs: string[]): DiagramData {
  return {
    ...emptyDiagramData(),
    organizations: orgs.map((name, i) => ({ id: `o${i}`, name, groupIds: [] })),
  };
}

describe('SearchIndexService', () => {
  it('success: rebuild then query finds an org by label', () => {
    const service = new SearchIndexService(scale);
    service.rebuild(dataWith(['Cedar Lake', 'Birch Hill']));
    expect(service.query('cedar').map((r) => r.label)).toContain('Cedar Lake');
  });

  it('success: a chunk of new entities merges instead of rebuilding', async () => {
    const service = new SearchIndexService(scale);
    const base = dataWith(['Cedar Lake']);
    service.rebuild(base);
    const before = service.current;
    const patch = { organizations: [{ id: 'o9', name: 'Maple Court', groupIds: [] }] };
    const merged = { ...base, organizations: [...base.organizations, ...patch.organizations] };
    await service.append(merged, patch, knownSearchIds(base));
    expect(service.current).not.toBe(before);
    expect(service.query('maple').map((r) => r.label)).toContain('Maple Court');
    expect(service.query('cedar')).toHaveLength(1);
  });

  it('success: a chunk that updates a known entity rebuilds, so no stale label survives', async () => {
    const service = new SearchIndexService(scale);
    const base = dataWith(['Cedar Lake']);
    service.rebuild(base);
    const patch = { organizations: [{ id: 'o0', name: 'Renamed Lake', groupIds: [] }] };
    await service.append({ ...base, organizations: patch.organizations }, patch, knownSearchIds(base));
    expect(service.query('cedar')).toEqual([]);
    expect(service.query('renamed').map((r) => r.label)).toContain('Renamed Lake');
  });

  it('failure: querying before any build returns nothing rather than throwing', () => {
    const service = new SearchIndexService(scale);
    expect(service.current).toBeNull();
    expect(service.query('cedar')).toEqual([]);
  });

  it('failure: an unknown chunk is not treated as an update', () => {
    const known = knownSearchIds(dataWith(['Cedar Lake']));
    expect(patchUpdatesKnownEntities({ organizations: [{ id: 'o0', name: 'x', groupIds: [] }] }, known)).toBe(true);
    expect(patchUpdatesKnownEntities({ organizations: [{ id: 'zz', name: 'x', groupIds: [] }] }, known)).toBe(false);
    expect(patchUpdatesKnownEntities({}, known)).toBe(false);
  });
});
