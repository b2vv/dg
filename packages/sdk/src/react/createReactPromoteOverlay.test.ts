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
    getScreenSize: () => ({ width: 800, height: 600 }),
    getPromoteChrome: () => ({ borderRadius: 8, borderWidth: 1 }),
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
      getScreenSize: () => ({ width: 800, height: 600 }),
      getPromoteChrome: () => ({ borderRadius: 8, borderWidth: 1 }),
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

describe('shouldPromote — the host keeps a node on the canvas', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function mountEl(): HTMLElement {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);
    return mount;
  }

  it('failure: a rejected node stays on the canvas with no empty shell in the layer', async () => {
    const diagram = makeDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-selection',
        shouldPromote: () => false,
      });
    });

    // Both halves matter: nothing in HTML, and nothing hidden in Pixi either.
    // Hiding without drawing is the hole this ordering exists to prevent.
    expect(mount.querySelector('[data-promote-card]')).toBeNull();
    expect(diagram.setPromotedNodeIds).toHaveBeenCalledWith([]);
    await act(async () => overlay.dispose());
  });

  it('success: the predicate sees the node data, so the host can decide by kind', async () => {
    const diagram = makeDiagram();
    const mount = mountEl();
    const seen: string[] = [];
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-selection',
        shouldPromote: (node) => {
          seen.push(node.ref.kind);
          return node.ref.kind === 'position';
        },
      });
    });

    expect(seen).toEqual(['position']);
    expect(mount.querySelector('[data-promote-card]')).toBeTruthy();
    await act(async () => overlay.dispose());
  });

  it('success: no predicate promotes everything, as before', async () => {
    const diagram = makeDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-selection',
      });
    });

    expect(mount.querySelector('[data-promote-card]')).toBeTruthy();
    await act(async () => overlay.dispose());
  });
});

describe('screen size comes from the diagram, not from the DOM', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('success: sync never reads clientWidth, which would flush layout every frame', async () => {
    const mount = document.createElement('div');
    let clientWidthReads = 0;
    Object.defineProperty(mount, 'clientWidth', {
      get() {
        clientWidthReads += 1;
        return 800;
      },
    });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);

    const diagram = makeDiagram();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({ diagram, mount, component: DefaultPromoteCard });
    });
    await act(async () => {
      overlay.sync();
      overlay.sync();
    });

    // Reading clientWidth forces the browser to flush pending style and layout.
    // On the path that runs for every viewport change that is a cost paid per
    // frame — the same trap React Flow removed from its own gesture path by
    // caching the container box (XYPanZoom.ts:58-81). The diagram already has a
    // ResizeObserver, so the size is asked of it instead.
    expect(clientWidthReads).toBe(0);
    await act(async () => overlay.dispose());
  });
});

describe('a card holding focus is not demoted', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  /** One seat, and a viewport the test can drive off screen. */
  function makeMovableDiagram(): {
    diagram: PromoteOverlayDiagram;
    panAway(): void;
  } {
    let viewport = { x: 0, y: 0, scale: 1 };
    const box = { id: 'pos1', kind: 'position' as const, x: 10, y: 20, width: 100, height: 60 };
    const diagram: PromoteOverlayDiagram = {
      getViewport: () => viewport,
      getLodLevel: () => 'near',
      getSelection: () => null,
      select: rstest.fn(async () => undefined),
      getScreenSize: () => ({ width: 800, height: 600 }),
      getPromoteChrome: () => ({ borderRadius: 8, borderWidth: 1 }),
      listPromoteBoxes: () => [box],
      listPromoteCandidates: (ids) =>
        (ids ?? [box.id]).map(() => ({
          id: box.id,
          kind: 'position' as const,
          world: box,
          node: {
            ref: { id: box.id, kind: 'position' as const, positionId: box.id },
            position: {
              id: box.id,
              title: 'Eng',
              organizationId: 'org1',
              groupIds: [],
              status: 'vacant' as const,
              isTemporary: false,
            },
          },
        })),
      setPromotedNodeIds: rstest.fn(),
      subscribePromoteSync: () => () => {},
    };
    return {
      diagram,
      panAway: () => {
        viewport = { x: -5000, y: 0, scale: 1 };
      },
    };
  }

  function mountEl(): HTMLElement {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    return mount;
  }

  it('failure: the card keeps its focused input when the camera moves it off screen', async () => {
    const { diagram, panAway } = makeMovableDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: (props) =>
          createElement(
            'div',
            { 'data-promote-card': props.id },
            createElement('input', { 'data-testid': 'card-input', defaultValue: 'typed' }),
          ),
        mode: 'near-visible',
      });
    });

    const input = mount.querySelector<HTMLInputElement>('[data-testid="card-input"]')!;
    input.focus();
    expect(document.activeElement).toBe(input);

    panAway();
    await act(async () => overlay.sync());

    // Demoting here would take the focus and whatever the user had typed with
    // it — the node is still on the canvas underneath, so nothing is gained.
    expect(mount.querySelector('[data-promote-card]')).toBeTruthy();
    expect(document.activeElement).toBe(input);
    await act(async () => overlay.dispose());
  });

  it('success: the same card with no focus in it demotes as usual', async () => {
    const { diagram, panAway } = makeMovableDiagram();
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

    panAway();
    await act(async () => overlay.sync());

    expect(mount.querySelector('[data-promote-card]')).toBeNull();
    await act(async () => overlay.dispose());
  });
});

