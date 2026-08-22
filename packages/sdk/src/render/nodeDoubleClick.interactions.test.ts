import { describe, expect, it, vi } from 'vitest';
import { OrgHierarchyDiagram } from '../index.js';
import { DiagramRenderer } from './DiagramRenderer.js';
import { OrganizationNodeView } from './OrganizationNode.js';
import { defaultNodeTheme } from './types.js';
import type { PixiHost } from './PixiHost.js';

function orgOnlyData() {
  return {
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: false },
      { id: 'child', name: 'Child', groupIds: [], parentOrgId: 'root', collapsed: true },
    ],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
  };
}

function personData() {
  return {
    organizations: [{ id: 'o1', name: 'Ops', groupIds: [] }],
    groups: [],
    departments: [],
    persons: [{ id: 'p1', fullName: 'Alice' }],
    positions: [
      {
        id: 'pos1',
        title: 'Head',
        organizationId: 'o1',
        groupIds: [],
        personId: 'p1',
        status: 'filled' as const,
        isTemporary: false,
        gridCell: { col: 0, row: 0 },
      },
    ],
    reportLines: [],
  };
}

type DiagramInternals = {
  host: PixiHost | null;
};

function hostOf(diagram: OrgHierarchyDiagram): PixiHost {
  const host = (diagram as unknown as DiagramInternals).host;
  if (!host) throw new Error('expected host');
  return host;
}

function tapEvent(local: { x: number; y: number } = { x: 40, y: 40 }) {
  return {
    stopPropagation: () => {},
    preventDefault: () => {},
    getLocalPosition: () => local,
    clientX: 10,
    clientY: 10,
    global: { x: 10, y: 10 },
  };
}

