import { createElement, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ContextMenuNodeData } from '../interaction/contextMenuPayload.js';
import type { NodeRef } from '../interaction/types.js';
import type { LodLevel } from '../render/lod.js';
import type { PromoteCandidate } from '../render/promoteTypes.js';

/** A node's world rectangle and identity, without its card data. */
export interface PromoteBox {
  id: string;
  kind: 'organization' | 'person' | 'position';
  x: number;
  y: number;
  width: number;
  height: number;
}
import {
  nearVisibleGateOpen,
  resolvePromoteIds,
  screenRectInView,
  worldBoxToScreen,
  type PromoteMode,
  type ScreenRect,
} from '../render/promoteMath.js';
import type { ViewportTransform } from '../render/Viewport.js';

/** Narrow diagram surface for the promote host (avoids circular import with sdk index). */
export interface PromoteOverlayDiagram {
  getViewport(): ViewportTransform;
  getLodLevel(): LodLevel;
  getSelection(): NodeRef | null;
  select(node: NodeRef | null): Promise<void>;
  /**
   * Node geometry with no data resolution. Separate from
   * {@link PromoteOverlayDiagram.listPromoteCandidates} because resolving a box
   * into card data costs about two orders of magnitude more than reading its
   * rectangle (2.1 ms vs 0.005 ms over 639 nodes — see
   * `work/reports/promote-near/report.md` §2.3), and in `near-visible` most
   * boxes are off screen and never become cards.
   */
  listPromoteBoxes(): readonly PromoteBox[];
  listPromoteCandidates(ids?: readonly string[]): PromoteCandidate[];
  setPromotedNodeIds(ids: readonly string[]): void;
  subscribePromoteSync(listener: () => void): () => void;
}

export interface PromoteSlotProps {
  id: string;
  node: ContextMenuNodeData;
  screenRect: ScreenRect;
  viewport: ViewportTransform;
  /** Demote / clear selection helper from the host card. */
  onDemote: () => void;
}

export interface ReactPromoteOverlayOptions {
  diagram: PromoteOverlayDiagram;
  /** Diagram mount element — overlay is absolutely positioned on top. */
  mount: HTMLElement;
  component: ComponentType<PromoteSlotProps>;
  mode?: PromoteMode;
  maxPromoted?: number;
  /** Optional wrapper styles / class */
  className?: string;
}

export interface ReactPromoteOverlay {
  /** Force recompute (usually automatic via subscribePromoteSync). */
  sync: () => void;
  setMode: (mode: PromoteMode) => void;
  getMode: () => PromoteMode;
  dispose: () => void;
}

interface OverlayState {
  slots: PromoteSlotProps[];
}

function OverlayRoot(props: {
  slots: PromoteSlotProps[];
  component: ComponentType<PromoteSlotProps>;
  className?: string;
}): ReactElement {
  return createElement(
    'div',
    {
      'data-org-hierarchy-promote': '',
      className: props.className,
      style: {
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 5,
      },
    },
    props.slots.map((slot) =>
      createElement(props.component, { key: slot.id, ...slot }),
    ),
  );
}

/**
 * HTML/React promote layer synced to the Pixi camera.
 * Pixi stays the mass renderer; promoted nodes are hidden in WebGL and drawn here.
 *
 * Export: SVG/PNG/PDF remain Pixi-only (interactive chrome is not rasterized).
 */
