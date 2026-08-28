import { afterEach, describe, expect, it, rstest } from '@rstest/core';
import { act, createElement } from 'react';
import {
  createReactPromoteOverlay,
  DefaultPromoteCard,
  type PromoteOverlayDiagram,
  type PromoteSlotProps,
} from './createReactPromoteOverlay.js';
import type { PromoteCandidate } from '../render/promoteTypes.js';

function makeDiagram(overrides: Partial<PromoteOverlayDiagram> = {}): PromoteOverlayDiagram {
  const candidate: PromoteCandidate = {
    id: 'pos1',
    kind: 'position',
    world: { x: 10, y: 20, width: 100, height: 60 },
    node: {
      ref: { id: 'pos1', kind: 'position', positionId: 'pos1', personId: 'p1' },
      person: { id: 'p1', fullName: 'Alice' },
      position: {
        id: 'pos1',
        title: 'Eng',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
    },
  };

  return {
    getViewport: () => ({ x: 0, y: 0, scale: 1 }),
    getLodLevel: () => 'near',
    getSelection: () => ({ id: 'pos1', kind: 'position', positionId: 'pos1', personId: 'p1' }),
    select: rstest.fn(async () => undefined),
    listPromoteBoxes: () => [
      { id: 'pos1', kind: 'position' as const, x: 10, y: 20, width: 100, height: 60 },
    ],
    listPromoteCandidates: (ids) => {
      if (ids && (ids.length === 0 || !ids.some((id) => id === 'pos1' || id === 'position:pos1'))) {
        return [];
      }
      return [candidate];
    },
    setPromotedNodeIds: rstest.fn(),
    subscribePromoteSync: (listener) => {
      return () => {
        void listener;
      };
    },
    ...overrides,
  };
}

describe('createReactPromoteOverlay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('success: promotes selection at near lod and hides via setPromotedNodeIds', async () => {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);

    const diagram = makeDiagram();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-selection',
      });
    });

    // The id of the card that was drawn, not the typed key that was asked for:
    // Pixi must hide exactly what HTML replaced. See the "vanished" case below
    // for the failure the old order allowed.
    expect(diagram.setPromotedNodeIds).toHaveBeenCalledWith(['pos1']);
    expect(mount.querySelector('[data-promote-card]')).toBeTruthy();
    expect(mount.textContent).toContain('Alice');

    await act(async () => {
      overlay.dispose();
    });
    expect(diagram.setPromotedNodeIds).toHaveBeenCalledWith([]);
    expect(mount.querySelector('[data-org-hierarchy-promote-root]')).toBeNull();
  });

  it('failure: mid lod near-selection demotes (no cards)', async () => {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);

    const diagram = makeDiagram({ getLodLevel: () => 'mid' });
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-selection',
      });
    });

    expect(diagram.setPromotedNodeIds).toHaveBeenCalledWith([]);
    expect(mount.querySelector('[data-promote-card]')).toBeNull();
    await act(async () => {
      overlay.dispose();
    });
  });

  it('success: custom component receives screenRect synced to viewport', async () => {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);

    const seen: PromoteSlotProps['screenRect'][] = [];
    function SpyCard(props: PromoteSlotProps) {
      seen.push(props.screenRect);
      return createElement('div', { 'data-spy': props.id });
    }

    const diagram = makeDiagram({
      getViewport: () => ({ x: 5, y: 7, scale: 2 }),
    });
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: SpyCard,
        mode: 'selection',
      });
    });

    expect(seen[0]).toEqual({ left: 25, top: 47, width: 200, height: 120 });
    await act(async () => {
      overlay.dispose();
    });
  });
});

