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
