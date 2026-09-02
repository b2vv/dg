import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import type { DiagramData } from './types.js';

/** Structure audit §High — `getData()` must not hand out the live state. */

function data(): DiagramData {
  return {
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: false },
      { id: 'kid', name: 'Kid', parentOrgId: 'root', groupIds: [], collapsed: true },
    ],
    groups: [],
    departments: [],
    persons: [{ id: 'p1', fullName: 'A B' }],
    positions: [
      {
        id: 'pos1',
        title: 'Head',
        organizationId: 'root',
        groupIds: [],
        personId: 'p1',
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
  container.style.width = '600px';
  container.style.height = '400px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, { data: data(), useWorker: false });
  return { container, diagram };
}

describe('getData is a snapshot, not the live state', () => {
  it('mutating a collection does not reach the diagram', async () => {
    const { container, diagram } = await mount();

    const snap = diagram.getData();
    snap.organizations.push({ id: 'ghost', name: 'Ghost', groupIds: [] });
    snap.positions.length = 0;

    expect(diagram.getData().organizations.map((o) => o.id)).toEqual(['root', 'kid']);
    expect(diagram.getData().positions).toHaveLength(1);

    diagram.destroy();
    container.remove();
  });

  it('mutating a field on a node does not reach the diagram either', async () => {
    // The half that a shallow copy would have missed, and the one the audit
    // named by example: ids, coordinates, collapsed flags.
    const { container, diagram } = await mount();

    const snap = diagram.getData();
    snap.organizations[1]!.collapsed = false;
    snap.positions[0]!.title = 'rewritten';
    snap.persons[0]!.fullName = 'rewritten';

    const fresh = diagram.getData();
    expect(fresh.organizations[1]!.collapsed).toBe(true);
    expect(fresh.positions[0]!.title).toBe('Head');
    expect(fresh.persons[0]!.fullName).toBe('A B');

    diagram.destroy();
    container.remove();
  });

  it('two calls are independent objects', async () => {
    const { container, diagram } = await mount();
    expect(diagram.getData()).not.toBe(diagram.getData());
    expect(diagram.getData()).toEqual(diagram.getData());
    diagram.destroy();
    container.remove();
  });
});
