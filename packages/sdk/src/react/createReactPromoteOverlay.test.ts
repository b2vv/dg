import { afterEach, describe, expect, it, vi } from 'vitest';
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
    select: vi.fn(async () => undefined),
    listPromoteCandidates: (ids) => {
      if (ids && (ids.length === 0 || !ids.includes('pos1'))) return [];
      return [candidate];
    },
    setPromotedNodeIds: vi.fn(),
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

    expect(diagram.setPromotedNodeIds).toHaveBeenCalledWith(
      expect.arrayContaining(['pos1', 'p1']),
    );
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
