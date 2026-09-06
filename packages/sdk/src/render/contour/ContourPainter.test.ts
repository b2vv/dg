import { Container } from 'pixi.js';
import { describe, expect, it } from '@rstest/core';
import { ContourPainter, type ContourPaintRequest } from './ContourPainter.js';
import { DepartmentBlobView } from './DepartmentBlob.js';
import { defaultNodeTheme, defaultRenderConfig } from '../types.js';
import { emptyDiagramData, type DiagramData } from '../../data/types.js';
import { contourSceneInputs, matrixNodeBoxes } from './contourInputs.js';

/** Two IT seats side by side, one CEO seat next to them. */
function scene(): DiagramData {
  const cells: Array<[string, string, number, number]> = [
    ['P1', 'IT', 0, 0],
    ['P2', 'IT', 1, 0],
    ['P3', 'CEO', 2, 0],
  ];
  return {
    ...emptyDiagramData(),
    departments: [
      { id: 'IT', name: 'IT', organizationId: 'o1' },
      { id: 'CEO', name: 'CEO', organizationId: 'o1' },
    ],
    positions: cells.map(([id, departmentId, col, row]) => ({
      id,
      organizationId: 'o1',
      departmentId,
      groupIds: [],
      status: 'filled' as const,
      isTemporary: false,
      title: id,
      gridCell: { col, row },
    })),
  };
}

function painter(deps: { destroyed?: boolean } = {}) {
  const layers = { departments: new Container(), departmentStrokes: new Container() };
  const diagnostics: string[] = [];
  const instance = new ContourPainter({
    layers,
    isDestroyed: () => deps.destroyed === true,
    worldTransform: () => null,
    cardInset: () => ({ x: 0, y: 0 }),
    reportDiagnostic: (m) => diagnostics.push(m),
  });
  return { painter: instance, layers, diagnostics };
}

function request(over: Partial<ContourPaintRequest> = {}): ContourPaintRequest {
  const data = scene();
  const config = { ...defaultRenderConfig, minContourMembers: 1, ...over.config };
  // Same input path the renderer uses for the bare grid: card boxes, then inputs.
  const { inputs, memberBoxesByDept } = contourSceneInputs(
    matrixNodeBoxes(data.positions, {
      cellWidth: config.cellWidth,
      cellHeight: config.cellHeight,
      cardWidth: defaultNodeTheme.person.width,
      cardHeight: defaultNodeTheme.person.height,
    }),
    new Map(data.positions.map((p) => [p.id, p])),
  );
  return {
    inputs,
    data,
    theme: defaultNodeTheme,
    config,
    lod: 'near',
    morphMs: 0,
    memberBoxesByDept,
    ...over,
    ...(over.config ? { config } : {}),
  };
}

const blobs = (layer: Container) =>
  layer.children.filter((c): c is DepartmentBlobView => c instanceof DepartmentBlobView);