describe('maxPromoted meets focus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  /** Nine seats in a row; the leftmost is far from the screen centre. */
  function makeRowDiagram(): PromoteOverlayDiagram & { panBy(dx: number): void } {
    const boxes = Array.from({ length: 9 }, (_, i) => ({
      id: `pos${i}`,
      kind: 'position' as const,
      x: i * 80,
      y: 280,
      width: 60,
      height: 40,
    }));
    let viewport = { x: 0, y: 0, scale: 1 };
    let listener: (() => void) | null = null;
    return {
      panBy: (dx: number) => {
        viewport = { ...viewport, x: viewport.x + dx };
        listener?.();
      },
      getViewport: () => viewport,
      getLodLevel: () => 'near',
      getSelection: () => null,
      select: rstest.fn(async () => undefined),
      getScreenSize: () => ({ width: 800, height: 600 }),
      getPromoteChrome: () => ({ borderRadius: 8, borderWidth: 1 }),
      listPromoteBoxes: () => boxes,
      listPromoteCandidates: (ids) =>
        (ids ?? boxes.map((b) => b.id)).map((id) => {
          const box = boxes.find((b) => b.id === id)!;
          return {
            id,
            kind: 'position' as const,
            world: box,
            node: {
              ref: { id, kind: 'position' as const, positionId: id },
              position: {
                id,
                title: id,
                organizationId: 'org1',
                groupIds: [],
                status: 'vacant' as const,
                isTemporary: false,
              },
            },
          };
        }),
      setPromotedNodeIds: rstest.fn(),
      subscribePromoteSync: (l) => {
        listener = l;
        return () => {
          listener = null;
        };
      },
    };
  }

  const card = (props: PromoteSlotProps) =>
    createElement(
      'div',
      { 'data-promote-card': props.id },
      createElement('input', { 'data-input': props.id }),
    );

  function mountEl(): HTMLElement {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    return mount;
  }

  it('success: a cap of 3 renders three cards', async () => {
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram: makeRowDiagram(),
        mount,
        component: card,
        mode: 'near-visible',
        maxPromoted: 3,
      });
    });
    expect(mount.querySelectorAll('[data-promote-card]')).toHaveLength(3);
    await act(async () => overlay.dispose());
  });

  it('failure: the focused card survives a cap that would otherwise drop it', async () => {
    const mount = mountEl();
    const diagram = makeRowDiagram();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: card,
        mode: 'near-visible',
        maxPromoted: 3,
      });
    });

    // Focus a card that is currently inside the cap, then move the camera so it
    // becomes the furthest from centre — which is when a plain trim would drop
    // it, taking the user's focus with it.
    const focused = [...mount.querySelectorAll('[data-promote-card]')]
      .map((el) => el.getAttribute('data-promote-card'))
      .find((id) => id !== null)!;
    mount.querySelector<HTMLInputElement>(`[data-input="${focused}"]`)!.focus();

    await act(async () => {
      diagram.panBy(-600);
    });

    const ids = [...mount.querySelectorAll('[data-promote-card]')].map((el) =>
      el.getAttribute('data-promote-card'),
    );
    // Kept, and it takes one of the host's three slots rather than a fourth —
    // a declared cap of three stays a cap of three.
    expect(ids).toContain(focused);
    expect(ids).toHaveLength(3);
    await act(async () => overlay.dispose());
  });

  it('failure: a cap of zero promotes nothing, focus included — the host said zero', async () => {
    const mount = mountEl();
    const diagram = makeRowDiagram();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: card,
        mode: 'near-visible',
      });
    });
    // The cap has to arrive after the focus, because a card must exist before it
    // can hold focus — which is why the runtime setter exists at all.
    mount.querySelector<HTMLInputElement>('[data-input="pos0"]')!.focus();
    await act(async () => {
      overlay.setMaxPromoted(0);
    });
    expect(mount.querySelectorAll('[data-promote-card]')).toHaveLength(0);
    await act(async () => overlay.dispose());
  });
});

