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
