/**
 * Mandatory node interaction contract — work/tasks/NODE-interactions-contract.md
 * Regression guard: do not skip or weaken without product sign-off.
 */
import { describe, expect, it, vi } from 'vitest';
import { OrgHierarchyDiagram } from '../index.js';
import { defaultContextMenuItems } from '../interaction/contextMenu.js';
import { OrganizationNodeView } from './OrganizationNode.js';
import { PersonNodeView } from './PersonNode.js';
import { defaultNodeTheme } from './types.js';
import type { PixiHost } from './PixiHost.js';

function orgTreeData() {
  return {
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: false, testId: 'root' },
      { id: 'child', name: 'Child', groupIds: [], parentOrgId: 'root', collapsed: true },
    ],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
  };
}

function staffWithVacantData() {
  return {
    organizations: [{ id: 'o1', name: 'Ops', groupIds: [] }],
    groups: [],
    departments: [{ id: 'd1', name: 'Desk', organizationId: 'o1' }],
    persons: [{ id: 'p1', fullName: 'Alice Chen' }],
    positions: [
      {
        id: 'pos-filled',
        title: 'Director',
        organizationId: 'o1',
        departmentId: 'd1',
        groupIds: [],
        personId: 'p1',
        status: 'filled' as const,
        isTemporary: false,
        isHead: true,
      },
      {
        id: 'pos-vac',
        title: 'Analyst',
        organizationId: 'o1',
        departmentId: 'd1',
        groupIds: [],
        status: 'vacant' as const,
        isTemporary: false,
        testId: 'seat-vac',
      },
    ],
    reportLines: [{ fromId: 'pos-filled', toId: 'pos-vac', kind: 'admin' as const }],
  };
}

type DiagramInternals = { host: PixiHost | null };

function hostOf(diagram: OrgHierarchyDiagram): PixiHost {
  const host = (diagram as unknown as DiagramInternals).host;
  if (!host) throw new Error('expected host');
  return host;
}

function pointerEvent(
  local: { x: number; y: number } = { x: 40, y: 40 },
  extra: { button?: number; ctrlKey?: boolean; shiftKey?: boolean } = {},
) {
  return {
    stopPropagation: () => {},
    preventDefault: () => {},
    getLocalPosition: () => local,
    clientX: 120,
    clientY: 80,
    global: { x: 10, y: 10 },
    button: extra.button ?? 0,
    ctrlKey: Boolean(extra.ctrlKey),
    metaKey: false,
    shiftKey: Boolean(extra.shiftKey),
  };
}

function findPersonNode(diagram: OrgHierarchyDiagram, label: string): PersonNodeView {
  const persons = hostOf(diagram).renderer.layers.persons;
  const node = persons.children.find(
    (c) => c instanceof PersonNodeView && c.findText(label),
  );
  if (!node) throw new Error(`person node with label ${label}`);
  return node;
}

async function mountDiagram(
  data: ReturnType<typeof orgTreeData>,
  callbacks: Parameters<typeof OrgHierarchyDiagram.create>[1]['callbacks'] = {},
  extra: Partial<Parameters<typeof OrgHierarchyDiagram.create>[1]> = {},
) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data,
    useWorker: false,
    callbacks,
    ...extra,
  });
  return { container, diagram };
}

