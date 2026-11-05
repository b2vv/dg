import { describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram, type PixiHost } from './index.js';
import type { DiagramData } from './data/types.js';
import { visiblePositions } from './layout/staff/positionExpand.js';

type Config = Parameters<typeof OrgHierarchyDiagram.create>[1];

function treeData(): DiagramData {
  return {
    organizations: [{ id: 'org', name: 'Org', groupIds: [], collapsed: false }],
    groups: [], departments: [],
    persons: [{ id: 'person', fullName: 'Ada Lovelace' }],
    positions: ['head', 'manager', 'target'].map((id) => ({
      id, title: id, organizationId: 'org', groupIds: [],
      status: 'filled', isTemporary: false, expanded: false,
      ...(id === 'head' ? { isHead: true } : {}),
      ...(id === 'target' ? { personId: 'person' } : {}),
    })),
    reportLines: [
      { fromId: 'head', toId: 'manager', kind: 'admin' },
      { fromId: 'manager', toId: 'target', kind: 'admin' },
    ],
  };
}

async function mount(data = treeData(), options: Partial<Config> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data, useWorker: false, staffCurrentOrgId: 'org', ...options,
  });
  const host = (diagram as unknown as {
    host: Pick<PixiHost, 'panTo'> & { renderer: {
      render: (...args: unknown[]) => Promise<void>;
      getNodeBox: PixiHost['renderer']['getNodeBox'];
    } };
  }).host;
  const render = host.renderer.render.bind(host.renderer);
  let frames = 0;
  host.renderer.render = (...args) => { frames += 1; return render(...args); };
  return {
    diagram, host, frames: () => frames,
    cleanup: () => { diagram.destroy(); container.remove(); },
  };
}

function visibleIds(diagram: OrgHierarchyDiagram): string[] {
  const data = diagram.getData();
  return visiblePositions(data.positions, data.reportLines, 'org', diagram.getStaffExpandedPositionIds())
    .map((position) => position.id);
}

describe('revealPath admin position ancestors', () => {
  for (const target of ['target', 'person']) {
    it(`reveals a hidden ${target} through the full admin path in one frame`, async () => {
      const changes: unknown[] = [];
      const layouts: unknown[] = [];
      const mounted = await mount(treeData(), { callbacks: {
        onPositionExpandChange: (change) => changes.push(change),
        onLayoutChange: (change) => layouts.push(change),
      } });
      try {
        expect(visibleIds(mounted.diagram)).toEqual(['head']); // counter-probe
        expect(await mounted.diagram.revealPath(target)).toBe(true);
        expect(mounted.diagram.getStaffExpandedPositionIds().sort()).toEqual(['head', 'manager']);
        expect(visibleIds(mounted.diagram)).toContain('target');
        expect(mounted.frames()).toBe(1);
        expect(changes).toEqual([{ positionId: 'manager', expanded: true, changedIds: ['manager', 'head'] }]);
        expect(layouts).toContainEqual({ type: 'position-expand', positionId: 'manager', expanded: true });
      } finally { mounted.cleanup(); }
    });
  }

  it('expands every parent of a diamond, ignoring matrix links and surviving cycles', async () => {
    const data = treeData();
    data.positions.push({ ...data.positions[1]!, id: 'other' }, { ...data.positions[1]!, id: 'matrix' });
    data.reportLines.push(
      { fromId: 'head', toId: 'other', kind: 'admin' },
      { fromId: 'other', toId: 'target', kind: 'admin' },
      { fromId: 'manager', toId: 'head', kind: 'admin' },
      { fromId: 'matrix', toId: 'target', kind: 'matrix' },
    );
    const mounted = await mount(data);
    try {
      expect(visibleIds(mounted.diagram)).not.toContain('target');
      await mounted.diagram.revealPath('target');
      expect(mounted.diagram.getStaffExpandedPositionIds().sort()).toEqual(['head', 'manager', 'other']);
      expect(visibleIds(mounted.diagram)).toContain('target');
    } finally { mounted.cleanup(); }
  });

  it('does not render or emit when the path is already expanded', async () => {
    const data = treeData();
    data.positions = data.positions.map((p) => ({ ...p, expanded: true }));
    const changes: unknown[] = [];
    const mounted = await mount(data, { callbacks: { onPositionExpandChange: (e) => changes.push(e) } });
    try {
      expect(visibleIds(mounted.diagram)).toContain('target');
      await mounted.diagram.revealPath('target');
      expect(mounted.frames()).toBe(0);
      expect(changes).toEqual([]);
    } finally { mounted.cleanup(); }
  });

  it('bypasses maxExpandedPositions to keep the whole revealed path open', async () => {
    const mounted = await mount(treeData(), { staffLayout: { maxExpandedPositions: 1 } });
    try {
      expect(visibleIds(mounted.diagram)).not.toContain('target');
      await mounted.diagram.revealPath('target');
      expect(mounted.diagram.getStaffExpandedPositionIds().sort()).toEqual(['head', 'manager']);
      expect(visibleIds(mounted.diagram)).toContain('target');
    } finally { mounted.cleanup(); }
  });

  it('combines org and position reveal in one frame', async () => {
    const data = treeData();
    data.organizations[0]!.collapsed = true;
    const mounted = await mount(data);
    try {
      await mounted.diagram.revealPath('target');
      expect(mounted.diagram.getData().organizations[0]!.collapsed).toBe(false);
      expect(visibleIds(mounted.diagram)).toContain('target');
      expect(mounted.frames()).toBe(1);
    } finally { mounted.cleanup(); }
  });

  it('restores both org data and position state and rethrows a refused frame without expand events', async () => {
    const data = treeData();
    data.organizations[0]!.collapsed = true;
    const changes: unknown[] = [];
    const mounted = await mount(data, { callbacks: {
      onPositionExpandChange: (e) => changes.push(e),
      onLayoutChange: (e) => { if (e.type === 'position-expand') changes.push(e); },
    } });
    const before = mounted.diagram.getData();
    const expanded = mounted.diagram.getStaffExpandedPositionIds();
    const error = new Error('refused reveal frame');
    mounted.host.renderer.render = async () => { throw error; };
    try {
      await expect(mounted.diagram.revealPath('target')).rejects.toBe(error);
      expect(mounted.diagram.getData()).toEqual(before);
      expect(mounted.diagram.getStaffExpandedPositionIds()).toEqual(expanded);
      expect(visibleIds(mounted.diagram)).not.toContain('target');
      expect(changes).toEqual([]);
    } finally { mounted.cleanup(); }
  });
});