describe('one broken card does not take the layer down', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('failure: a component that throws leaves the other cards standing', async () => {
    const boxes = [
      { id: 'good1', kind: 'position' as const, x: 10, y: 20, width: 60, height: 40 },
      { id: 'bad', kind: 'position' as const, x: 100, y: 20, width: 60, height: 40 },
      { id: 'good2', kind: 'position' as const, x: 200, y: 20, width: 60, height: 40 },
    ];
    const diagram: PromoteOverlayDiagram = {
      getViewport: () => ({ x: 0, y: 0, scale: 1 }),
      getLodLevel: () => 'near',
      getSelection: () => null,
      select: rstest.fn(async () => undefined),
      getScreenSize: () => ({ width: 800, height: 600 }),
      getPromoteChrome: () => ({ borderRadius: 8, borderWidth: 1 }),
      listPromoteBoxes: () => boxes,
      listPromoteCandidates: (ids) =>
        (ids ?? boxes.map((b) => b.id)).map((id) => ({
          id,
          kind: 'position' as const,
          world: boxes.find((b) => b.id === id)!,
          node: {
            ref: { id, kind: 'position' as const, positionId: id },
            position: {
              id,
              title: id,
              organizationId: 'org1',
              groupIds: [],
              status: 'vacant' as const,
              isTemporary: false,
            },
          },
        })),
      setPromotedNodeIds: rstest.fn(),
      subscribePromoteSync: () => () => {},
    };

    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const errors: string[] = [];
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        mode: 'near-visible',
        onSlotError: (id) => errors.push(id),
        component: (props) => {
          if (props.id === 'bad') throw new Error('host card blew up');
          return createElement('div', { 'data-promote-card': props.id });
        },
      });
    });

    const ids = [...mount.querySelectorAll('[data-promote-card]')].map((el) =>
      el.getAttribute('data-promote-card'),
    );
    expect(ids.sort()).toEqual(['good1', 'good2']);
    expect(errors).toEqual(['bad']);
    // The broken node must go back to being drawn by Pixi, otherwise the scene
    // has a hole exactly where the card failed.
    const lastHidden = (diagram.setPromotedNodeIds as ReturnType<typeof rstest.fn>).mock.calls.at(
      -1,
    )?.[0] as string[];
    expect(lastHidden).not.toContain('bad');
    await act(async () => overlay.dispose());
  });
});

