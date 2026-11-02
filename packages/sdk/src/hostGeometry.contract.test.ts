import { describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from './index.js';
import type { DiagramData } from './data/types.js';
import type { PixiHost } from './render/PixiHost.js';

/**
 * Точки геометрії для адаптера хоста (порт `TreeDiagramEngine` у
 * `cassiopeia-admin-ui`): `nodeCanvasPoint` / `nodeCenter` / `expanderCenter`.
 *
 * Сенс методів — щоб хост **не** складав `world·scale + pan` сам: саме така
 * координатна математика на боці хоста й була причиною reset гілки 4311. Тож
 * тести пінять рівності з боксом сцени й камерою, а не «десь усередині картки».
 */
function orgTreeData(): DiagramData {
  return {
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: false },
      { id: 'leaf', name: 'Leaf', groupIds: [], parentOrgId: 'root', collapsed: true },
    ],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
  };
}

type DiagramInternals = { host: PixiHost | null };

type TapTarget = { emit(event: 'pointertap', e: unknown): boolean };

function rendererOf(diagram: OrgHierarchyDiagram) {
  const host = (diagram as unknown as DiagramInternals).host;
  if (!host) throw new Error('expected host');
  return host.renderer;
}

function orgView(diagram: OrgHierarchyDiagram, id: string): TapTarget {
  const scene = (
    rendererOf(diagram) as unknown as {
      scene: { getView(kind: 'organization', id: string): TapTarget | undefined };
    }
  ).scene;
  const view = scene.getView('organization', id);
  if (!view) throw new Error(`expected a view for ${id}`);
  return view;
}

async function mount(callbacks?: Parameters<typeof OrgHierarchyDiagram.create>[1]['callbacks']) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: orgTreeData(),
    useWorker: false,
    ...(callbacks ? { callbacks } : {}),
  });
  return {
    diagram,
    cleanup: () => {
      diagram.destroy();
      container.remove();
    },
  };
}

function stubCanvasRect(diagram: OrgHierarchyDiagram, left: number, top: number): void {
  const canvas = diagram.getCanvas();
  if (!canvas) throw new Error('expected canvas');
  canvas.getBoundingClientRect = () =>
    ({ left, top, x: left, y: top, width: 800, height: 600, right: left + 800, bottom: top + 600 }) as DOMRect;
}

describe('host geometry points', () => {
  it('nodeCanvasPoint: box centre through the camera, recomputed on every call', async () => {
    const { diagram, cleanup } = await mount();
    try {
      diagram.setViewport({ x: 100, y: 50, scale: 2 });
      const box = diagram.listPromoteBoxes().find((b) => b.id === 'organization:root')!;
      expect(box).toBeTruthy();

      expect(diagram.nodeCanvasPoint('root')).toEqual({
        x: (box.x + box.width / 2) * 2 + 100,
        y: (box.y + box.height / 2) * 2 + 50,
      });

      // Не кешується: камера зрушила — точка теж.
      diagram.setViewport({ x: -30, y: 0, scale: 0.5 });
      expect(diagram.nodeCanvasPoint('root')).toEqual({
        x: (box.x + box.width / 2) * 0.5 - 30,
        y: (box.y + box.height / 2) * 0.5,
      });
    } finally {
      cleanup();
    }
  });

  it('nodeCenter: the canvas point offset by where the canvas sits in the window', async () => {
    const { diagram, cleanup } = await mount();
    try {
      diagram.setViewport({ x: 10, y: 20, scale: 1.5 });
      stubCanvasRect(diagram, 240, 64);
      const canvasPoint = diagram.nodeCanvasPoint('root')!;

      expect(diagram.nodeCenter('root')).toEqual({
        x: canvasPoint.x + 240,
        y: canvasPoint.y + 64,
      });
    } finally {
      cleanup();
    }
  });

  it('expanderCenter: the button centre, not the card centre', async () => {
    const { diagram, cleanup } = await mount();
    try {
      diagram.setViewport({ x: 7, y: 9, scale: 2 });
      stubCanvasRect(diagram, 100, 200);
      const e = diagram.listPromoteBoxes().find((b) => b.id === 'organization:root')!.expander!;
      expect(e).toBeTruthy();

      expect(diagram.expanderCenter('root')).toEqual({
        x: (e.x + e.width / 2) * 2 + 7 + 100,
        y: (e.y + e.height / 2) * 2 + 9 + 200,
      });
    } finally {
      cleanup();
    }
  });

  it('null, never a throw: unknown node, a leaf with no button, after destroy', async () => {
    const { diagram, cleanup } = await mount();
    try {
      expect(diagram.nodeCanvasPoint('nope')).toBeNull();
      expect(diagram.nodeCenter('nope')).toBeNull();
      expect(diagram.expanderCenter('nope')).toBeNull();
      expect(diagram.expanderCenter('leaf')).toBeNull();
      expect(diagram.nodeCenter('leaf')).not.toBeNull();

      diagram.destroy();
      expect(diagram.nodeCanvasPoint('root')).toBeNull();
      expect(diagram.nodeCenter('root')).toBeNull();
      expect(diagram.expanderCenter('root')).toBeNull();
    } finally {
      cleanup();
    }
  });
});