describe('revealPath selection option', () => {
  for (const target of ['target', 'person']) {
    it(`reveals ${target} and pans to its seat without selecting or emitting selection callbacks`, async () => {
      const changes: unknown[] = [];
      const mounted = await mount(treeData(), {
        callbacks: { onSelectionChange: (nodes) => changes.push(nodes) },
      });
      const pan = rstest.spyOn(mounted.host, 'panTo');
      try {
        expect(mounted.diagram.getSelection()).toBeNull();
        expect(visibleIds(mounted.diagram)).not.toContain('target');
        expect(await mounted.diagram.revealPath(target, { select: false })).toBe(true);
        expect(mounted.diagram.getSelection()).toBeNull();
        expect(mounted.diagram.getSelections()).toEqual([]);
        expect(changes).toEqual([]);
        expect(mounted.diagram.getStaffExpandedPositionIds().sort()).toEqual(['head', 'manager']);
        expect(visibleIds(mounted.diagram)).toContain('target');
        expect(mounted.frames()).toBe(1);
        const box = mounted.host.renderer.getNodeBox('target')!;
        expect(box).toBeDefined();
        expect(pan).toHaveBeenCalledExactlyOnceWith(
          box.x + box.width / 2, box.y + box.height / 2, { animate: true },
        );
      } finally { pan.mockRestore(); mounted.cleanup(); }
    });
  }

  it('preserves a different selected node without selection callbacks', async () => {
    const changes: unknown[] = [];
    const mounted = await mount(treeData(), {
      callbacks: { onSelectionChange: (nodes) => changes.push(nodes) },
    });
    try {
      await mounted.diagram.select({ kind: 'position', id: 'head' });
      const before = mounted.diagram.getSelections();
      changes.length = 0;
      expect(await mounted.diagram.revealPath('target', { select: false })).toBe(true);
      expect(mounted.diagram.getSelection()?.id).toBe('head');
      expect(mounted.diagram.getSelections()).toEqual(before);
      expect(changes).toEqual([]);
    } finally { mounted.cleanup(); }
  });

  it('selects the target by default', async () => {
    const mounted = await mount();
    try {
      expect(await mounted.diagram.revealPath('target')).toBe(true);
      expect(mounted.diagram.getSelection()).toMatchObject({
        kind: 'person', id: 'person', positionId: 'target',
      });
    } finally { mounted.cleanup(); }
  });

  it('returns false for an unknown id without selecting or panning', async () => {
    const mounted = await mount();
    const pan = rstest.spyOn(mounted.host, 'panTo');
    try {
      expect(await mounted.diagram.revealPath('missing', { select: false })).toBe(false);
      expect(mounted.diagram.getSelection()).toBeNull();
      expect(pan).not.toHaveBeenCalled();
      expect(mounted.frames()).toBe(0);
    } finally { pan.mockRestore(); mounted.cleanup(); }
  });
});
