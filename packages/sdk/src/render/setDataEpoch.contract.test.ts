import { describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import type { DiagramData } from '../data/types.js';

/**
 * T103 — the newest `setData` must win, not the slowest one.
 *
 * `applyConfig` writes shared state *after* awaiting host mappers, so a slower
 * older call lands on top of a faster newer one. The mappers here are the
 * control: each resolves only when its gate is opened, so the interleaving is
 * chosen by the test rather than by timing luck.
 */

const dataWith = (orgName: string): DiagramData => ({
  organizations: [{ id: 'o1', name: orgName, groupIds: [] }],
  groups: [],
  departments: [],
  persons: [{ id: 'p1', fullName: 'Someone' }],
  positions: [
    {
      id: 'pos1',
      organizationId: 'o1',
      personId: 'p1',
      title: 'Dev',
      groupIds: [],
      status: 'filled',
      isTemporary: false,
    },
  ],
  reportLines: [],
});

async function mount() {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const onDataMapped = rstest.fn();
  const onOrgModeChange = rstest.fn();
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: dataWith('initial'),
    useWorker: false,
    callbacks: { onDataMapped, onOrgModeChange },
  });
  return { container, diagram, onDataMapped, onOrgModeChange };
}

describe('setData request epoch (T103)', () => {
  it('failure: a slower older setData must not overwrite a newer one', async () => {
    const { container, diagram, onDataMapped, onOrgModeChange } = await mount();
    onDataMapped.mockClear();
    onOrgModeChange.mockClear();

    const gates: Array<() => void> = [];
    const gated = (name: string) => ({
      toDiagram: async () => {
        await new Promise<void>((r) => {
          gates.push(r);
        });
        return dataWith(name);
      },
    });

    // Older call first, newer second — then let the OLDER one finish last.
    const older = diagram.setData({}, gated('older'));
    const newer = diagram.setData({}, gated('newer'));

    gates[1]?.();
    await newer;
    gates[0]?.();
    const olderOutcome = await older.then(
      () => 'resolved',
      (e: Error) => e.message,
    );

    // The newest request is the truth, whatever order the mappers finished in.
    expect(diagram.getData().organizations[0]!.name).toBe('newer');
    // Being overtaken is the mechanism working, not a fault — and the
    // documented pattern is fire-and-forget, so rejecting here would make our
    // own recommendation a source of unhandled rejections.
    expect(olderOutcome).toBe('resolved');
    // It stays silent all the same: only the winner announced anything —
    // both channels, not just the one that was easy to spy on.
    expect(onDataMapped).toHaveBeenCalledTimes(1);
    expect(onOrgModeChange).toHaveBeenCalledTimes(1);

    diagram.destroy();
    container.remove();
  });

  it('success: a single call is unchanged — one mapping, one announcement', async () => {
    const { container, diagram, onDataMapped } = await mount();
    onDataMapped.mockClear();

    await diagram.setData(dataWith('only'));

    expect(diagram.getData().organizations[0]!.name).toBe('only');
    expect(onDataMapped).toHaveBeenCalledTimes(1);

    diagram.destroy();
    container.remove();
  });

  it('failure: mid-commit, the data and the index are never a mixed pair', async () => {
    // A2, and the version that can actually fail. Asserting they agree *after*
    // everything settles proves nothing — the epoch alone gives that. The
    // property is that no observer ever sees the new data beside the old index,
    // so the observation has to happen while the index build is still pending.
    const { container, diagram } = await mount();
    const internals = diagram as unknown as {
      searchService: { buildForScale: (d: unknown) => Promise<unknown> };
    };

    const realBuild = internals.searchService.buildForScale.bind(internals.searchService);
    let release: (() => void) | undefined;
    internals.searchService.buildForScale = async (d: unknown) => {
      const built = await realBuild(d);
      await new Promise<void>((r) => {
        release = r;
      });
      return built;
    };

    const pending = diagram.setData(dataWith('Newer Org'));
    // Wait for the stub to be reached, not for a fixed delay.
    while (!release) await new Promise((r) => { setTimeout(r, 5); });

    // The window. Both must still describe the previous state — mixing them is
    // the defect, and committing the data before the build would mix them here.
    expect(diagram.getData().organizations[0]!.name).toBe('initial');
    expect(await diagram.search('Newer')).toHaveLength(0);

    release();
    await pending;

    expect(diagram.getData().organizations[0]!.name).toBe('Newer Org');
    expect((await diagram.search('Newer')).length).toBeGreaterThan(0);

    diagram.destroy();
    container.remove();
  });

  it('success: a chunk that predates a setData does not resurrect in it', async () => {
    // A4. `setData` means "here is the entire state"; a chunk mapped before it
    // belongs to the state it replaced.
    const { container, diagram } = await mount();

    let release: (() => void) | undefined;
    const slowChunk = diagram.appendData(
      {},
      {
        append: async () => {
          await new Promise<void>((r) => {
            release = r;
          });
          return { organizations: [{ id: 'ghost', name: 'Ghost Org', groupIds: [] }] };
        },
      },
    );

    await diagram.setData(dataWith('after'));
    release?.();
    await slowChunk;

    expect(diagram.getData().organizations.map((o) => o.id)).not.toContain('ghost');
    expect(await diagram.search('Ghost')).toHaveLength(0);

    diagram.destroy();
    container.remove();
  });
});
