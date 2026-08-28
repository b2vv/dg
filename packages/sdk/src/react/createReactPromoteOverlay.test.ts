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
  function makeRowDiagram(): PromoteOverlayDiagram {
    const boxes = Array.from({ length: 9 }, (_, i) => ({
      id: `pos${i}`,
      kind: 'position' as const,
      x: i * 80,
      y: 280,
      width: 60,
      height: 40,
    }));
    return {
      getViewport: () => ({ x: 0, y: 0, scale: 1 }),
      getLodLevel: () => 'near',
      getSelection: () => null,
      select: rstest.fn(async () => undefined),
      getScreenSize: () => ({ width: 800, height: 600 }),
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
      subscribePromoteSync: () => () => {},
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
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram: makeRowDiagram(),
        mount,
        component: card,
        mode: 'near-visible',
      });
    });

    // pos0 is the furthest from centre, so any small cap would trim it first.
    const input = mount.querySelector<HTMLInputElement>('[data-input="pos0"]')!;
    input.focus();

    await act(async () => {
      overlay.setMaxPromoted(3);
    });

    const ids = [...mount.querySelectorAll('[data-promote-card]')].map((el) =>
      el.getAttribute('data-promote-card'),
    );
    // Kept, and it takes one of the host's three slots rather than a fourth —
    // a declared cap of three stays a cap of three.
    expect(ids).toContain('pos0');
    expect(ids).toHaveLength(3);
    await act(async () => overlay.dispose());
  });

  it('failure: a cap of zero promotes nothing, focus included — the host said zero', async () => {
    const mount = mountEl();
    let overlay!: ReturnType<typeof createReactPromoteOverlay>;
    await act(async () => {
      overlay = createReactPromoteOverlay({
        diagram: makeRowDiagram(),
        mount,
        component: card,
        mode: 'near-visible',
      });
    });
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
