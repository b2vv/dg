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

  it('success: expandOrg on child keeps root visible (A12)', async () => {
    const { container, diagram } = await mount();
    await diagram.expandOrg('org1');
    const orgs = diagram.getData().organizations;
    expect(orgs.find((o) => o.id === 'org1')?.collapsed).toBe(false);
    expect(orgs.find((o) => o.id === 'root')?.collapsed).toBe(false);
    expect(diagram.getOrgMode()).toBe('row-tree');
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

  it('success: appendData dedupes by id on repeat chunk (A6)', async () => {
    const { container, diagram } = await mount();
    const before = diagram.getData().organizations.length;
    await diagram.appendData(
      {
        organizations: [{ id: 'org1', name: 'Demo Org Renamed', groupIds: [], parentOrgId: 'root' }],
        groups: [],
        departments: [],
        persons: [],
        positions: [],
        reportLines: [],
      },
      { toDiagram: async (chunk) => chunk as ReturnType<typeof makeData> },
    );
    expect(diagram.getData().organizations).toHaveLength(before);
    expect(diagram.getData().organizations.find((o) => o.id === 'org1')?.name).toBe(
      'Demo Org Renamed',
    );
    await expect(
      diagram.appendData(
        {
          organizations: [{ id: 'org1', name: 'Again', groupIds: [], parentOrgId: 'root' }],
          groups: [],
          departments: [],
          persons: [],
          positions: [],
          reportLines: [],
        },
        { toDiagram: async (chunk) => chunk as ReturnType<typeof makeData> },
      ),
    ).resolves.toBeUndefined();
    expect(diagram.getData().organizations).toHaveLength(before);
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

  it('success: setData replaces data and fires onDataMapped', async () => {
    const onDataMapped = vi.fn();
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: makeData(),
      staffCurrentOrgId: 'org1',
      useWorker: false,
      callbacks: { onDataMapped },
    });
    const next = {
      ...makeData(),
      organizations: [{ id: 'solo', name: 'Solo', groupIds: [] }],
      positions: [],
      persons: [],
      departments: [],
    };
    await diagram.setData(next);
    expect(diagram.getData().organizations).toHaveLength(1);
    expect(diagram.getData().organizations[0]!.id).toBe('solo');
    expect(onDataMapped).toHaveBeenCalled();
    expect(onDataMapped.mock.calls.at(-1)?.[0]).toMatchObject({
      orgs: 1,
      persons: 0,
      positions: 0,
    });
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('failure: setData without DiagramData or mapper throws', async () => {
    const { container, diagram } = await mount();
    await expect(diagram.setData({ foo: 1 } as never)).rejects.toThrow(/DiagramData/i);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: multi-select Set API add/toggle/clear; single-select still works', async () => {
    const onSelectionChange = vi.fn();
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: makeData(),
      staffCurrentOrgId: 'org1',
      useWorker: false,
      callbacks: { onSelectionChange },
    });

    const a = { kind: 'person' as const, id: 'person-alice', personId: 'person-alice', positionId: 'P1' };
    const b = {
      kind: 'person' as const,
      id: 'person-P2',
      personId: 'person-P2',
      positionId: 'P2',
    };

    // Single-select path (compat)
    await diagram.select(a);
    expect(diagram.getSelection()).toMatchObject({ id: 'person-alice' });
    expect(diagram.getSelections()).toHaveLength(1);
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'person-alice' }),
    ]);

    await diagram.selectMany([a, b]);
    expect(diagram.getSelections().map((n) => n.id)).toEqual(['person-alice', 'person-P2']);
    expect(diagram.getSelection()?.id).toBe('person-alice');

    await diagram.toggleSelection(a);
    expect(diagram.getSelections().map((n) => n.id)).toEqual(['person-P2']);

    await diagram.toggleSelection(a);
    expect(diagram.getSelections().map((n) => n.id)).toEqual(['person-P2', 'person-alice']);

    await diagram.clearSelection();
    expect(diagram.getSelections()).toEqual([]);
    expect(diagram.getSelection()).toBeNull();
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: D1 select does not rebuild scene via DiagramRenderer.render', async () => {
    const { container, diagram } = await mount();
    type Host = { renderer: { render: (...a: unknown[]) => Promise<void>; repaintSelection: (...a: unknown[]) => void } };
    const host = (diagram as unknown as { host: Host }).host;
    const renderSpy = vi.spyOn(host.renderer, 'render');
    const repaintSpy = vi.spyOn(host.renderer, 'repaintSelection');
    renderSpy.mockClear();
    repaintSpy.mockClear();

    await diagram.select({ kind: 'organization', id: 'org1', organizationId: 'org1' });
    await diagram.clearSelection();

    expect(renderSpy).not.toHaveBeenCalled();
    expect(repaintSpy).toHaveBeenCalled();
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: selection overlay resolves typed kind:id boxes', async () => {
    const { container, diagram } = await mount();
    type Host = {
      renderer: {
        getNodeBox: (id: string) => { id: string } | undefined;
        layers: { overlay: { children: unknown[] } };
      };
    };
    const host = (diagram as unknown as { host: Host }).host;
    expect(host.renderer.getNodeBox('P1')).toBeTruthy();
    expect(host.renderer.getNodeBox('position:P1')).toBeTruthy();

    await diagram.select({
      kind: 'person',
      id: 'person-alice',
      personId: 'person-alice',
      positionId: 'P1',
    });
    expect(host.renderer.layers.overlay.children.length).toBeGreaterThan(0);

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: focusByTestId expands collapsed org then selects', async () => {
    const onSelectionChange = vi.fn();
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: {
        ...makeData(),
        organizations: [
          { id: 'root', name: 'Root', groupIds: [], collapsed: true, testId: 'root' },
          { id: 'org1', name: 'Demo Org', groupIds: [], parentOrgId: 'root', collapsed: true },
        ],
      },
      useWorker: false,
      callbacks: { onSelectionChange },
    });
    expect(diagram.getData().organizations.find((o) => o.id === 'root')?.collapsed).toBe(true);
    const ok = await diagram.focusByTestId('root');
    expect(ok).toBe(true);
    expect(diagram.getData().organizations.find((o) => o.id === 'root')?.collapsed).toBe(false);
    expect(diagram.getSelection()?.id).toBe('root');
    expect(onSelectionChange).toHaveBeenCalledWith([
      expect.objectContaining({ kind: 'organization', id: 'root' }),
    ]);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: placeOrgAtMatrixCell emits matrix-cell patch (T78-L7)', async () => {
    const onLayoutChange = vi.fn();
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: makeData(),
      useWorker: false,
      callbacks: { onLayoutChange },
    });
    await diagram.placeOrgAtMatrixCell('org1', 0, 1);
    expect(onLayoutChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'matrix-cell', orgId: 'org1', row: 0, col: 1 }),
    );
    expect(diagram.getData().organizations.find((o) => o.id === 'org1')?.inMatrix).not.toBe(
      false,
    );
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('failure: placeOrgAtMatrixCell out-of-bounds is a no-op without onLayoutChange (T78-L7)', async () => {
    const onLayoutChange = vi.fn();
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: makeData(),
      useWorker: false,
      callbacks: { onLayoutChange },
    });
    const before = diagram.getData().organizations;
    await diagram.placeOrgAtMatrixCell('org1', 99, 99);
    expect(onLayoutChange).not.toHaveBeenCalled();
    expect(diagram.getData().organizations).toBe(before);
    diagram.destroy();
    document.body.removeChild(container);
  });
});

