import { describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import type { DiagramData } from '../data/types.js';

/**
 * T109. `toggleStaffOrgExpand` changes view state and draws, with no rollback
 * between the two — so a render that fails leaves the expanded-org set saying
 * one thing and the screen showing another.
 *
 * The two branches fail differently, which is why each gets its own pass:
 * collapse loses one id, while expand `clear()`s the set before adding, so a
 * refused frame there wipes an id that belonged to a *previous, drawn* expand.
 * A single test over one branch already let a broken one through in T104
 * (see `work/reports/mutation-transaction/report.md` §6 п.3).
 */
function staffData(): DiagramData {
  return {
    organizations: [
      { id: 'o1', name: 'HQ', groupIds: [] },
      { id: 'c1', name: 'Alpha', parentOrgId: 'o1', groupIds: [] },
      { id: 'c2', name: 'Bravo', parentOrgId: 'o1', groupIds: [] },
    ],
    groups: [],
    departments: [],
    persons: [
      { id: 'p-hq', fullName: 'Head' },
      { id: 'p-a', fullName: 'Alpha lead' },
      { id: 'p-b', fullName: 'Bravo lead' },
    ],
    positions: [
      {
        id: 'hq-head',
        title: 'Chief',
        organizationId: 'o1',
        groupIds: [],
        personId: 'p-hq',
        status: 'filled',
        isTemporary: false,
        isHead: true,
      },
      {
        id: 'a-lead',
        title: 'Lead A',
        organizationId: 'c1',
        groupIds: [],
        personId: 'p-a',
        status: 'filled',
        isTemporary: false,
        isHead: true,
      },
      {
        id: 'b-lead',
        title: 'Lead B',
        organizationId: 'c2',
        groupIds: [],
        personId: 'p-b',
        status: 'filled',
        isTemporary: false,
        isHead: true,
      },
    ],
    reportLines: [],
  };
}

async function mount() {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const onRenderFailed = rstest.fn();
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: staffData(),
    staffCurrentOrgId: 'o1',
    useWorker: false,
    callbacks: { onRenderFailed },
  });
  const internals = diagram as unknown as {
    host: { renderer: { render: (...a: unknown[]) => Promise<void> } };
    viewState: { staffExpandedOrgIds: Set<string> };
  };
  const ok = internals.host.renderer.render.bind(internals.host.renderer);
  const breakRender = (message: string): void => {
    internals.host.renderer.render = () => Promise.reject(new Error(message));
  };
  const fixRender = (): void => {
    internals.host.renderer.render = ok;
  };
  return { container, diagram, internals, breakRender, fixRender };
}

describe('OrgHierarchyDiagram staff-org expand (T109)', () => {
  it('failure: an expand the render refuses does not wipe the org expanded before it', async () => {
    const { container, diagram, breakRender } = await mount();

    // A drawn expand first: this is the state the refused frame must not touch.
    expect(await diagram.toggleStaffOrgExpand('c1')).toBe(true);
    expect(diagram.getStaffExpandedOrgIds()).toEqual(['c1']);

    breakRender('layout exploded');
    await expect(diagram.toggleStaffOrgExpand('c2')).rejects.toThrow('layout exploded');

    // The screen still shows c1 open. Without a rollback the set says c2 —
    // and `clear()` means c1 is gone from it, not merely joined by c2.
    expect(diagram.getStaffExpandedOrgIds()).toEqual(['c1']);

    diagram.destroy();
    container.remove();
  });

  it('failure: a collapse the render refuses leaves the org still expanded', async () => {
    const { container, diagram, breakRender } = await mount();

    expect(await diagram.toggleStaffOrgExpand('c1')).toBe(true);
    expect(diagram.getStaffExpandedOrgIds()).toEqual(['c1']);

    breakRender('collapse exploded');
    await expect(diagram.toggleStaffOrgExpand('c1')).rejects.toThrow('collapse exploded');

    expect(diagram.getStaffExpandedOrgIds()).toEqual(['c1']);

    diagram.destroy();
    container.remove();
  });

  it('success: a drawn toggle keeps working — expand, then collapse', async () => {
    const { container, diagram } = await mount();

    expect(await diagram.toggleStaffOrgExpand('c1')).toBe(true);
    expect(diagram.getStaffExpandedOrgIds()).toEqual(['c1']);
    expect(await diagram.toggleStaffOrgExpand('c1')).toBe(false);
    expect(diagram.getStaffExpandedOrgIds()).toEqual([]);

    // Cap of one is the documented behaviour and must survive the rollback
    // work: expanding a second card replaces the first rather than joining it.
    expect(await diagram.toggleStaffOrgExpand('c1')).toBe(true);
    expect(await diagram.toggleStaffOrgExpand('c2')).toBe(true);
    expect(diagram.getStaffExpandedOrgIds()).toEqual(['c2']);

    diagram.destroy();
    container.remove();
  });
});
