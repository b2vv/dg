import { describe, expect, it, vi } from 'vitest';
import { OrgHierarchyDiagram } from '../index.js';
import { InteractionError } from '../interaction/index.js';
import { VARIANT_B_POSITIONS } from '../contour/bridge.js';

function makeData() {
  return {
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: true },
      { id: 'org1', name: 'Demo Org', groupIds: [], parentOrgId: 'root', collapsed: true },
    ],
    groups: [],
    departments: [
      { id: 'IT', name: 'IT', organizationId: 'org1' },
      { id: 'CEO', name: 'CEO', organizationId: 'org1' },
    ],
    persons: [
      { id: 'person-alice', fullName: 'Alice CEO' },
      ...VARIANT_B_POSITIONS.filter((p) => p.id !== 'P1').map((p) => ({
        id: `person-${p.id}`,
        fullName: `Person ${p.id}`,
      })),
    ],
    positions: VARIANT_B_POSITIONS.map((p) => ({
      id: p.id,
      title: p.id === 'P1' ? 'CEO' : p.id,
      organizationId: 'org1',
      departmentId: p.departmentId,
      groupIds: [],
      personId: p.id === 'P1' ? 'person-alice' : `person-${p.id}`,
      status: 'filled' as const,
      isTemporary: p.id === 'P4',
      gridCell: { col: p.col, row: p.row },
      hierarchyLevel: p.row,
    })),
    reportLines: [],
  };
}

async function mount() {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: makeData(),
    staffCurrentOrgId: 'org1',
    useWorker: false,
  });
  return { container, diagram };
}

describe('OrgHierarchyDiagram interactions', () => {
  it('success: search Alice returns hits', async () => {
    const { container, diagram } = await mount();
    const hits = await diagram.search('Alice');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => /alice/i.test(h.label))).toBe(true);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('failure: search empty → []', async () => {
    const { container, diagram } = await mount();
    expect(await diagram.search('')).toEqual([]);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: revealPath expands ancestors', async () => {
    const { container, diagram } = await mount();
    const ok = await diagram.revealPath('person-alice');
    expect(ok).toBe(true);
    const orgs = diagram.getData().organizations;
    expect(orgs.find((o) => o.id === 'org1')?.collapsed).toBe(false);
    expect(orgs.find((o) => o.id === 'root')?.collapsed).toBe(false);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('failure: focusNode unknown → false no-op', async () => {
    const { container, diagram } = await mount();
    expect(await diagram.focusNode('nope')).toBe(false);
    expect(diagram.getSelection()).toBeNull();
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: movePersonToCell emits layout patch', async () => {
    const onLayoutChange = vi.fn();
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: makeData(),
      staffCurrentOrgId: 'org1',
      useWorker: false,
      callbacks: { onLayoutChange },
    });
    await diagram.movePersonToCell('P1', 4, 5);
    expect(onLayoutChange).toHaveBeenCalledWith({
      type: 'position-move',
      positionId: 'P1',
      col: 4,
      row: 5,
    });
    expect(diagram.getData().positions.find((p) => p.id === 'P1')?.gridCell).toEqual({
      col: 4,
      row: 5,
    });
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('failure: appendData without mapper throws', async () => {
    const { container, diagram } = await mount();
    await expect(diagram.appendData({ x: 1 })).rejects.toThrow(InteractionError);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: shiftBlock moves same hierarchy band', async () => {
    const { container, diagram } = await mount();
    const before = diagram.getData().positions.find((p) => p.id === 'P1')!.gridCell!.row;
    await diagram.shiftBlock('P1', 1);
    const after = diagram.getData().positions.find((p) => p.id === 'P1')!.gridCell!.row;
    expect(after).toBe(before + 1);
    diagram.destroy();
    document.body.removeChild(container);
  });
});