describe('NODE interactions contract', () => {
  describe('CTX-1 org right-click opens context menu without selecting', () => {
    it('onContextMenu fires once; onNodeClick silent; selection unchanged', async () => {
      const onNodeClick = vi.fn();
      const onContextMenu = vi.fn();
      const onSelectionChange = vi.fn();
      const { container, diagram } = await mountDiagram(orgTreeData(), {
        onNodeClick,
        onContextMenu,
        onSelectionChange,
      });

      const orgs = hostOf(diagram).renderer.layers.organizations;
      const node = orgs.children.find((c) => c instanceof OrganizationNodeView);
      expect(node).toBeTruthy();

      node!.emit('rightclick', pointerEvent({ x: 40, y: 40 }, { button: 2 }));
      node!.emit('pointertap', pointerEvent({ x: 40, y: 40 }, { button: 2 }));

      expect(onContextMenu).toHaveBeenCalledTimes(1);
      expect(onContextMenu.mock.calls[0]![0].node.ref.kind).toBe('organization');
      expect(onContextMenu.mock.calls[0]![0].items.length).toBeGreaterThan(0);
      expect(onNodeClick).not.toHaveBeenCalled();
      expect(diagram.getSelection()).toBeNull();
      expect(onSelectionChange).not.toHaveBeenCalled();

      diagram.destroy();
      document.body.removeChild(container);
    });
  });

  describe('CTX-2 person right-click opens context menu without selecting', () => {
    it('filled staff seat opens menu with person payload', async () => {
      const onNodeClick = vi.fn();
      const onContextMenu = vi.fn();
      const { container, diagram } = await mountDiagram(staffWithVacantData(), {
        onNodeClick,
        onContextMenu,
      }, { staffCurrentOrgId: 'o1' });

      const node = findPersonNode(diagram, 'Alice Chen');

      node.emit('rightclick', pointerEvent({}, { button: 2 }));
      node.emit('pointertap', pointerEvent({}, { button: 2 }));

      expect(onContextMenu).toHaveBeenCalledTimes(1);
      expect(onContextMenu.mock.calls[0]![0].node.person?.fullName).toBe('Alice Chen');
      expect(onNodeClick).not.toHaveBeenCalled();

      diagram.destroy();
      document.body.removeChild(container);
    });
  });

  describe('CTX-3 vacant position right-click opens context menu', () => {
    it('position ref with title, no person in payload', async () => {
      const onContextMenu = vi.fn();
      const { container, diagram } = await mountDiagram(staffWithVacantData(), {
        onContextMenu,
      }, { staffCurrentOrgId: 'o1' });

      const vacantNode = findPersonNode(diagram, '(вакансія)');

      vacantNode.emit('rightclick', pointerEvent({}, { button: 2 }));
      vacantNode.emit('pointertap', pointerEvent({}, { button: 2 }));

      expect(onContextMenu).toHaveBeenCalledTimes(1);
      const req = onContextMenu.mock.calls[0]![0];
      expect(req.node.ref.kind).toBe('position');
      expect(req.node.ref.id).toBe('pos-vac');
      expect(req.node.position?.title).toBe('Analyst');
      expect(req.node.person).toBeUndefined();

      diagram.destroy();
      document.body.removeChild(container);
    });
  });

  describe('CTX-4 ⋮ menu button opens context menu', () => {
    it('org menu chrome invokes same callback as programmatic open', () => {
      const onMenu = vi.fn();
      const view = OrganizationNodeView.create(
        { id: 'o1', name: 'Test Org', groupIds: [] },
        undefined,
        'dark',
        defaultNodeTheme.organization,
        'near',
        { onContextMenu: onMenu },
      );
      const menuX = defaultNodeTheme.organization.width - 22 - 4 + 10;
      const e = pointerEvent({ x: menuX, y: 14 });
      expect(view.activateChromePointer(e as never)).toBe(true);
      expect(onMenu).toHaveBeenCalledWith({ clientX: 120, clientY: 80 });
    });

    it('person menu chrome invokes callback', () => {
      const onMenu = vi.fn();
      const view = PersonNodeView.create(
        { id: 'p1', fullName: 'Bob' },
        {
          id: 'pos1',
          title: 'Lead',
          organizationId: 'o1',
          groupIds: [],
          status: 'filled',
          isTemporary: false,
        },
        defaultNodeTheme.person,
        'near',
        { onContextMenu: onMenu },
      );
      expect(view.hasMenuButton()).toBe(true);
      const e = pointerEvent({ x: 14, y: 14 });
      expect(view.activateChromePointer(e as never)).toBe(true);
      expect(onMenu).toHaveBeenCalledWith({ clientX: 120, clientY: 80 });
    });
  });

  describe('CTX-5 openContextMenu programmatic API', () => {
    it('diagram.openContextMenu delivers default items to host', async () => {
      const onContextMenu = vi.fn();
      const { container, diagram } = await mountDiagram(orgTreeData(), { onContextMenu });

      diagram.openContextMenu({ kind: 'organization', id: 'root', organizationId: 'root' }, {
        clientX: 50,
        clientY: 60,
      });

      expect(onContextMenu).toHaveBeenCalledTimes(1);
      const req = onContextMenu.mock.calls[0]![0];
      expect(req.node.organization?.name).toBe('Root');
      expect(req.items.map((i) => i.id)).toEqual(
        defaultContextMenuItems({ kind: 'organization', id: 'root' }).map((i) => i.id),
      );

      diagram.destroy();
      document.body.removeChild(container);
    });
  });

  describe('SEL-1 primary click selects org', () => {
    it('onNodeClick fires and selection updates', async () => {
      const onNodeClick = vi.fn();
      const onSelectionChange = vi.fn();
      const { container, diagram } = await mountDiagram(orgTreeData(), {
        onNodeClick,
        onSelectionChange,
      });

      const orgs = hostOf(diagram).renderer.layers.organizations;
      const node = orgs.children.find((c) => c instanceof OrganizationNodeView)!;

      node.emit('pointertap', pointerEvent());

      expect(onNodeClick).toHaveBeenCalledTimes(1);
      expect(diagram.getSelection()?.kind).toBe('organization');
      expect(onSelectionChange).toHaveBeenCalled();

      diagram.destroy();
      document.body.removeChild(container);
    });
  });

  describe('SEL-2 primary click selects person', () => {
    it('onNodeClick fires for filled seat', async () => {
      const onNodeClick = vi.fn();
      const { container, diagram } = await mountDiagram(staffWithVacantData(), {
        onNodeClick,
      }, { staffCurrentOrgId: 'o1' });

      const node = findPersonNode(diagram, 'Alice Chen');
      node.emit('pointertap', pointerEvent());

      expect(onNodeClick).toHaveBeenCalledTimes(1);
      expect(onNodeClick.mock.calls[0]![0]).toMatchObject({
        kind: 'person',
        personId: 'p1',
      });

      diagram.destroy();
      document.body.removeChild(container);
    });
  });

  describe('SEL-4 vacant seat click selects position (T78-L5)', () => {
    it('success: vacant pointertap selects by positionId', async () => {
      const onNodeClick = vi.fn();
      const { container, diagram } = await mountDiagram(
        staffWithVacantData(),
        { onNodeClick },
        { staffCurrentOrgId: 'o1' },
      );

      const vacant = findPersonNode(diagram, '(вакансія)');
      vacant.emit('pointertap', pointerEvent());

      expect(onNodeClick).toHaveBeenCalledTimes(1);
      expect(onNodeClick.mock.calls[0]![0]).toMatchObject({
        kind: 'position',
        id: 'pos-vac',
      });
      expect(diagram.getSelection()?.kind).toBe('position');
      expect(diagram.getSelection()?.id).toBe('pos-vac');

      diagram.destroy();
      document.body.removeChild(container);
    });
  });

  describe('SEL-3 modifier click toggles without replacing right-click semantics', () => {
    it('ctrl+tap toggles selection; right-click still skips onNodeClick', async () => {
      const onNodeClick = vi.fn();
      const onContextMenu = vi.fn();
      const { container, diagram } = await mountDiagram(staffWithVacantData(), {
        onNodeClick,
        onContextMenu,
      }, { staffCurrentOrgId: 'o1' });

      const node = findPersonNode(diagram, 'Alice Chen');
      node.emit('pointertap', pointerEvent({}, { ctrlKey: true }));
      expect(onNodeClick).toHaveBeenCalledTimes(1);
      expect(diagram.getSelections()).toHaveLength(1);

      node.emit('pointertap', pointerEvent({}, { ctrlKey: true }));
      expect(diagram.getSelections()).toHaveLength(0);

      onNodeClick.mockClear();
      node.emit('rightclick', pointerEvent({}, { button: 2 }));
      node.emit('pointertap', pointerEvent({}, { button: 2 }));
      expect(onContextMenu).toHaveBeenCalled();
      expect(onNodeClick).not.toHaveBeenCalled();

      diagram.destroy();
      document.body.removeChild(container);
    });
  });

  describe('LAY-1 non-interactive paint layers', () => {
    it('edges and zones do not capture pointer events', async () => {
      const { container, diagram } = await mountDiagram(staffWithVacantData(), {}, {
        staffCurrentOrgId: 'o1',
      });
      const layers = hostOf(diagram).renderer.layers;
      expect(layers.edges.eventMode).toBe('none');
      expect(layers.zones.eventMode).toBe('none');
      expect(layers.departmentStrokes.eventMode).toBe('none');
      diagram.destroy();
      document.body.removeChild(container);
    });
  });
});