describe('onNodeDoubleClick (T69)', () => {
  it('success: two body taps → one onNodeClick + one onNodeDoubleClick', async () => {
    const onNodeClick = vi.fn();
    const onNodeDoubleClick = vi.fn();
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    const diagram = await OrgHierarchyDiagram.create(container, {
      data: orgOnlyData(),
      useWorker: false,
      callbacks: { onNodeClick, onNodeDoubleClick },
    });

    const orgs = hostOf(diagram).renderer.layers.organizations;
    const node = orgs.children.find((c) => c instanceof OrganizationNodeView);
    expect(node).toBeTruthy();

    node!.emit('pointertap', tapEvent());
    node!.emit('pointertap', tapEvent());

    expect(onNodeClick).toHaveBeenCalledTimes(1);
    expect(onNodeClick).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'organization', id: expect.any(String) }),
    );
    expect(onNodeDoubleClick).toHaveBeenCalledTimes(1);
    expect(onNodeDoubleClick).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'organization',
        id: onNodeClick.mock.calls[0]![0].id,
      }),
    );

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: person double-tap uses same NodeRef shape as click', async () => {
    const onNodeClick = vi.fn();
    const onNodeDoubleClick = vi.fn();
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    const diagram = await OrgHierarchyDiagram.create(container, {
      data: personData(),
      staffCurrentOrgId: 'o1',
      useWorker: false,
      callbacks: { onNodeClick, onNodeDoubleClick },
    });

    const persons = hostOf(diagram).renderer.layers.persons;
    expect(persons.children.length).toBeGreaterThan(0);
    const node = persons.children[0]!;

    node.emit('pointertap', tapEvent());
    node.emit('pointertap', tapEvent());

    expect(onNodeClick).toHaveBeenCalledTimes(1);
    expect(onNodeDoubleClick).toHaveBeenCalledTimes(1);
    expect(onNodeDoubleClick.mock.calls[0]![0]).toEqual(onNodeClick.mock.calls[0]![0]);
    expect(onNodeDoubleClick.mock.calls[0]![0]).toMatchObject({
      kind: 'person',
      id: 'p1',
      personId: 'p1',
      positionId: 'pos1',
    });

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: chrome hit still expands — no onNodeDoubleClick', async () => {
    const onExpand = vi.fn();
    const onCollapse = vi.fn();
    const onOrgClick = vi.fn();
    const onOrgDoubleClick = vi.fn();
    const renderer = new DiagramRenderer();

    await renderer.render(orgOnlyData(), defaultNodeTheme, 'light', undefined, {
      onOrgClick,
      onOrgDoubleClick,
      onOrgExpand: onExpand,
      onOrgCollapse: onCollapse,
      onOrgContextMenu: () => {},
    });

    const node = renderer.layers.organizations.children.find(
      (c) => c instanceof OrganizationNodeView && (c as OrganizationNodeView).hasExpandControl(),
    ) as OrganizationNodeView | undefined;
    expect(node).toBeTruthy();

    const chrome = (node as unknown as { chromeControls: { children: { x: number; y: number }[] } })
      .chromeControls;
    const btn = chrome.children[0]!;
    const chromeTap = tapEvent({ x: btn.x + 11, y: btn.y + 11 });

    // T52 chrome wins (expand or collapse affordance) — body click/dblclick stay quiet.
    expect(node!.activateChromePointer(chromeTap as never)).toBe(true);
    expect(onExpand.mock.calls.length + onCollapse.mock.calls.length).toBe(1);
    onExpand.mockClear();
    onCollapse.mockClear();

    // Same path as production: pointertap → activateChromePointer first.
    node!.emit('pointertap', chromeTap);
    node!.emit('pointertap', chromeTap);
    expect(onExpand.mock.calls.length + onCollapse.mock.calls.length).toBe(2);
    expect(onOrgClick).not.toHaveBeenCalled();
    expect(onOrgDoubleClick).not.toHaveBeenCalled();

    // Body double-tap still forms a fresh sequence after chrome (tracker reset).
    node!.emit('pointertap', tapEvent({ x: 40, y: 80 }));
    node!.emit('pointertap', tapEvent({ x: 40, y: 80 }));
    expect(onOrgClick).toHaveBeenCalledTimes(1);
    expect(onOrgDoubleClick).toHaveBeenCalledTimes(1);

    renderer.destroy();
  });

  it('success: second body tap skips staff expand toggle', async () => {
    const onOrgClick = vi.fn();
    const onOrgDoubleClick = vi.fn();
    const onStaffOrgExpandToggle = vi.fn();
    const renderer = new DiagramRenderer();

    const data = {
      organizations: [
        { id: 'o1', name: 'Ops', groupIds: [] },
        { id: 'o2', name: 'Child Org', groupIds: [], parentOrgId: 'o1' },
      ],
      groups: [],
      departments: [],
      persons: [{ id: 'p1', fullName: 'Alice' }],
      positions: [
        {
          id: 'pos1',
          title: 'Head',
          organizationId: 'o1',
          groupIds: [],
          personId: 'p1',
          status: 'filled' as const,
          isTemporary: false,
          isHead: true,
        },
      ],
      reportLines: [],
    };

    await renderer.render(data, defaultNodeTheme, 'light', undefined, {
      staff: { currentOrgId: 'o1' },
      onOrgClick,
      onOrgDoubleClick,
      onStaffOrgExpandToggle,
    });

    const cards = renderer.layers.organizations.children.filter(
      (c) => c instanceof OrganizationNodeView,
    );
    expect(cards.length).toBeGreaterThan(0);
    const card = cards[0]!;

    card.emit('pointertap', tapEvent());
    card.emit('pointertap', tapEvent());

    expect(onStaffOrgExpandToggle).toHaveBeenCalledTimes(1);
    expect(onOrgClick).toHaveBeenCalledTimes(1);
    expect(onOrgDoubleClick).toHaveBeenCalledTimes(1);

    renderer.destroy();
  });

  it('failure: missing callback is a no-op (no throw)', async () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    const diagram = await OrgHierarchyDiagram.create(container, {
      data: orgOnlyData(),
      useWorker: false,
    });

    const orgs = hostOf(diagram).renderer.layers.organizations;
    const node = orgs.children.find((c) => c instanceof OrganizationNodeView);
    expect(() => {
      node!.emit('pointertap', tapEvent());
      node!.emit('pointertap', tapEvent());
    }).not.toThrow();

    diagram.destroy();
    document.body.removeChild(container);
  });
});
