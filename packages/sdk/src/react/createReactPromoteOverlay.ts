import {
  Component,
  createElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ContextMenuNodeData } from '../interaction/contextMenuPayload.js';
import type { NodeKind, NodeRef } from '../interaction/types.js';
import type { LodLevel } from '../render/lod.js';
import type { PromoteCandidate, PromoteChrome } from '../render/promoteTypes.js';

import {
  nearVisibleGateOpen,
  pickNearestToCenter,
  resolvePromoteCap,
  resolvePromoteIds,
  viewportCatchUpTransform,
  screenRectInView,
  worldBoxToScreen,
  type PromoteMode,
  type ScreenRect,
} from '../render/promoteMath.js';
import type { ViewportTransform } from '../render/Viewport.js';

/** A node's world rectangle and identity, without its card data. */
export interface PromoteBox {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Narrow diagram surface for the promote host (avoids circular import with sdk index). */
export interface PromoteOverlayDiagram {
  getViewport(): ViewportTransform;
  getLodLevel(): LodLevel;
  getSelection(): NodeRef | null;
  select(node: NodeRef | null): Promise<void>;
  /**
   * Size of the diagram surface, from the diagram's own ResizeObserver.
   *
   * Deliberately not `mount.clientWidth`: reading a geometric property makes the
   * browser flush pending style and layout, and this runs on every viewport
   * change. The diagram is already measuring its container, so there is nothing
   * to gain by measuring it a second time in the hot path.
   */
  getScreenSize(): { width: number; height: number };
  /** Frame geometry for a node kind, in **world** units — the overlay scales it. */
  getPromoteChrome(kind: PromoteBox['kind']): PromoteChrome;
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
  /** Corners and insets of the node being replaced, in **screen** px. */
  chrome: PromoteChrome;
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
  /**
   * Host veto, asked once per candidate before anything is hidden in Pixi.
   * Returning `false` leaves that node drawn on the canvas, which is the answer
   * for a node the host has no chrome for — the overlay renders one component
   * for every promoted node, so "no card for this one" has to be said here
   * rather than by the component returning nothing.
   *
   * Not set: every candidate is promoted.
   */
  shouldPromote?(node: ContextMenuNodeData): boolean;
  /**
   * A host card threw while rendering. The card is dropped and its node goes
   * back to being drawn by Pixi; this is the host's chance to log it.
   */
  onSlotError?(id: string, error: unknown): void;
  /**
   * How long the camera must be still, in ms, before card positions are rebuilt.
   * While it moves, the whole layer is carried by one CSS transform instead.
   * Default 150 — the same interval d3-zoom and React Flow treat as "stopped".
   */
  settleMs?: number;
  /** Optional wrapper styles / class */
  className?: string;
}

export interface ReactPromoteOverlay {
  /** Force recompute (usually automatic via subscribePromoteSync). */
  sync: () => void;
  setMode: (mode: PromoteMode) => void;
  getMode: () => PromoteMode;
  /** Change the ceiling at runtime; `undefined` removes it. */
  setMaxPromoted: (max?: number) => void;
  dispose: () => void;
}

function OverlayRoot(props: {
  slots: PromoteSlotProps[];
  component: ComponentType<PromoteSlotProps>;
  onSlotError(id: string, error: unknown): void;
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
      // `display: contents` keeps this wrapper out of layout entirely — the
      // host's card positions itself exactly as it would without it — while
      // still putting a node in the tree that `closest()` can find. That is how
      // a focused element inside a card is traced back to which card it is.
      createElement(
        'div',
        { key: slot.id, 'data-promote-slot': slot.id, style: { display: 'contents' } },
        createElement(
          SlotBoundary,
          { id: slot.id, onError: props.onSlotError },
          createElement(props.component, { ...slot }),
        ),
      ),
    ),
  );
}

interface SlotBoundaryProps {
  id: string;
  onError(id: string, error: unknown): void;
  children?: ReactNode;
}

/**
 * One boundary per card, not one for the layer.
 *
 * The overlay renders every promoted node into a single React root, so without
 * this a throw anywhere unmounts the whole tree — dozens of good cards taken
 * down by one bad one, over a scene that is still rendering fine underneath.
 * React Flow has no boundary at all and behaves exactly that way; the difference
 * is that a host writes their nodes, whereas our cards are built from data that
 * may be malformed.
 */
class SlotBoundary extends Component<SlotBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    this.props.onError(this.props.id, error);
  }

  override render(): ReactNode {
    // Null, not a placeholder: the node is still on the canvas underneath, so a
    // fallback box would sit on top of a card that is drawing correctly.
    return this.state.failed ? null : this.props.children;
  }
}

