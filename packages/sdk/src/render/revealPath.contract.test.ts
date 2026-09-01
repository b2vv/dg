import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';

/**
 * `revealPath` mutates before it renders, and both halves of that need a net.
 *
 * Found by a plan-defense pass on T97, then verified in the source: the method
 * assigned `this.data` and told `onOrgModeChange` about it *before* awaiting the
 * render, with nothing to undo either if the render threw, and no second
 * `destroyed` check for the case where the instance dies mid-await.
 *
 * The same shape was fixed in the demo's staff rebuild during T88 (report §20).
 * These tests exist so it does not come back in the SDK.
 */

function data() {
  return {
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: false, matrixOrder: 0 },
      { id: 'mid', name: 'Mid', parentOrgId: 'root', groupIds: [], collapsed: true, matrixOrder: 1 },
      { id: 'leaf', name: 'Leaf', parentOrgId: 'mid', groupIds: [], collapsed: true, matrixOrder: 2 },
    ],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [] as const,
  };
}

async function mount() {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, { data: data(), useWorker: false });
  return { container, diagram };
}

const collapsedOf = (d: OrgHierarchyDiagram, id: string) =>
  d.getData().organizations.find((o) => o.id === id)?.collapsed;

describe('revealPath (T97 defense)', () => {
  it('success: revealing a leaf opens the branch above it', async () => {
    const { diagram } = await mount();
    expect(collapsedOf(diagram, 'mid')).toBe(true);

    expect(await diagram.revealPath('leaf')).toBe(true);
    expect(collapsedOf(diagram, 'mid')).toBe(false);
    diagram.destroy();
  });

  it('success: a failed render is reported on its own channel, and still thrown', async () => {
    // Decision recorded in T97: the SDK gets a separate «the scene was not
    // drawn, and why» channel. Reported *and* rethrown — reporting alone would
    // leave every caller that mutated state first to work out on its own
    // whether to roll back.
    const seen: string[] = [];
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: data(),
      useWorker: false,
      callbacks: { onRenderFailed: (f) => seen.push(f.reason) },
    });
    const host = (diagram as unknown as {
      host: { renderer: { render: () => Promise<void> } };
    }).host;
    host.renderer.render = async () => {
      throw new Error('layout died');
    };

    await expect(diagram.revealPath('leaf')).rejects.toThrow('layout died');
    expect(seen).toEqual(['layout died']);
    // And it answers later too, for a host that logs on a timer rather than
    // listening — the callback fires once and is gone.
    expect(diagram.getLastRenderFailure()?.reason).toBe('layout died');
    diagram.destroy();
  });

  it('failure: a render that throws leaves the tree as it was', async () => {
    const { diagram } = await mount();
    // Poking the renderer directly is the only way to make the render fail from
    // outside; the assertion below is still on the public data.
    const host = (diagram as unknown as {
      host: { renderer: { render: () => Promise<void> } };
    }).host;
    host.renderer.render = async () => {
      throw new Error('layout died');
    };

    await expect(diagram.revealPath('leaf')).rejects.toThrow('layout died');
    // Not "expanded in the data, collapsed on screen": the caller reads a tree
    // that was actually drawn, or the same one it had before.
    expect(collapsedOf(diagram, 'mid')).toBe(true);
    diagram.destroy();
  });

  it('failure: revealing on a destroyed diagram answers false and changes nothing', async () => {
    const { diagram } = await mount();
    diagram.destroy();
    expect(await diagram.revealPath('leaf')).toBe(false);
    expect(collapsedOf(diagram, 'mid')).toBe(true);
  });

  it('failure: destroy during the reveal does not throw and does not claim success', async () => {
    const { diagram } = await mount();
    const pending = diagram.revealPath('leaf');
    diagram.destroy();
    // The entry check cannot see this one — only the check after the await can.
    expect(await pending).toBe(false);
  });

  it('failure: an unknown id is answered, not thrown', async () => {
    const { diagram } = await mount();
    expect(await diagram.revealPath('nobody')).toBe(false);
    expect(await diagram.revealPath('')).toBe(false);
    diagram.destroy();
  });
});

describe('initialExpand at create (T97 rows 4, 5, 12)', () => {
  const deep = () => ({
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: true, matrixOrder: 0 },
      { id: 'ours', name: 'Ours', parentOrgId: 'root', groupIds: [], collapsed: true, matrixOrder: 1 },
      { id: 'kid', name: 'Kid', parentOrgId: 'ours', groupIds: [], collapsed: false, matrixOrder: 2 },
    ],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [] as const,
  });

  async function mountWith(config: Record<string, unknown>) {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: deep(),
      useWorker: false,
      ...config,
    });
    return diagram;
  }

  it('row 4: without the option the host’s collapsed flags are untouched', async () => {
    const diagram = await mountWith({});
    const orgs = diagram.getData().organizations;
    expect(orgs.find((o) => o.id === 'root')?.collapsed).toBe(true);
    expect(orgs.find((o) => o.id === 'kid')?.collapsed).toBe(false);
    diagram.destroy();
  });

  it('row 5: with the option the SDK decides, overriding what arrived', async () => {
    const diagram = await mountWith({ initialExpand: { rootOrgId: 'ours' } });
    const orgs = diagram.getData().organizations;
    // Opened despite arriving collapsed…
    expect(orgs.find((o) => o.id === 'root')?.collapsed).toBe(false);
    expect(orgs.find((o) => o.id === 'ours')?.collapsed).toBe(false);
    // …and closed despite arriving open.
    expect(orgs.find((o) => o.id === 'kid')?.collapsed).toBe(true);
    diagram.destroy();
  });

  it('row 12: applied before the first frame, not by re-rendering after it', async () => {
    // Ordering, not sampled frames. «No intermediate collapsed frame» is
    // invisible to an end-state check, and sampling is unreliable when the main
    // thread is busy (T88 report §24). What is observable is how many frames
    // create() produced: doing the expansion first costs one render, doing it
    // afterwards costs two — and the second one is the jump the row forbids.
    const counts: number[] = [];
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: deep(),
      useWorker: false,
      initialExpand: { rootOrgId: 'ours' },
      callbacks: { onLayoutDiagnostics: () => counts.push(1) },
    });

    expect(counts).toHaveLength(1);
    expect(diagram.getData().organizations.find((o) => o.id === 'ours')?.collapsed).toBe(false);
    diagram.destroy();
  });
});