describe('near-visible mode', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  /** Three seats: two inside an 800×600 screen, one far to the right of it. */
  function makeSceneDiagram(): {
    diagram: PromoteOverlayDiagram;
    resolvedWith: Array<readonly string[] | undefined>;
  } {
    const boxes = [
      { id: 'pos1', kind: 'position' as const, x: 10, y: 20, width: 100, height: 60 },
      { id: 'pos2', kind: 'position' as const, x: 200, y: 20, width: 100, height: 60 },
      { id: 'pos3', kind: 'position' as const, x: 5000, y: 20, width: 100, height: 60 },
    ];
    const resolvedWith: Array<readonly string[] | undefined> = [];
    const candidateFor = (id: string): PromoteCandidate => ({
      id,
      kind: 'position',
      world: boxes.find((b) => b.id === id)!,
      node: {
        ref: { id, kind: 'position', positionId: id },
        position: {
          id,
          title: `Seat ${id}`,
          organizationId: 'org1',
          groupIds: [],
          status: 'vacant',
          isTemporary: false,
        },
      },
    });

    const diagram: PromoteOverlayDiagram = {
      getViewport: () => ({ x: 0, y: 0, scale: 1 }),
      getLodLevel: () => 'near',
      getSelection: () => null,
      select: rstest.fn(async () => undefined),
      listPromoteBoxes: () => boxes,
      listPromoteCandidates: (ids) => {
        resolvedWith.push(ids);
        return (ids ?? boxes.map((b) => b.id)).map((id) => candidateFor(id));
      },
      setPromotedNodeIds: rstest.fn(),
      subscribePromoteSync: () => () => {},
    };
    return { diagram, resolvedWith };
  }

  function mountEl(): HTMLElement {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);
    return mount;
  }

  it('success: every visible seat is promoted, with no selection at all', async () => {
    const { diagram } = makeSceneDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-visible',
      });
    });

    expect(mount.querySelectorAll('[data-promote-card]')).toHaveLength(2);
    await act(async () => overlay.dispose());
  });

  it('failure: a seat off screen stays drawn on the canvas, it does not vanish', async () => {
    const { diagram } = makeSceneDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-visible',
      });
    });

    // Hiding pos3 in Pixi without giving it an HTML card would leave a hole in
    // the scene — the exact failure this ordering exists to prevent.
    expect(diagram.setPromotedNodeIds).toHaveBeenCalledWith(['pos1', 'pos2']);
    await act(async () => overlay.dispose());
  });

  it('success: node data is resolved only for the seats that survived the filter', async () => {
    const { diagram, resolvedWith } = makeSceneDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-visible',
      });
    });

    // Resolving every box in the scene costs 2.1 ms on the 1M tab whether two
    // cards are visible or seventy-eight (work/reports/promote-near/report.md).
    // An `undefined` here would mean the whole scene was resolved.
    expect(resolvedWith.every((ids) => ids !== undefined)).toBe(true);
    expect(resolvedWith.at(-1)).toEqual(['pos1', 'pos2']);
    await act(async () => overlay.dispose());
  });

  it('failure: below the near band nothing is promoted at all', async () => {
    const { diagram } = makeSceneDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram: { ...diagram, getLodLevel: () => 'mid' },
        mount,
        component: DefaultPromoteCard,
        mode: 'near-visible',
      });
    });

    expect(mount.querySelectorAll('[data-promote-card]')).toHaveLength(0);
    await act(async () => overlay.dispose());
  });
});

describe('hide only what was drawn', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('failure: a node that vanished from the data is not hidden on the canvas', async () => {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);

    // The selection still names a node, but the data no longer has it — a
    // delete that landed between picking the ids and resolving them.
    const diagram = makeDiagram({ listPromoteCandidates: () => [] });
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-selection',
      });
    });

    // Hiding it here would erase a node from the canvas and put nothing in its
    // place, which reads to the user as a hole rather than as a deletion.
    expect(diagram.setPromotedNodeIds).toHaveBeenCalledWith([]);
    expect(mount.querySelector('[data-promote-card]')).toBeNull();
    await act(async () => overlay.dispose());
  });
});