/** World chrome to screen chrome. Absent insets stay absent rather than becoming 0. */
function scaleChrome(chrome: PromoteChrome, scale: number): PromoteChrome {
  const out: PromoteChrome = {
    borderRadius: chrome.borderRadius * scale,
    borderWidth: chrome.borderWidth * scale,
  };
  if (chrome.paddingX !== undefined) out.paddingX = chrome.paddingX * scale;
  if (chrome.paddingY !== undefined) out.paddingY = chrome.paddingY * scale;
  return out;
}

/** Trim to `max` while guaranteeing the focused card a place inside the cap. */
function cappedAroundSticky(
  slots: readonly PromoteSlotProps[],
  stickySlot: PromoteSlotProps,
  screen: { width: number; height: number },
  max?: number,
): PromoteSlotProps[] {
  const cap = resolvePromoteCap(max);
  // A ceiling of exactly zero wins over the focused card: the host asked for none.
  if (cap === 0) return [];
  const others = slots.filter((slot) => slot !== stickySlot);
  const rest = cap === null ? undefined : cap - 1;
  return [stickySlot, ...pickNearestToCenter(others, screen, rest)];
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
  // The catch-up transform is applied here, so it has to scale from the layer's
  // own top-left — the same origin the card positions were computed against.
  layer.style.transformOrigin = '0 0';
  mount.appendChild(layer);

  let root: Root | null = createRoot(layer);
  let mode: PromoteMode = options.mode ?? 'near-selection';
  let maxPromoted = options.maxPromoted;
  let disposed = false;
  /**
   * Cards that threw. They stay out for the life of the overlay: a component
   * that failed once cannot be trusted to stop failing, and retrying it every
   * sync would loop between throwing and re-mounting.
   */
  const failedIds = new Set<string>();
  /** The camera the DOM currently on screen was built for. */
  let syncedViewport: ViewportTransform | null = null;
  let settleHandle: ReturnType<typeof setTimeout> | null = null;
  let appliedTransform = '';
  const settleMs = options.settleMs ?? 150;

  const cancelSettle = (): void => {
    if (settleHandle === null) return;
    clearTimeout(settleHandle);
    settleHandle = null;
  };

  /** Write past React, and only on a real change — this runs on every frame. */
  const writeLayerTransform = (value: string): void => {
    if (value === appliedTransform) return;
    appliedTransform = value;
    layer.style.transform = value;
  };

  const handleSlotError = (id: string, error: unknown): void => {
    if (failedIds.has(id)) return;
    failedIds.add(id);
    options.onSlotError?.(id, error);
    // Not synchronous: this fires while React is committing, and the re-sync
    // has to un-hide the node in Pixi so the scene has no hole where the card
    // would have been.
    queueMicrotask(() => {
      if (!disposed) sync();
    });
  };

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

  /**
   * The card that currently holds focus, if any.
   *
   * Such a card is never demoted, however far off screen it drifts: taking it
   * away would take the user's focus and any text they had typed with it, and
   * nothing is gained — the node is still drawn on the canvas underneath. React
   * Flow keeps a node mounted for the same reason while it is being dragged
   * (`system/src/utils/graph.ts:298`).
   *
   * Focus also covers the open-menu case in practice, since a popover that
   * matters holds focus. A host that builds one which does not must keep the
   * card alive by other means.
   */
  const focusedSlotId = (): string | null => {
    const active = document.activeElement;
    if (!active || !layer.contains(active)) return null;
    return active.closest('[data-promote-slot]')?.getAttribute('data-promote-slot') ?? null;
  };

  /** Which nodes this mode wants promoted, before any of them are resolved. */
  const wantedIds = (
    lod: LodLevel,
    viewport: ViewportTransform,
    screen: { width: number; height: number },
  ): string[] => {
    if (mode !== 'near-visible') {
      return resolvePromoteIds({
        mode,
        lod,
        selection: options.diagram.getSelection(),
        maxCount: maxPromoted ?? 8,
      });
    }
    return nearVisibleGateOpen(lod) ? visibleIds(viewport, screen) : [];
  };

  /** Resolve the wanted ids into slots, dropping what must not be promoted. */
  const buildSlots = (
    ids: readonly string[],
    sticky: string | null,
    viewport: ViewportTransform,
    screen: { width: number; height: number },
  ): PromoteSlotProps[] => {
    const slots: PromoteSlotProps[] = [];
    if (ids.length === 0) return slots;
    for (const candidate of options.diagram.listPromoteCandidates(ids)) {
      if (failedIds.has(candidate.id)) continue;
      const screenRect = worldBoxToScreen(candidate.world, viewport);
      if (!screenRectInView(screenRect, screen) && candidate.id !== sticky) continue;
      if (options.shouldPromote && !options.shouldPromote(candidate.node)) continue;
      slots.push({
        id: candidate.id,
        node: candidate.node,
        screenRect,
        chrome: scaleChrome(options.diagram.getPromoteChrome(candidate.kind), viewport.scale),
        viewport,
        onDemote: demote,
      });
    }
    return slots;
  };

  /**
   * The ceiling, applied last — every card has a rectangle to measure by now.
   *
   * A focused card is never trimmed: losing focus mid-edit is worse than showing
   * a card further from the centre. It takes one of the host's slots rather than
   * an extra one, so a declared cap of N stays N.
   */
  const applyCap = (
    slots: PromoteSlotProps[],
    sticky: string | null,
    screen: { width: number; height: number },
  ): PromoteSlotProps[] => {
    const stickySlot = sticky === null ? undefined : slots.find((slot) => slot.id === sticky);
    return stickySlot === undefined
      ? pickNearestToCenter(slots, screen, maxPromoted)
      : cappedAroundSticky(slots, stickySlot, screen, maxPromoted);
  };

  const sync = (): void => {
    if (disposed || !root) return;
    cancelSettle();
    const viewport = options.diagram.getViewport();
    // Positions below are computed for this camera, so the layer must not be
    // carrying a correction for an older one.
    writeLayerTransform('');
    syncedViewport = viewport;
    const measured = options.diagram.getScreenSize();
    const screen = { width: measured.width || 1, height: measured.height || 1 };

    const ids = wantedIds(options.diagram.getLodLevel(), viewport, screen);
    const sticky = focusedSlotId();
    if (sticky !== null && !ids.includes(sticky)) ids.push(sticky);

    const capped = applyCap(buildSlots(ids, sticky, viewport, screen), sticky, screen);

    // Hide in Pixi only what actually became a card. Hiding first — as this did
    // — meant a node that failed the screen test, or that had vanished from the
    // data since the ids were picked, was erased from the canvas and given
    // nothing in its place: a hole in the scene rather than a promoted card.
    options.diagram.setPromotedNodeIds(capped.map((slot) => slot.id));

    root.render(
      createElement(OverlayRoot, {
        slots: capped,
        component: options.component,
        onSlotError: handleSlotError,
        className: options.className,
      }),
    );
  };

  /**
   * Every camera frame lands here. Rebuilding card positions on each of them is
   * the cost this design exists to avoid, so the frame gets one transform on the
   * layer and the rebuild waits until the camera stops.
   */
  const onCameraChange = (): void => {
    if (disposed) return;
    const catchUp = syncedViewport
      ? viewportCatchUpTransform(syncedViewport, options.diagram.getViewport())
      : null;
    if (!catchUp) {
      // No usable reference frame — correcting is impossible, so rebuild.
      sync();
      return;
    }
    writeLayerTransform(
      `translate(${catchUp.x}px, ${catchUp.y}px) scale(${catchUp.scale})`,
    );
    cancelSettle();
    settleHandle = setTimeout(() => {
      settleHandle = null;
      // Reads the camera fresh, so the frame that gets drawn is the one the
      // camera stopped at rather than the one that scheduled this.
      sync();
    }, settleMs);
  };

  const unsubscribe = options.diagram.subscribePromoteSync(onCameraChange);
  sync();

  return {
    sync,
    setMode: (next) => {
      mode = next;
      sync();
    },
    getMode: () => mode,
    setMaxPromoted: (next) => {
      maxPromoted = next;
      sync();
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      // Before unmounting the root: a timer that outlives it would render into
      // a tree that no longer exists.
      cancelSettle();
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
  const { screenRect, chrome, node, onDemote, children } = props;
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
        // Exactly the box being replaced. A floor or an open-ended height makes
        // the card stop covering the node it stands in for, and the node shows
        // from one side only.
        width: screenRect.width,
        height: screenRect.height,
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: `${chrome.paddingY ?? 8}px ${chrome.paddingX ?? 10}px`,
        borderRadius: chrome.borderRadius,
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
        pointerEvents: 'auto',
        fontFamily: 'system-ui, sans-serif',
        color: 'var(--text, #0f172a)',
        background: 'var(--surface, #ffffff)',
        border: `${chrome.borderWidth}px solid var(--border, #cbd5e1)`,
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