describe('deferred recompute while the camera moves', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function makeCameraDiagram(): {
    diagram: PromoteOverlayDiagram;
    moveTo(v: { x: number; y: number; scale: number }): void;
    syncs: number;
  } {
    const state = { viewport: { x: 0, y: 0, scale: 1 }, syncs: 0 };
    let listener: (() => void) | null = null;
    const box = { id: 'pos1', kind: 'position' as const, x: 100, y: 100, width: 60, height: 40 };
    const diagram: PromoteOverlayDiagram = {
      getViewport: () => state.viewport,
      getLodLevel: () => 'near',
      getSelection: () => null,
      select: rstest.fn(async () => undefined),
      getScreenSize: () => ({ width: 800, height: 600 }),
      getPromoteChrome: () => ({ borderRadius: 8, borderWidth: 1 }),
      listPromoteBoxes: () => [box],
      listPromoteCandidates: (ids) => {
        state.syncs += 1;
        return (ids ?? [box.id]).map(() => ({
          id: box.id,
          kind: 'position' as const,
          world: box,
          node: {
            ref: { id: box.id, kind: 'position' as const, positionId: box.id },
            position: {
              id: box.id,
              title: 'Eng',
              organizationId: 'org1',
              groupIds: [],
              status: 'vacant' as const,
              isTemporary: false,
            },
          },
        }));
      },
      setPromotedNodeIds: rstest.fn(),
      subscribePromoteSync: (l) => {
        listener = l;
        return () => {
          listener = null;
        };
      },
    };
    return {
      diagram,
      moveTo: (v) => {
        state.viewport = v;
        listener?.();
      },
      get syncs() {
        return state.syncs;
      },
    };
  }

  const settleMs = 15;
  const afterSettle = () => new Promise((r) => { setTimeout(r, settleMs * 4); });

  function mountEl(): HTMLElement {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    return mount;
  }

  function layerOf(mount: HTMLElement): HTMLElement {
    return mount.querySelector<HTMLElement>('[data-org-hierarchy-promote-root]')!;
  }

  it('success: the layer carries the camera while the cards stay put', async () => {
    const cam = makeCameraDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram: cam.diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-visible',
        settleMs,
      });
    });
    const before = cam.syncs;
    const cardLeft = mount.querySelector<HTMLElement>('[data-promote-card]')!.style.left;

    await act(async () => cam.moveTo({ x: 40, y: -10, scale: 1 }));

    // Moving dozens of cards individually is the cost this design avoids: one
    // transform on the layer does the same job, and no card is touched.
    expect(layerOf(mount).style.transform).toBe('translate(40px, -10px) scale(1)');
    expect(mount.querySelector<HTMLElement>('[data-promote-card]')!.style.left).toBe(cardLeft);
    expect(cam.syncs).toBe(before);
    await act(async () => overlay.dispose());
  });

  it('success: once the camera settles the layer is reset and positions are rebuilt', async () => {
    const cam = makeCameraDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram: cam.diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-visible',
        settleMs,
      });
    });
    await act(async () => cam.moveTo({ x: 40, y: -10, scale: 1 }));
    await act(async () => {
      await afterSettle();
    });

    expect(layerOf(mount).style.transform).toBe('');
    // world 100 * scale 1 + pan 40 = 140
    expect(mount.querySelector<HTMLElement>('[data-promote-card]')!.style.left).toBe('140px');
    await act(async () => overlay.dispose());
  });

  it('failure: the latest camera wins, not an intermediate one', async () => {
    const cam = makeCameraDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram: cam.diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-visible',
        settleMs,
      });
    });
    await act(async () => {
      cam.moveTo({ x: 40, y: 0, scale: 1 });
      cam.moveTo({ x: 90, y: 0, scale: 1 });
    });
    await act(async () => {
      await afterSettle();
    });

    // Drawing the frame the camera already left would be a visible snap back.
    expect(mount.querySelector<HTMLElement>('[data-promote-card]')!.style.left).toBe('190px');
    await act(async () => overlay.dispose());
  });

  it('failure: dispose during a pending recompute renders nothing and does not throw', async () => {
    const cam = makeCameraDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram: cam.diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-visible',
        settleMs,
      });
    });
    await act(async () => cam.moveTo({ x: 40, y: 0, scale: 1 }));
    const before = cam.syncs;
    await act(async () => overlay.dispose());
    await act(async () => {
      await afterSettle();
    });

    // The timer outliving the root would render into an unmounted tree.
    expect(cam.syncs).toBe(before);
    expect(mount.querySelector('[data-promote-card]')).toBeNull();
  });

  it('success: two consecutive syncs produce identical DOM', async () => {
    const cam = makeCameraDiagram();
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram: cam.diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-visible',
        settleMs,
      });
    });
    const first = layerOf(mount).innerHTML;
    await act(async () => overlay.sync());
    expect(layerOf(mount).innerHTML).toBe(first);
    await act(async () => overlay.dispose());
  });
});