describe('ContourPainter', () => {
  it('success: button-group paints one blob per department and holds a session', async () => {
    const { painter: p, layers } = painter();
    expect(p.hasSession).toBe(false);
    await p.paint(request());
    expect(p.hasSession).toBe(true);
    expect(blobs(layers.departments).length).toBe(2);
    // Strokes live in their own layer, above the cards.
    expect(layers.departmentStrokes.children.length).toBe(2);
  });

  it('success: minContourMembers drops departments below the threshold', async () => {
    const { painter: p, layers } = painter();
    await p.paint(request({ config: { ...defaultRenderConfig, minContourMembers: 2 } }));
    // IT has two seats, CEO has one.
    expect(blobs(layers.departments).length).toBe(1);
  });

  it('success: reset drops the session so a new render starts clean', async () => {
    const { painter: p } = painter();
    await p.paint(request());
    p.reset();
    expect(p.hasSession).toBe(false);
  });

  it('success: a drag preview repaints, and a failed drag restores the original rings', async () => {
    const { painter: p, layers } = painter();
    await p.paint(request());
    const before = blobs(layers.departments).map((b) => b.getDrawnPoints().length);

    p.previewDrag('P1', { col: 5, row: 5 }, { kind: 'free' });
    const moved = blobs(layers.departments).map((b) => b.getDrawnPoints().length);
    expect(moved).not.toEqual(before);

    p.restoreAfterFailedDrag();
    expect(blobs(layers.departments).map((b) => b.getDrawnPoints().length)).toEqual(before);
  });

  it('failure: without a session, preview and restore are no-ops rather than throwing', () => {
    const { painter: p, layers } = painter();
    expect(() => p.previewDrag('P1', { col: 1, row: 1 }, { kind: 'free' })).not.toThrow();
    expect(() => p.restoreAfterFailedDrag()).not.toThrow();
    expect(() => p.reset()).not.toThrow();
    expect(blobs(layers.departments)).toEqual([]);
  });

  // T111-K4a: previewDrag now takes an already-resolved SeatDrop (plan §3 / spec A9)
  // instead of a bare (col,row) — the projection shows push/swap/ask exactly the
  // way `resolveSeatDrop` decided, not just where the dragged card landed.
  describe('T111-K4a seat-collision projection', () => {
    it('success: push moves both the dragged seat and the occupant it displaces', async () => {
      const { painter: p } = painter();
      await p.paint(request());

      p.previewDrag(
        'P1',
        { col: 1, row: 0 },
        { kind: 'push', occupantId: 'P2', to: { col: 0, row: 1 } },
      );

      expect(p.previewState('P1')).toMatchObject({ col: 1, row: 0 });
      expect(p.previewState('P2')).toMatchObject({ col: 0, row: 1 });
      // P3 (CEO) is not part of this drop — stays put.
      expect(p.previewState('P3')).toMatchObject({ col: 2, row: 0 });
    });

    it('success: swap sends the occupant to the dragged seat\'s authored cell', async () => {
      const { painter: p } = painter();
      await p.paint(request());

      p.previewDrag('P1', { col: 1, row: 0 }, { kind: 'swap', occupantId: 'P2' });

      expect(p.previewState('P1')).toMatchObject({ col: 1, row: 0 });
      // P1's authored cell was (0,0) — that's where P2 goes.
      expect(p.previewState('P2')).toMatchObject({ col: 0, row: 0 });
    });

    it('success: ask is projected as a swap — the safe, applicable preview (plan §3)', async () => {
      const { painter: p } = painter();
      await p.paint(request());

      p.previewDrag(
        'P1',
        { col: 1, row: 0 },
        { kind: 'ask', occupantId: 'P2', pushTargets: [] },
      );

      expect(p.previewState('P1')).toMatchObject({ col: 1, row: 0 });
      expect(p.previewState('P2')).toMatchObject({ col: 0, row: 0 });
    });

    it('success: the occupant\'s member box moves too, not just its grid cell', async () => {
      const { painter: p } = painter();
      await p.paint(request());
      const baseBox = p.previewState('P2')?.box;

      p.previewDrag('P1', { col: 1, row: 0 }, { kind: 'swap', occupantId: 'P2' });

      const movedBox = p.previewState('P2')?.box;
      expect(baseBox).toBeDefined();
      expect(movedBox).toBeDefined();
      expect(movedBox).not.toEqual(baseBox);
    });

    it('success: restoring after a failed drag puts both seats back byte-for-byte (A10)', async () => {
      const { painter: p } = painter();
      await p.paint(request());
      const baseline = ['P1', 'P2', 'P3'].map((id) => p.previewState(id));

      p.previewDrag(
        'P1',
        { col: 1, row: 0 },
        { kind: 'push', occupantId: 'P2', to: { col: 0, row: 1 } },
      );
      expect(['P1', 'P2', 'P3'].map((id) => p.previewState(id))).not.toEqual(baseline);

      p.restoreAfterFailedDrag();
      expect(['P1', 'P2', 'P3'].map((id) => p.previewState(id))).toEqual(baseline);
    });

    it('success: recomputes from the authored cell every call, so push→swap mid-drag does not drift', async () => {
      const { painter: p } = painter();
      await p.paint(request());

      // Frame 1: resolved as push.
      p.previewDrag(
        'P1',
        { col: 1, row: 0 },
        { kind: 'push', occupantId: 'P2', to: { col: 0, row: 1 } },
      );
      // Frame 2 (pointer kept moving): resolved as swap instead.
      p.previewDrag('P1', { col: 1, row: 0 }, { kind: 'swap', occupantId: 'P2' });

      // If frame 2 were an incremental delta on top of frame 1's already-moved
      // P2, this would land somewhere other than P1's authored cell.
      expect(p.previewState('P2')).toMatchObject({ col: 0, row: 0 });
    });

    it('failure: an occupant id absent from the session is ignored — the mover still moves', async () => {
      const { painter: p } = painter();
      await p.paint(request());

      expect(() =>
        p.previewDrag(
          'P1',
          { col: 1, row: 0 },
          { kind: 'push', occupantId: 'ghost', to: { col: 9, row: 9 } },
        ),
      ).not.toThrow();
      expect(p.previewState('P1')).toMatchObject({ col: 1, row: 0 });
      expect(p.previewState('ghost')).toBeUndefined();
    });
  });

  it('failure: cell-flood without a world transform paints nothing and says why', async () => {
    const { painter: p, layers, diagnostics } = painter();
    await p.paint(
      request({
        config: { ...defaultRenderConfig, minContourMembers: 1, contourEngine: 'cell-flood' },
      }),
    );
    expect(blobs(layers.departments)).toEqual([]);
    expect(diagnostics.join(' ')).toMatch(/no cell transform/);
  });
});