describe('onNodeClick modifiers', () => {
  it('carries the pointer modifiers of the click', async () => {
    const onNodeClick = rstest.fn();
    const { diagram, cleanup } = await mount({ onNodeClick });
    try {
      orgView(diagram, 'root').emit('pointertap', {
        button: 0,
        shiftKey: true,
        ctrlKey: false,
        metaKey: true,
        stopPropagation: () => {},
      });

      expect(onNodeClick).toHaveBeenCalledTimes(1);
      expect(onNodeClick.mock.calls[0]?.[1]).toEqual({
        modifiers: { shiftKey: true, ctrlKey: false, metaKey: true },
      });
    } finally {
      cleanup();
    }
  });

  it('a plain click reports every modifier as false', async () => {
    const onNodeClick = rstest.fn();
    const { diagram, cleanup } = await mount({ onNodeClick });
    try {
      orgView(diagram, 'root').emit('pointertap', { button: 0, stopPropagation: () => {} });

      expect(onNodeClick.mock.calls[0]?.[1]).toEqual({
        modifiers: { shiftKey: false, ctrlKey: false, metaKey: false },
      });
    } finally {
      cleanup();
    }
  });
});

describe('contextMenu incomingLink', () => {
  function staffData(): DiagramData {
    return {
      organizations: [{ id: 'org', name: 'Org', groupIds: [], collapsed: false }],
      groups: [],
      departments: [],
      persons: [],
      positions: ['head', 'mid', 'leaf'].map((id) => ({
        id,
        title: id,
        organizationId: 'org',
        groupIds: [],
        status: 'vacant' as const,
        isTemporary: false,
      })),
      reportLines: [
        { fromId: 'head', toId: 'mid', kind: 'admin', payload: { structureId: 's-1' } },
        { fromId: 'mid', toId: 'leaf', kind: 'matrix', payload: { structureId: 'm-1' } },
        { fromId: 'mid', toId: 'leaf', kind: 'admin', payload: { structureId: 's-2', fromDate: '2026-01-01' } },
      ],
    };
  }

  async function menuFor(id: string, kind: 'position' | 'organization') {
    const onContextMenu = rstest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: staffData(),
      useWorker: false,
      callbacks: { onContextMenu },
    });
    try {
      diagram.openContextMenu(
        kind === 'organization'
          ? { kind, id }
          : { kind, id, positionId: id, organizationId: 'org' },
      );
      return onContextMenu.mock.calls[0]?.[0];
    } finally {
      diagram.destroy();
      container.remove();
    }
  }

  it('the admin edge into the node, payload handed back untouched', async () => {
    const request = await menuFor('leaf', 'position');
    // Matrix edge into the same node is not the parent edge.
    expect(request.incomingLink).toEqual({
      fromId: 'mid',
      toId: 'leaf',
      kind: 'admin',
      payload: { structureId: 's-2', fromDate: '2026-01-01' },
    });
  });

  it('null for a head and for an organization', async () => {
    expect((await menuFor('head', 'position')).incomingLink).toBeNull();
    expect((await menuFor('org', 'organization')).incomingLink).toBeNull();
  });
});