describe('the card matches the box it replaces', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function makeChromeDiagram(scale: number): PromoteOverlayDiagram {
    // Deliberately narrow: 60 world px is under the old 120px floor.
    const box = { id: 'pos1', kind: 'position' as const, x: 0, y: 0, width: 60, height: 30 };
    return {
      getViewport: () => ({ x: 0, y: 0, scale }),
      getLodLevel: () => 'near',
      getSelection: () => null,
      select: rstest.fn(async () => undefined),
      getScreenSize: () => ({ width: 800, height: 600 }),
      getPromoteChrome: (kind) =>
        kind === 'organization'
          ? { borderRadius: 12, borderWidth: 1, paddingX: 16, paddingY: 16 }
          : { borderRadius: 10, borderWidth: 1 },
      listPromoteBoxes: () => [box],
      listPromoteCandidates: () => [
        {
          id: box.id,
          kind: 'position' as const,
          world: box,
          node: {
            ref: { id: box.id, kind: 'position' as const, positionId: box.id },
            position: {
              id: box.id,
              title: 'Eng',
              organizationId: 'org1',
              groupIds: [],
              status: 'vacant' as const,
              isTemporary: false,
            },
          },
        },
      ],
      setPromotedNodeIds: rstest.fn(),
      subscribePromoteSync: () => () => {},
    };
  }

  function mountEl(): HTMLElement {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    return mount;
  }

  it('failure: a narrow card is not widened to a floor of its own', async () => {
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram: makeChromeDiagram(1),
        mount,
        component: DefaultPromoteCard,
        mode: 'near-visible',
      });
    });
    const card = mount.querySelector<HTMLElement>('[data-promote-card]')!;
    // A promote card stands in for a Pixi node. Any size of its own makes it
    // stop covering what it replaces, and the mismatch is asymmetric: the node
    // shows from one side only.
    expect(card.style.width).toBe('60px');
    expect(card.style.height).toBe('30px');
    await act(async () => overlay.dispose());
  });

  it('success: the slot carries chrome, scaled to the screen like the box is', async () => {
    const mount = mountEl();
    const seen: unknown[] = [];
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram: makeChromeDiagram(2),
        mount,
        mode: 'near-visible',
        component: (props) => {
          seen.push(props.chrome);
          return createElement('div', { 'data-promote-card': props.id });
        },
      });
    });
    // World radius 10 at zoom 2 is 20 screen px — an unscaled radius would give
    // the DOM card different corners from the canvas card beside it.
    expect(seen).toEqual([{ borderRadius: 20, borderWidth: 2 }]);
    await act(async () => overlay.dispose());
  });
});