describe('SEL-4 shift+click multi-select across node kinds', () => {
  it('shift+tap adds staff seats to the set; plain tap replaces it', async () => {
    const { container, diagram } = await mountDiagram(staffWithVacantData(), {}, {
      staffCurrentOrgId: 'o1',
    });

    const filled = findPersonNode(diagram, 'Alice Chen');
    const vacant = findPersonNode(diagram, '(вакансія)');

    filled.emit('pointertap', pointerEvent());
    expect(diagram.getSelections()).toHaveLength(1);

    vacant.emit('pointertap', pointerEvent({}, { shiftKey: true }));
    expect(diagram.getSelections()).toHaveLength(2);

    // Shift again removes membership; a plain tap collapses back to one.
    vacant.emit('pointertap', pointerEvent({}, { shiftKey: true }));
    expect(diagram.getSelections()).toHaveLength(1);
    vacant.emit('pointertap', pointerEvent());
    expect(diagram.getSelections()).toHaveLength(1);

    diagram.destroy();
    container.remove();
  });

  it('shift+tap adds organization cards, and the menu turns bulk', async () => {
    const items: string[][] = [];
    const { container, diagram } = await mountDiagram(orgTreeData(), {
      onContextMenu: (request) => {
        items.push(request.items.map((i) => i.id));
        return false;
      },
    });

    const orgs = hostOf(diagram).renderer.layers.organizations.children;
    const [first, second] = orgs;
    if (!first || !second) throw new Error('expected two org cards');

    first.emit('pointertap', pointerEvent());
    second.emit('pointertap', pointerEvent({}, { shiftKey: true }));
    expect(diagram.getSelections()).toHaveLength(2);

    second.emit('rightclick', pointerEvent({}, { button: 2 }));
    expect(items.at(-1)).toEqual([
      'bulk-expand',
      'bulk-collapse',
      'bulk-copy-ids',
      'bulk-clear',
    ]);

    diagram.destroy();
    container.remove();
  });
});