describe('bulk selection actions (T67 D2)', () => {
  async function mountOrgs() {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: makeData(),
      useWorker: false,
    });
    return { container, diagram };
  }

  const orgRef = (id: string) => ({ kind: 'organization' as const, id, organizationId: id });

  function contextRequest(id: string, itemIds: readonly string[]) {
    return {
      node: { ref: orgRef(id) },
      items: itemIds.map((itemId) => ({ id: itemId, label: itemId })),
      pointer: { clientX: 0, clientY: 0 },
    } as unknown as Parameters<OrgHierarchyDiagram['runContextMenuAction']>[1];
  }

  it('success: bulk-collapse applies to the selection, not to the clicked node', async () => {
    const { container, diagram } = await mountOrgs();
    await diagram.expandOrg('root');
    expect(diagram.getData().organizations.find((o) => o.id === 'root')?.collapsed).toBe(false);

    await diagram.selectMany([orgRef('root')]);
    await diagram.runContextMenuAction('bulk-collapse', contextRequest('org1', ['bulk-collapse']));

    expect(diagram.getData().organizations.find((o) => o.id === 'root')?.collapsed).toBe(true);
    diagram.destroy();
    container.remove();
  });

  it('success: bulk-clear empties the selection', async () => {
    const { container, diagram } = await mountOrgs();
    await diagram.selectMany([orgRef('root'), orgRef('org1')]);
    expect(diagram.getSelections()).toHaveLength(2);

    await diagram.runContextMenuAction('bulk-clear', contextRequest('root', ['bulk-clear']));
    expect(diagram.getSelections()).toHaveLength(0);
    diagram.destroy();
    container.remove();
  });

  it('success: bulk-copy-ids writes every selected node as kind:id', async () => {
    const writeText = vi.fn(async () => {});
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const { container, diagram } = await mountOrgs();
    await diagram.selectMany([orgRef('root'), orgRef('org1')]);
    await diagram.runContextMenuAction('bulk-copy-ids', contextRequest('root', ['bulk-copy-ids']));

    expect(writeText).toHaveBeenCalledWith('organization:root organization:org1');
    Object.defineProperty(navigator, 'clipboard', { value: original, configurable: true });
    diagram.destroy();
    container.remove();
  });

  it('failure: setOrgsCollapsed with an empty list leaves the data untouched', async () => {
    const { container, diagram } = await mountOrgs();
    const before = diagram.getData().organizations;
    await diagram.setOrgsCollapsed([], true);
    expect(diagram.getData().organizations).toBe(before);
    diagram.destroy();
    container.remove();
  });
});