describe('initialExpand.revealNodeId (T97 rows 11, 13-17)', () => {
  const tree = () => ({
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: true, matrixOrder: 0 },
      { id: 'ours', name: 'Ours', parentOrgId: 'root', groupIds: [], collapsed: true, matrixOrder: 1 },
      { id: 'mid', name: 'Mid', parentOrgId: 'ours', groupIds: [], collapsed: true, matrixOrder: 2 },
      { id: 'deep', name: 'Deep', parentOrgId: 'mid', groupIds: [], collapsed: true, matrixOrder: 3 },
      { id: 'deeper', name: 'Deeper', parentOrgId: 'deep', groupIds: [], collapsed: true, matrixOrder: 4 },
    ],
    groups: [],
    departments: [],
    persons: [{ id: 'p-deep', fullName: 'Deep Person' }],
    positions: [
      {
        id: 'pos-deep',
        title: 'Seat',
        organizationId: 'deep',
        groupIds: [],
        personId: 'p-deep',
        status: 'filled' as const,
        isTemporary: false,
        isHead: true,
      },
    ],
    reportLines: [],
    orgLinks: [] as const,
  });

  async function open(initialExpand: Record<string, unknown>, seen?: unknown[]) {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    return OrgHierarchyDiagram.create(container, {
      data: tree(),
      useWorker: false,
      initialExpand,
      callbacks: seen ? { onInitialExpand: (r) => seen.push(r) } : {},
    });
  }

  const shut = (d: OrgHierarchyDiagram, id: string) =>
    d.getData().organizations.find((o) => o.id === id)?.collapsed;

  it('row 11: a deep target arrives open, with its own children still shut', async () => {
    const diagram = await open({ rootOrgId: 'ours', revealNodeId: 'deep' });
    // The path down to it is open…
    expect(shut(diagram, 'root')).toBe(false);
    expect(shut(diagram, 'ours')).toBe(false);
    expect(shut(diagram, 'mid')).toBe(false);
    expect(shut(diagram, 'deep')).toBe(false);
    // …and the target's own children are not, because the requirement says
    // «expanded down to that organisation», not past it.
    expect(shut(diagram, 'deeper')).toBe(true);
    diagram.destroy();
  });

  it('row 13: a target inside the minimum changes nothing', async () => {
    const seen: unknown[] = [];
    const diagram = await open({ rootOrgId: 'ours', revealNodeId: 'ours' }, seen);
    expect(shut(diagram, 'ours')).toBe(false);
    // Still the minimum: `mid` is the level below our root's children.
    expect(shut(diagram, 'mid')).toBe(true);
    expect(seen).toEqual([{ revealedOrgId: 'ours' }]);
    diagram.destroy();
  });

  it('row 14: a target nothing answers to keeps the minimum and says why', async () => {
    const seen: { revealedOrgId: string | null; reason?: string }[] = [];
    const diagram = await open({ rootOrgId: 'ours', revealNodeId: 'ghost' }, seen);

    expect(shut(diagram, 'ours')).toBe(false);
    expect(shut(diagram, 'mid')).toBe(true);
    // Reported on a channel, not returned as a bare boolean nobody can read a
    // reason out of — that was the gap the critique named.
    expect(seen[0]?.revealedOrgId).toBeNull();
    expect(seen[0]?.reason).toContain('ghost');
    diagram.destroy();
  });

  it('row 15: a person id resolves to the organisation that holds them', async () => {
    const diagram = await open({ rootOrgId: 'ours', revealNodeId: 'p-deep' });
    expect(shut(diagram, 'mid')).toBe(false);
    expect(shut(diagram, 'deep')).toBe(false);
    diagram.destroy();
  });

  it('row 16: an id from data that no longer exists reads as row 14', async () => {
    const seen: { revealedOrgId: string | null; reason?: string }[] = [];
    // Same shape as a target from a superseded setData: the id is simply not in
    // the data this diagram was given.
    const diagram = await open({ rootOrgId: 'ours', revealNodeId: 'pos-from-old-set' }, seen);
    expect(seen[0]?.revealedOrgId).toBeNull();
    expect(shut(diagram, 'mid')).toBe(true);
    diagram.destroy();
  });

  it('row 17: nothing can interleave — the reveal is finished before create resolves', async () => {
    // The race the row describes cannot happen for the initial reveal: the host
    // has no reference until create() returns, so there is no window in which
    // collapseAllOrgs, setData or destroy could arrive. Asserted rather than
    // assumed, because it is the reason no queue is needed here.
    const diagram = await open({ rootOrgId: 'ours', revealNodeId: 'deep' });
    expect(shut(diagram, 'deep')).toBe(false);

    // And an action taken after it wins, in full, without a half-applied state.
    await diagram.collapseAllOrgs();
    expect(shut(diagram, 'deep')).toBe(true);
    diagram.destroy();
  });
});