describe('rows 7 and 12 — nothing to promote, and something that stopped existing', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function mountEl(): HTMLElement {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    return mount;
  }

  const box = { id: 'pos1', kind: 'position' as const, x: 10, y: 20, width: 60, height: 40 };
  const candidate = {
    id: box.id,
    kind: 'position' as const,
    world: box,
    node: {
      ref: { id: box.id, kind: 'position' as const, positionId: box.id },
      position: {
        id: box.id,
        title: 'Eng',
        organizationId: 'org1',
        groupIds: [],
        status: 'vacant' as const,
        isTemporary: false,
      },
    },
  };

  function base(overrides: Partial<PromoteOverlayDiagram> = {}): PromoteOverlayDiagram {
    return {
      getViewport: () => ({ x: 0, y: 0, scale: 1 }),
      getLodLevel: () => 'near',
      getSelection: () => null,
      select: rstest.fn(async () => undefined),
      getScreenSize: () => ({ width: 800, height: 600 }),
      getPromoteChrome: () => ({ borderRadius: 8, borderWidth: 1 }),
      listPromoteBoxes: () => [box],
      listPromoteCandidates: () => [candidate],
      setPromotedNodeIds: rstest.fn(),
      subscribePromoteSync: () => () => {},
      ...overrides,
    };
  }

  it('failure: an empty scene renders an empty layer and raises nothing', async () => {
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent): void => {
      errors.push(e.error);
    };
    window.addEventListener('error', onError);

    const diagram = base({ listPromoteBoxes: () => [], listPromoteCandidates: () => [] });
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

    // A diagram with no data at all must be a quiet no-op, not a crash: hosts
    // mount the overlay before their first setData.
    expect(mount.querySelectorAll('[data-promote-card]')).toHaveLength(0);
    expect(diagram.setPromotedNodeIds).toHaveBeenCalledWith([]);
    expect(errors).toEqual([]);
    window.removeEventListener('error', onError);
    await act(async () => overlay.dispose());
  });

  it('failure: a node deleted while promoted leaves no ghost at its old position', async () => {
    let present = true;
    const diagram = base({
      listPromoteBoxes: () => (present ? [box] : []),
      listPromoteCandidates: () => (present ? [candidate] : []),
    });
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
    // The card really was promoted first — otherwise there is no ghost to leave.
    expect(mount.querySelectorAll('[data-promote-card]')).toHaveLength(1);

    present = false;
    await act(async () => overlay.sync());

    expect(mount.querySelectorAll('[data-promote-card]')).toHaveLength(0);
    expect(diagram.setPromotedNodeIds).toHaveBeenLastCalledWith([]);
    await act(async () => overlay.dispose());
  });
});

describe('a node entering the view during a gesture is never a hole', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('success: a node that scrolls into view stays with Pixi until the camera stops', async () => {
    // `here` starts on screen, `arriving` starts far to the right.
    const here = { id: 'here', kind: 'position' as const, x: 10, y: 10, width: 60, height: 40 };
    const arriving = {
      id: 'arriving',
      kind: 'position' as const,
      x: 2000,
      y: 10,
      width: 60,
      height: 40,
    };
    let viewport = { x: 0, y: 0, scale: 1 };
    let listener: (() => void) | null = null;
    const diagram: PromoteOverlayDiagram = {
      getViewport: () => viewport,
      getLodLevel: () => 'near',
      getSelection: () => null,
      select: rstest.fn(async () => undefined),
      getScreenSize: () => ({ width: 800, height: 600 }),
      getPromoteChrome: () => ({ borderRadius: 8, borderWidth: 1 }),
      listPromoteBoxes: () => [here, arriving],
      listPromoteCandidates: (ids) =>
        (ids ?? []).map((id) => {
          const box = id === 'here' ? here : arriving;
          return {
            id,
            kind: 'position' as const,
            world: box,
            node: {
              ref: { id, kind: 'position' as const, positionId: id },
              position: {
                id,
                title: id,
                organizationId: 'org1',
                groupIds: [],
                status: 'vacant' as const,
                isTemporary: false,
              },
            },
          };
        }),
      setPromotedNodeIds: rstest.fn(),
      subscribePromoteSync: (l) => {
        listener = l;
        return () => {
          listener = null;
        };
      },
    };

    const mount = document.createElement('div');
    document.body.appendChild(mount);
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram,
        mount,
        component: DefaultPromoteCard,
        mode: 'near-visible',
        settleMs: 10_000, // long enough that the gesture is still in progress
      });
    });
    expect(diagram.setPromotedNodeIds).toHaveBeenLastCalledWith(['here']);

    // The camera moves so `arriving` is now on screen — the gesture has not ended,
    // so no rebuild has run.
    await act(async () => {
      viewport = { x: -1900, y: 0, scale: 1 };
      listener?.();
    });

    // `arriving` has no card yet, and that is not a hole: it was never hidden, so
    // Pixi is still drawing it. Only a node hidden without a card is a hole, and
    // the promoted set is unchanged.
    expect(mount.querySelector('[data-promote-card="arriving"]')).toBeNull();
    expect(diagram.setPromotedNodeIds).toHaveBeenLastCalledWith(['here']);
    await act(async () => overlay.dispose());
  });
});