export function createReactPromoteOverlay(
  options: ReactPromoteOverlayOptions,
): ReactPromoteOverlay {
  const mount = options.mount;
  const prevPosition = mount.style.position;
  if (!prevPosition || prevPosition === 'static') {
    mount.style.position = 'relative';
  }

  const layer = document.createElement('div');
  layer.setAttribute('data-org-hierarchy-promote-root', '');
  layer.style.position = 'absolute';
  layer.style.inset = '0';
  layer.style.pointerEvents = 'none';
  layer.style.zIndex = '5';
  mount.appendChild(layer);

  let root: Root | null = createRoot(layer);
  let mode: PromoteMode = options.mode ?? 'near-selection';
  let disposed = false;

  const demote = (): void => {
    void options.diagram.select(null);
  };

  /**
   * Ids worth resolving, already narrowed to what is on screen.
   *
   * `near-visible` walks every box in the scene, which is why this filter runs
   * on geometry alone: the cheap half of the work discards most of the scene
   * before the expensive half ever sees it.
   */
  const visibleIds = (
    viewport: ViewportTransform,
    screen: { width: number; height: number },
  ): string[] => {
    const ids: string[] = [];
    for (const box of options.diagram.listPromoteBoxes()) {
      if (screenRectInView(worldBoxToScreen(box, viewport), screen)) ids.push(box.id);
    }
    return ids;
  };

  const sync = (): void => {
    if (disposed || !root) return;
    const viewport = options.diagram.getViewport();
    const lod = options.diagram.getLodLevel();
    const screen = {
      width: mount.clientWidth || 1,
      height: mount.clientHeight || 1,
    };

    const ids =
      mode === 'near-visible'
        ? nearVisibleGateOpen(lod)
          ? visibleIds(viewport, screen)
          : []
        : resolvePromoteIds({
            mode,
            lod,
            selection: options.diagram.getSelection(),
            maxCount: options.maxPromoted ?? 8,
          });

    const slots: PromoteSlotProps[] = [];
    for (const candidate of ids.length > 0 ? options.diagram.listPromoteCandidates(ids) : []) {
      const screenRect = worldBoxToScreen(candidate.world, viewport);
      if (!screenRectInView(screenRect, screen)) continue;
      slots.push({
        id: candidate.id,
        node: candidate.node,
        screenRect,
        viewport,
        onDemote: demote,
      });
    }

    // Hide in Pixi only what actually became a card. Hiding first — as this did
    // — meant a node that failed the screen test, or that had vanished from the
    // data since the ids were picked, was erased from the canvas and given
    // nothing in its place: a hole in the scene rather than a promoted card.
    options.diagram.setPromotedNodeIds(slots.map((slot) => slot.id));

    const state: OverlayState = { slots };
    root.render(
      createElement(OverlayRoot, {
        slots: state.slots,
        component: options.component,
        className: options.className,
      }),
    );
  };

  const unsubscribe = options.diagram.subscribePromoteSync(sync);
  sync();

  return {
    sync,
    setMode: (next) => {
      mode = next;
      sync();
    },
    getMode: () => mode,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      options.diagram.setPromotedNodeIds([]);
      root?.unmount();
      root = null;
      if (layer.parentNode) layer.parentNode.removeChild(layer);
      if (!prevPosition || prevPosition === 'static') {
        mount.style.position = prevPosition;
      }
    },
  };
}

export interface DefaultPromoteCardProps extends PromoteSlotProps {
  children?: ReactNode;
}

/** Minimal promote card — hosts can pass `children` (Chart.js, buttons, …). */
export function DefaultPromoteCard(props: DefaultPromoteCardProps): ReactElement {
  const { screenRect, node, onDemote, children } = props;
  const title =
    node.person?.fullName ??
    node.organization?.name ??
    node.position?.title ??
    node.ref.id;
  const subtitle = node.position?.title ?? node.department?.name ?? '';

  return createElement(
    'div',
    {
      'data-promote-card': node.ref.id,
      style: {
        position: 'absolute',
        left: screenRect.left,
        top: screenRect.top,
        width: Math.max(screenRect.width, 120),
        minHeight: screenRect.height,
        boxSizing: 'border-box',
        padding: '8px 10px',
        borderRadius: 8,
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
        pointerEvents: 'auto',
        fontFamily: 'system-ui, sans-serif',
        color: 'var(--text, #0f172a)',
        background: 'var(--surface, #ffffff)',
        border: '1px solid var(--border, #cbd5e1)',
      },
    },
    createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
      createElement(
        'div',
        null,
        createElement('div', { style: { fontWeight: 600, fontSize: 13 } }, title),
        subtitle
          ? createElement(
              'div',
              { style: { fontSize: 11, color: 'var(--muted, #64748b)', marginTop: 2 } },
              subtitle,
            )
          : null,
      ),
      createElement(
        'button',
        {
          type: 'button',
          onClick: onDemote,
          style: {
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#94a3b8',
            fontSize: 14,
            lineHeight: 1,
          },
          'aria-label': 'Demote',
        },
        '×',
      ),
    ),
    children
      ? createElement('div', { style: { marginTop: 8 } }, children)
      : null,
  );
}
