import { TransitionController } from './transition/TransitionController.js';
import { FADE_MS } from './transition/constants.js';
import { createAnimator } from './transition/animators.js';
import type { ResolvedAnimate, TargetBox, TransitionFrame } from './transition/types.js';
import type { SceneRegistrySnapshot } from './SceneRegistry.js';
import { reportPath } from '../interaction/reportPath.js';
import type { DiagramReportLine } from '../data/types.js';
import { Container, Graphics } from 'pixi.js';
import { LayerManager } from './LayerManager.js';
import { DropTargetIndex } from './dropTargetIndex.js';
import { nodeEntityKey, normalizeSelected, parseNodeEntityKey, type NodeRef } from '../core/index.js';
import { SceneRegistry, type NodeWorldBox } from './SceneRegistry.js';
import { promoteIdMatches, screenRectInView, worldBoxToScreen } from './promoteMath.js';
import type { ViewportTransform } from './Viewport.js';
import { ContourPainter } from './contour/ContourPainter.js';
import { projectedOccupantMove } from '../core/index.js';
import {
  PersonInteractions,
  type DragGrid,
  type SeatDragMode,
} from './personInteractions.js';
import { bindOrgCardInteractions } from './orgCardInteractions.js';
import { contourSceneInputs, matrixNodeBoxes } from './contour/contourInputs.js';
import type { StaffCanvasResult, StaffNodeBox } from '../layout/staff/types.js';
import {
  DEFAULT_STAFF_LAYOUT_OPTIONS,
  type StaffLayoutOptions,
} from '../layout/staff/types.js';
import {
  adminChildrenMap,
  isPositionExpanded,
} from '../layout/staff/positionExpand.js';
import { computeOrgLayout } from '../layout/rowTreeLayout.js';
import { siblingOrgGroupBounds } from '../layout/siblingOrgGroups.js';
import type { OrgLayoutOptions, OrgLayoutResult } from '../layout/types.js';
import { orgHasChildren } from '../layout/orgMode.js';
import type { ChromeBox } from './orgNodeChrome.js';
import { DoubleTapTracker } from '../interaction/doubleTap.js';
import type { SelectionPointerMods } from '../interaction/selection.js';
import type { ContextMenuPointer } from '../interaction/contextMenuPayload.js';
import { DepartmentCardView } from './DepartmentCardView.js';
import { countDepartmentPositions } from './departmentPositionsBadge.js';
import { paintDashedFrame } from './dashedStroke.js';
import { StaffZonesView } from './StaffZonesView.js';
import type { WorldRect } from './staffZoneBounds.js';
import { worldBoundsForTier } from './staffZoneBounds.js';
import { unionBoxes } from './staffZoneBounds.js';
import { OrgEdgesView } from './OrgEdgesView.js';
import { StaffEdgesView } from './StaffEdgesView.js';
import { staffDimmedIds } from './staffRelated.js';
import { PersonNodeView } from './PersonNode.js';
import { OrganizationNodeView } from './OrganizationNode.js';
import type {
  DepartmentCardStyle,
  NodeTheme,
  RenderConfig,
} from './types.js';
import { defaultRenderConfig } from './types.js';
import type { DiagramData, DiagramPosition } from '../data/types.js';
import { resolveSeatDrop, type SeatDrop } from '../core/index.js';
import type { LodLevel } from './lod.js';
import { computeStaffLiveGeometry, type StaffLiveGeometry } from './staffLiveGeometry.js';
import {
  buildStaffChromeGeometry,
  DEFAULT_STAFF_CHROME_PAD,
  type StaffChromeGeometry,
} from './staffChromeGeometry.js';
import {
  resolveContourWorldTransform,
  type ContourWorldTransform,
} from './contour/contourWorldTransform.js';
import {
  type ContourMemberBox,
} from './contour/contourClearance.js';
import {
  resolveStaffCurrentOrgId,
  resolveStaffZoneStyle,
} from './staffLayoutInputs.js';
import { orgStaffCardOptions, orgTreeOptions } from './organizationNodeOptions.js';

export interface InteractionSource {
  getHovered(): NodeRef | null;
  setHovered(ref: NodeRef | null): void;
}

export type RenderReason = 'animate' | 'snap';

export interface RenderOptions {
  transition?: RenderReason;
  orgLayout?: OrgLayoutOptions;
  lod?: LodLevel;
  /** Contour morph duration during drag (ms). `0` = snap. Default 160. */
  contourMorphMs?: number;
  onOrgClick?: (orgId: string, mods?: SelectionPointerMods) => void;
  /** Double-tap / dblclick on org card body (T69). Not fired for chrome. */
  onOrgDoubleClick?: (orgId: string) => void;
  /** Tier-3 card click: toggle expand-in-place (preferred). */
  onStaffOrgExpandToggle?: (orgId: string) => void;
  /** Explicit drill (change focus); used when expand toggle is not provided. */
  onStaffOrgDrill?: (orgId: string) => void;
  /** Position admin-subtree expand (T66). */
  onPositionExpandToggle?: (positionId: string) => void;
  onPersonClick?: (
    personId: string | undefined,
    positionId: string,
    mods?: SelectionPointerMods,
  ) => void;
  /** Double-tap / dblclick on person card body (T69). Not fired for chrome. */
  onPersonDoubleClick?: (personId: string, positionId: string) => void;
  onPersonContextMenu?: (
    personId: string,
    positionId: string,
    pointer: Required<ContextMenuPointer>,
  ) => void;
  onOrgContextMenu?: (
    orgId: string,
    pointer: Required<ContextMenuPointer>,
  ) => void;
  onOrgExpand?: (orgId: string) => void;
  onOrgCollapse?: (orgId: string) => void;
  onPersonDragEnd?: (positionId: string, col: number, row: number) => void;
  /** A seat was dropped on another seat and should report to it (T91). */
  onPersonReparent?: (positionId: string, managerId: string) => void;
  onCanvasClick?: () => void;
  /** Primary selection (compat) and/or full multi-select set (T67). */
  selected?: NodeRef | null | readonly NodeRef[];
  staff?: {
    currentOrgId?: string;
    layout?: StaffLayoutOptions;
    /** Tier-3 orgs expanded in place under their cards. */
    expandedOrgIds?: readonly string[];
  };
  /** World card AABBs per department (with position id) for button-group paint. */
  contourMemberBoxesByDept?: Map<string, ContourMemberBox[]>;
  /** T74: per-diagram texture loader (`diagram.media.loadTexture`). */
  loadTexture?: import('../media/nodeMedia.js').NodeTextureLoader;
}


/** Everything the staff scene builders share for one render pass. */
interface StaffSceneContext {
  data: DiagramData;
  theme: NodeTheme;
  resolvedTheme: 'light' | 'dark';
  config: RenderConfig;
  options: RenderOptions;
  epoch: number;
}

/** Staff pitch/inset derived from the layout options, resolved once per pass. */
interface StaffSceneGeometry {
  positionById: Map<string, DiagramData['positions'][number]>;
  margin: number;
  pitchX: number;
  pitchY: number;
  insetX: number;
  insetY: number;
}

export type { NodeWorldBox };

/**
 * How far outside a card the pointer still catches it when re-parenting.
 *
 * Wide enough that the gap between cards is not dead ground, narrow enough that
 * the target is never a surprise — roughly half a gap at the staff pitch.
 */
export const SEAT_MAGNET_RADIUS = 28;

/**
 * What a drag on this card means, read off the layout's own verdict.
 *
 * `anchor` and `matrix` are the roles the layout gives a seat whose coordinates
 * came from the host; the rest it placed itself. So the split is not a taste
 * call about gestures — it is «is this position data, or is it a result».
 */
function seatDragMode(role: StaffNodeBox['role']): SeatDragMode {
  if (role === 'external') return 'none';
  return role === 'matrix' || role === 'anchor' ? 'move' : 'reparent';
}

/** How much a pinned outside manager recedes behind the block's own seats. */
const EXTERNAL_CARD_ALPHA = 0.55;

const DROP_VALID_COLOR = 0x16a34a;
const DROP_INVALID_COLOR = 0xdc2626;

// Small scenes can spend more on culling than they save. Start conservatively
// within the 100–500 node guidance; validate this threshold with npm run measure.
const CULL_MIN_NODES = 300;

type CullStats = { drawn: number; culled: number; passes: number };

interface TransitionChromePaint {
  target: TargetBox;
  view: Container;
  draw: (rect: WorldRect) => Container;
  drawn: WorldRect;
}

interface TransitionSnapshot {
  layers: Map<Container, Container[]>;
  scene: SceneRegistrySnapshot;
  chrome: StaffChromeGeometry | null;
  lod: LodLevel | null;
  frame: TransitionFrame;
  chromePaint: Map<string, TransitionChromePaint>;
  ghosts: Map<string, { view: Container; baselineAlpha: number }>;
  layerAlphas: Map<Container, number>;
}

export class DiagramRenderer {
  readonly layers = new LayerManager();
  private destroyed = false;
  /** Bumped at each render entry; stale async passes bail after await (T75 D2). */
  private renderEpoch = 0;
  private highlightReady = false;
  private highlightApplied = false;
  private interactionSource: InteractionSource | null = null;
  private selectedViewKeys = new Set<string>();
  private interactionLines: readonly DiagramReportLine[] = [];
  private foundFocus: ReadonlySet<string> | null = null;
  private foundDimAlpha = 0.38;

  /** Null restores the original local hover path, including already mounted nodes. */
  setInteractionSource(src: InteractionSource | null): void {
    if (this.destroyed || this.interactionSource === src) return;
    if (this.interactionSource && !src) this.paintInteraction(null);
    this.interactionSource = src;
    for (const { view } of this.scene.listViews()) this.bindInteraction(view);
    this.onNeedsPaint?.();
  }

  private bindInteraction(view: Container): void {
    if (view instanceof PersonNodeView || view instanceof OrganizationNodeView) {
      const source = this.interactionSource;
      view.setHoverHandler(source ? (ref) => source.setHovered(ref) : undefined);
    }
  }

  private interactionViewKey(ref: NodeRef): string | null {
    if (ref.kind !== 'person') return nodeEntityKey(ref.kind, ref.id);
    const position = this.currentPositions.find((p) =>
      ref.positionId ? p.id === ref.positionId && p.personId === ref.id : p.personId === ref.id);
    return position ? nodeEntityKey('position', position.id) : null;
  }

  /** Read the source at paint time; related sets exist only for this paint. */
  private paintInteraction(hovered: NodeRef | null): void {
    const views = this.scene.listViews();
    const hoveredKey = hovered ? this.interactionViewKey(hovered) : null;
    const positionIds = new Set(views.flatMap(({ key, view }) => {
      const ref = parseNodeEntityKey(key);
      return view instanceof PersonNodeView && ref ? [ref.id] : [];
    }));
    const hoverRef = hoveredKey ? parseNodeEntityKey(hoveredKey) : null;
    const dimmed = staffDimmedIds(hoverRef, this.lastStaffChrome?.lines ?? this.interactionLines, positionIds);
    const frame = this.getTransitionFrame();
    for (const { key, view, baselineAlpha } of views) {
      if (!(view instanceof PersonNodeView || view instanceof OrganizationNodeView)) continue;
      view.setHovered(key === hoveredKey && !this.selectedViewKeys.has(key));
      const ref = parseNodeEntityKey(key);
      const emphasisAlpha = this.foundFocus && !this.foundFocus.has(key) ? this.foundDimAlpha : baselineAlpha;
      const hoverAlpha = view instanceof PersonNodeView && ref && dimmed.has(ref.id) ? 0.45 : 1;
      view.alpha = emphasisAlpha * hoverAlpha * (frame?.get(key)?.opacity ?? 1);
    }
  }
  /** Boxes, views and promote state for what the last render put on screen. */
  private readonly scene = new SceneRegistry();
  private lastCullStats: CullStats = { drawn: 0, culled: 0, passes: 0 };
  private lastDiagnostics: string[] = [];
  /** Contour cell-space → staff world (pitch + origin). */
  private contourWorld: ContourWorldTransform | null = null;
  /** Department contours: session and drag morphs. */
  private readonly contours = new ContourPainter({
    layers: this.layers,
    isDestroyed: () => this.destroyed,
  });
  /** Active grid for person drag snap (staff pitch or bare cell). */
  private dragGrid: DragGrid | null = null;
  /**
   * The positions the last `render()` call drew — read only to resolve a seat
   * drop for the drag preview (T111-K4a). `render()` itself stays untouched:
   * this is the one place downstream of it that needs the data outside the
   * call, since `previewDrag` fires on every pointer move, long after
   * `render()`'s own `data` argument has gone out of scope.
   */
  private currentPositions: DiagramPosition[] = [];
  /** Body double-tap tracker (T69); chrome / canvas resets it. */
  private readonly nodeDoubleTap = new DoubleTapTracker();
  /**
   * Asked for a repaint by anything that moves pixels outside a scene rebuild —
   * a dragged card, for one. Set by the host, which owns the Pixi application.
   */
  onNeedsPaint: (() => void) | null = null;
  onTransitionFrame: ((frame: TransitionFrame) => void) | null = null;
  private transition: TransitionController | null = null;
  private transitionSnapshot: TransitionSnapshot | null = null;
  private lastConfirmedLod: LodLevel | null = null;
  private transitionGhosts: Container | null = null;
  private ghostViews = new Map<string, { view: Container; baselineAlpha: number }>();
  private transitionFrom: TransitionFrame = new Map();
  private transitionPreparedEpoch = -1;
  private transitionWarned = false;
  private lineFadeRequest: number | null = null;
  private lineFadeViews: Container[] = [];
  private forceTransitionSettle = false;
  private oldTransitionPaint: { view: Container; alpha: number }[] = [];
  private stagedPaint: Container[] = [];
  private transitionPaintStarted = 0;
  private transitionChromePaint = new Map<string, TransitionChromePaint>();

  configureTransition(resolved: ResolvedAnimate | null): void {
    if (this.destroyed) return;
    this.settleNow();
    this.transition?.destroy();
    this.transition = resolved ? new TransitionController({
      resolved, createAnimator,
      clock: {
        now: () => performance.now(),
        requestFrame: (cb) => requestAnimationFrame((time) => {
          // A pending async render owns the stage until prepare or abort.
          if (!this.transitionSnapshot) cb(time);
        }),
        cancelFrame: (id) => cancelAnimationFrame(id),
      },
    }) : null;
    this.transition?.onFrame((frame) => {
      this.applyTransitionFrame(frame);
      if (!this.transition?.isActive()) {
        const paint = [...this.stagedPaint];
        if (this.layers.edges.children.length > 0) paint.push(this.layers.edges);
        this.clearTransitionGhosts();
        if (!this.forceTransitionSettle) this.fadeInTransitionPaint(paint);
      }
      this.signalTransitionFrame(frame);
      this.onNeedsPaint?.();
    });
  }

  startTransition(): void {
    if (!this.transition || this.destroyed) return;
    this.releaseTransitionSnapshot();
    this.transition.confirm();
    this.transitionPaintStarted = performance.now();
    this.transition.start();
  }

  abortTransition(): void {
    const snapshot = this.transitionSnapshot;
    if (!snapshot || !this.transition) return;
    this.transition.abort();
    // Rescue snapshot children before clearing the refused scene's ghosts.
    for (const children of snapshot.layers.values()) {
      for (const child of children) child.removeFromParent();
    }
    this.clearTransitionGhosts();
    this.layers.restore(snapshot.layers);
    this.ghostViews = snapshot.ghosts;
    this.transitionChromePaint = snapshot.chromePaint;
    for (const [layer, alpha] of snapshot.layerAlphas) layer.alpha = alpha;
    this.scene.restore(snapshot.scene);
    for (const box of this.scene.listBoxes()) {
      const frameBox = snapshot.frame.get(box.id);
      if (frameBox) this.scene.rememberBox({ ...box, x: frameBox.x, y: frameBox.y });
    }
    this.lastStaffChrome = snapshot.chrome;
    this.lastConfirmedLod = snapshot.lod;
    this.lastLod = snapshot.lod ?? this.lastLod;
    for (const { view } of this.scene.listViews()) view.eventMode = 'none';
    this.transitionSnapshot = null;
    this.onNeedsPaint?.();
  }

  settleNow(): void {
    const fading = this.lineFadeRequest !== null;
    this.finishLineFade();
    if (!this.transition?.isActive()) {
      if (fading) this.onNeedsPaint?.();
      return;
    }
    this.releaseTransitionSnapshot();
    this.forceTransitionSettle = true;
    try { this.transition.snapToTarget(); }
    finally { this.forceTransitionSettle = false; }
  }

  /** No layout work or structural signals in the short final paint fade. */
  private fadeInTransitionPaint(views: Container[]): void {
    if (views.length === 0) return;
    this.lineFadeViews = views;
    const started = performance.now();
    // The settled routes become visible immediately, including at the burst cap.
    for (const view of views) view.alpha = 0.01;
    const tick = (now: number) => {
      this.lineFadeRequest = null;
      if (this.destroyed) return;
      const progress = Math.min(1, Math.max(0, (now - started) / FADE_MS));
      for (const view of views) view.alpha = 0.01 + 0.99 * (1 - (1 - progress) ** 3);
      if (progress < 1) this.lineFadeRequest = requestAnimationFrame(tick);
      else this.lineFadeViews = [];
      this.onNeedsPaint?.();
    };
    this.lineFadeRequest = requestAnimationFrame(tick);
  }

  private finishLineFade(): void {
    if (this.lineFadeRequest !== null) cancelAnimationFrame(this.lineFadeRequest);
    this.lineFadeRequest = null;
    for (const view of this.lineFadeViews) view.alpha = 1;
    this.lineFadeViews = [];
  }

  getTransitionFrame(): TransitionFrame | null {
    return this.transition?.isActive() ? this.transition.frame() : null;
  }

  private signalTransitionFrame(frame: TransitionFrame): void {
    try { this.onTransitionFrame?.(frame); }
    catch (error) {
      if (!this.transitionWarned) {
        this.transitionWarned = true;
        console.warn('Transition frame callback failed', error);
      }
    }
  }

  private captureTransitionSnapshot(): void {
    this.releaseTransitionSnapshot();
    if (!this.transition) return;
    this.transitionSnapshot = {
      layers: this.layers.detach(), scene: this.scene.snapshot(),
      chrome: this.getStaffChromeGeometry(), lod: this.lastConfirmedLod,
      chromePaint: new Map(this.transitionChromePaint),
      frame: this.transition.frame(), ghosts: new Map(this.ghostViews),
      layerAlphas: new Map(this.layers.root.children.map((layer) => [layer, layer.alpha])),
    };
  }

  private releaseTransitionSnapshot(): void {
    if (!this.transitionSnapshot) return;
    for (const children of this.transitionSnapshot.layers.values()) {
      for (const child of children) {
        if (child.parent !== this.transitionGhosts) child.destroy({ children: true });
      }
    }
    this.transitionSnapshot = null;
  }

  private clearTransitionGhosts(): void {
    if (this.transitionGhosts) {
      for (const child of this.transitionGhosts.removeChildren()) {
        // Rollback still owns these until startTransition confirms the pass.
        if (!this.transitionSnapshot) child.destroy({ children: true });
      }
    }
    this.ghostViews.clear();
    this.oldTransitionPaint = [];
    for (const view of this.stagedPaint) view.alpha = 1;
    this.stagedPaint = [];
    this.layers.edges.alpha = 1;
  }

  private prepareTransition(options: RenderOptions, staff: boolean, nodeTargets?: TargetBox[]): void {
    if (!this.transition) return;
    const targets: TargetBox[] = nodeTargets ?? (staff ? this.scene.listBoxes().map((box) => ({
      key: box.id, x: box.x, y: box.y, w: box.width, h: box.height,
    })) : []);
    this.transitionPreparedEpoch = this.renderEpoch;
    for (const paint of this.transitionChromePaint.values()) targets.push(paint.target);
    const chrome = this.lastStaffChrome;
    if (chrome?.org) targets.push(rectTarget('frame:org', chrome.org));
    for (const dept of chrome?.depts ?? []) targets.push(rectTarget(`frame:dept:${dept.departmentId}`, dept));
    this.transitionFrom = this.transition.frame();
    this.transition.prepare(targets, {
      animate: staff && options.transition === 'animate' && this.lastConfirmedLod === this.lastLod,
    });
    this.clearTransitionGhosts();
    if (this.transition.isActive()) {
      this.transitionGhosts ??= this.layers.root.addChild(new Container());
      this.transitionGhosts.eventMode = 'none';
      const snapshot = this.transitionSnapshot;
      if (snapshot) {
        const candidates = new Map(snapshot.ghosts);
        for (const [key, paint] of snapshot.chromePaint) {
          candidates.set(key, { view: paint.view, baselineAlpha: 1 });
        }
        for (const [key, view] of snapshot.scene.views) {
          candidates.set(key, { view, baselineAlpha: snapshot.scene.baselineAlphas.get(key) ?? 1 });
        }
        for (const [key, { view, baselineAlpha }] of candidates) {
          if (this.transition.frame().get(key)?.phase !== 'exiting') continue;
          this.transitionGhosts.addChild(view);
          this.ghostViews.set(key, { view, baselineAlpha });
        }
      }
      if (snapshot) {
        const oldPaint = [this.layers.edges, this.layers.departmentStrokes];
        for (const layer of oldPaint) {
          for (const view of snapshot.layers.get(layer) ?? []) {
            this.transitionGhosts.addChild(view);
            this.oldTransitionPaint.push({ view, alpha: view.alpha * (snapshot.layerAlphas.get(layer) ?? 1) });
          }
        }
        for (const view of snapshot.layers.get(this.layers.departments) ?? []) {
          if ([...snapshot.chromePaint.values()].some((paint) => paint.view === view)) continue;
          this.transitionGhosts.addChild(view);
          this.oldTransitionPaint.push({ view, alpha: view.alpha });
        }
      }
      this.stagedPaint = [...this.layers.departmentStrokes.children,
        ...this.layers.departments.children.filter((view) => ![...this.transitionChromePaint.values()].some((paint) => paint.view === view))];
      for (const view of this.stagedPaint) view.alpha = 0;
      this.layers.edges.alpha = 0;
    }
    this.transitionPaintStarted = performance.now();
    this.applyTransitionFrame(this.transition.frame());
  }

  private applyTransitionFrame(frame: TransitionFrame): void {
    const progress = Math.min(1, Math.max(0, (performance.now() - this.transitionPaintStarted) / FADE_MS));
    for (const { view, alpha } of this.oldTransitionPaint) view.alpha = alpha * (1 - progress) ** 3;
    for (const { key, view, baselineAlpha } of this.scene.listViews()) {
      const box = frame.get(key);
      if (!box) continue;
      view.position.set(box.x, box.y);
      view.scale.set(box.scale);
      view.alpha = baselineAlpha * box.opacity;
    }
    for (const [key, { view, baselineAlpha }] of this.ghostViews) {
      const box = frame.get(key);
      if (!box) continue;
      if (!key.startsWith('frame:')) {
        view.position.set(box.x, box.y);
        view.scale.set(box.scale);
      }
      view.alpha = baselineAlpha * box.opacity;
    }
    for (const [key, paint] of this.transitionChromePaint) {
      const box = frame.get(key);
      if (!box) continue;
      const rect = frameRect(box);
      if (rect.x !== paint.drawn.x || rect.y !== paint.drawn.y
        || rect.width !== paint.drawn.width || rect.height !== paint.drawn.height) {
        for (const child of paint.view.removeChildren()) child.destroy({ children: true });
        paint.view.addChild(paint.draw(rect));
        paint.drawn = rect;
      }
      paint.view.alpha = box.opacity;
    }
  }

  /** Rectangular chrome repaints from boxes, preserving labels and stroke widths. */
  private addTransitionChrome(key: string, rect: WorldRect, layer: Container,
    draw: (box: WorldRect) => Container): void {
    const view = new Container();
    view.eventMode = 'none';
    view.addChild(draw(rect));
    layer.addChild(view);
    this.transitionChromePaint.set(key, { target: rectTarget(key, rect), view, draw, drawn: rect });
  }

  /** The band the scene was last drawn at — seat drag is gated on it. */
  private lastLod: LodLevel = 'near';

  /** Strip reserved for zone labels in the last render; 0 without zone chrome. */
  private lastZoneLabelBand = 0;

  /**
   * Chrome geometry from the LAST render that drew the React near-view chrome
   * (Б2 getter). Reset to null at the top of every render() — so an org-view or a
   * React-chrome-off render leaves no stale box — and set only in the
   * reactChrome-on branch of renderStaffCanvas. Read by `getStaffChromeGeometry`.
   */
  private lastStaffChrome: StaffChromeGeometry | null = null;

  /**
   * Union of the chrome painted around the nodes — zones and department frames.
   *
   * `contentBounds()` knows only node boxes, so fitting to it clipped everything
   * drawn around them: the top zone's name sat above the fitted region and was
   * cut off by the viewport edge.
   */
  private chromeBounds: WorldRect | null = null;

  /** Seat-card pointer behaviour, including drag with contour preview. */
  private readonly personInteractions = new PersonInteractions({
    personLayer: this.layers.persons,
    doubleTap: this.nodeDoubleTap,
    rememberBox: (box) => this.rememberBox(box),
    dragGrid: () => this.dragGrid,
    currentLod: () => this.lastLod,
    onDragStart: () => this.settleNow(),
    // Resolve the same `SeatDrop` the commit will (T111-K4a, plan §1's "one
    // clean function, two consumers"): `movePersonToCell`
    // (OrgHierarchyDiagram.ts) is the other caller of `resolveSeatDrop`, over
    // the same `positions` shape. `from` is the seat's *authored* cell, not
    // the drag gesture — matching `resolveSeatDrop`'s own contract (plan §2)
    // so an L-shaped drag cannot show one thing here and commit another.
    previewDrag: (positionId, col, row) => {
      const target = { col, row };
      const mover = this.currentPositions.find((p) => p.id === positionId);
      const drop = mover
        ? resolveSeatDrop({ positions: this.currentPositions, positionId, target, from: mover.gridCell })
        : ({ kind: 'free' } as const);
      this.contours.previewDrag(positionId, target, drop);
      // Same resolved drop, second layer: the ring above, the neighbour's own
      // card here (T111-K4b).
      this.previewCardDisplacement(positionId, drop);
    },
    restoreContours: () => this.contours.restoreAfterFailedDrag(),
    restoreCards: () => this.restoreCards(),
    requestPaint: () => this.onNeedsPaint?.(),
    dropTargetAt: (x, y, skipId) => {
      // `SceneRegistry` re-keys every box to `kind:id`, so both the id we skip
      // and the id we return have to be translated — otherwise the dragged card
      // is never skipped and every target reads as an unknown position.
      const hit = this.ensureDropTargets().nearest(
        x,
        y,
        SEAT_MAGNET_RADIUS,
        nodeEntityKey('position', skipId),
      );
      return hit ? (parseNodeEntityKey(hit.id)?.id ?? hit.id) : undefined;
    },
    canDropOn: (positionId, managerId) => this.canReparent?.(positionId, managerId) ?? false,
    showDropPreview: (positionId, targetId, valid) =>
      this.drawDropPreview(positionId, targetId, valid),
    clearDropPreview: () => this.clearDropPreview(),
  });

  /** Boxes of the seats the last render drew, bucketed for pointer lookup. */
  private dropTargets: DropTargetIndex | null = null;

  /**
   * Whether a drop is allowed — supplied by the diagram, which owns the data.
   *
   * The renderer knows where the cards are; it does not know what supervision
   * means, and giving it `reportLines` to consult would put a second copy of
   * that rule next to the one in `positionReparent`.
   */
  canReparent: ((positionId: string, managerId: string) => boolean) | null = null;

  /** What the drop preview is currently saying, or null when nothing is drawn. */
  lastDropPreview: { targetId: string; valid: boolean; color: number } | null = null;

  mount(stage: Container): void {
    stage.addChild(this.layers.root);
  }

  getNodeBox(id: string): NodeWorldBox | undefined {
    return this.scene.getBox(id);
  }

  /** Soft layout warnings from the last successful `render` (may be empty). */
  getLayoutDiagnostics(): readonly string[] {
    return this.lastDiagnostics;
  }

  listNodeBoxes(): readonly NodeWorldBox[] {
    return this.scene.listBoxes();
  }

  /**
   * Hide Pixi views for ids that are promoted to HTML (avoids double paint).
   * Call after render or when the promote set changes.
   */
  setPromotedNodeIds(ids: readonly string[]): void {
    this.scene.setPromotedIds(ids);
    const promoted = new Set(ids);
    for (const [key, { view }] of this.ghostViews) {
      view.visible = !promoteIdMatches(promoted, key);
    }
  }

  getPromotedNodeIds(): readonly string[] {
    return this.scene.listPromotedIds();
  }

  /**
   * The neighbour the drag preview has moved out of the way, and where its
   * card sat before we touched it (T111-K4b).
   *
   * Held as the *pre-move* coordinates rather than a delta so putting it back
   * is an assignment, not arithmetic that has to stay in step with however
   * many times the pointer crossed a cell boundary.
   */
  private displacedCard: { id: string; x: number; y: number } | null = null;

  /**
   * Show the resolved drop on the **sprite** layer: the neighbour's own card
   * moves to the cell the projection puts it in.
   *
   * `ContourPainter.previewDrag` already moves the contour model for the same
   * drop; without this the ring rebuilds correctly while the card it is drawn
   * around stays put, and the dragged card simply covers it — which is the
   * half of the reported defect K4a did not close (spec A9).
   *
   * Any previously displaced card is put back first: within one gesture the
   * resolved occupant changes as the pointer moves, and a neighbour left
   * parked in a cell nobody chose would show a layout no drop can produce.
   */
  private previewCardDisplacement(positionId: string, drop: SeatDrop): void {
    this.restoreCards();
    const grid = this.dragGrid;
    if (!grid) return;
    const mover = this.currentPositions.find((p) => p.id === positionId);
    const move = projectedOccupantMove(drop, mover?.gridCell);
    if (!move) return;
    const occupant = this.currentPositions.find((p) => p.id === move.occupantId);
    const from = occupant?.gridCell;
    // No authored cell for the occupant means nothing to measure the move
    // from; leave its card alone rather than guessing a home for it.
    if (!from) return;
    const view = this.scene.getView('position', move.occupantId);
    if (!view) return;
    this.displacedCard = { id: move.occupantId, x: view.x, y: view.y };
    view.position.set(
      view.x + (move.to.col - from.col) * grid.pitchX,
      view.y + (move.to.row - from.row) * grid.pitchY,
    );
  }

  /**
   * Undo {@link previewCardDisplacement}. Safe to call when nothing is
   * displaced, which is most of the time — both drag cancel paths call it
   * unconditionally rather than each deciding whether it applies.
   */
  private restoreCards(): void {
    const displaced = this.displacedCard;
    this.displacedCard = null;
    if (!displaced) return;
    const view = this.scene.getView('position', displaced.id);
    // The scene may have been rebuilt under us (a commit landed, `setData`
    // ran); the fresh card is already where the data says, so there is
    // nothing to restore.
    if (view) view.position.set(displaced.x, displaced.y);
  }

  /**
   * Повернути жест на місце **без** перемальовування сцени (ризик 30).
   *
   * Відмовлений дроп коштував повного `render()` — 579 мс на сцені 1M **за
   * жест, який нічого не змінив**. Дані на цих гілках недоторкані (усі відмови
   * кидають **до** `commitDataChange`), тож відкочувати нічого: треба лише
   * прибрати наслідки самого жесту.
   *
   * 🔑 Домівка картки береться з **боксу останнього намальованого кадру**, і це
   * правильно навіть тоді, коли сцену перебудували під час `ask`: `rememberBox`
   * оновлюється на кожен кадр, тож бокс завжди каже, де картка **має** бути за
   * останньою намальованою правдою. Якщо позиції вже немає, `getView` віддасть
   * `undefined` — і повертати нічого.
   */
  restoreAfterRefusedDrop(positionId: string): void {
    const view = this.scene.getView('position', positionId);
    const box = this.scene.getBox(`position:${positionId}`);
    if (view && box) view.position.set(box.x, box.y);
    this.contours.restoreAfterFailedDrag();
    this.restoreCards();
    this.onNeedsPaint?.();
  }

  private registerView(kind: NodeWorldBox['kind'], id: string, view: Container): void {
    this.scene.registerView(kind, id, view);
    if (this.interactionSource) this.bindInteraction(view);
  }

  private registerMediaView(
    url: string | undefined,
    view: { reloadMedia: () => Promise<void> },
  ): void {
    this.scene.registerMediaView(url, view);
  }

  /**
   * T74 M1: after MediaService.invalidate — reload textures on live sprites
   * without a full scene rebuild.
   */
  async refreshMediaUrls(urls: readonly string[]): Promise<void> {
    if (this.destroyed) return;
    await Promise.all(this.scene.viewsForMediaUrls(urls).map((v) => v.reloadMedia()));
  }

  /** Axis-aligned union of remembered node boxes (world space). */
  getContentBounds(): { x: number; y: number; width: number; height: number } | null {
    const parts = [this.scene.contentBounds(), this.chromeBounds].filter(
      (r): r is WorldRect => r !== null,
    );
    return unionBoxes(parts);
  }

  /**
   * Chrome geometry (frames/org/lines/seat boxes, world coords) from the last
   * render that drew the React near-view chrome; null before the first render and
   * on any render that did not (org-view, grid, React chrome off). The Б2 host
   * reads this instead of recomputing the layout.
   */
  getStaffChromeGeometry(): (StaffChromeGeometry & { linesOpacity?: number }) | null {
    const chrome = this.lastStaffChrome;
    const frame = this.getTransitionFrame();
    if (!chrome || !frame) return chrome;
    const org = frame.get('frame:org');
    return {
      ...chrome,
      org: chrome.org && org ? { ...chrome.org, ...frameRect(org) } : chrome.org,
      depts: chrome.depts.map((dept) => {
        const box = frame.get(`frame:dept:${dept.departmentId}`);
        return box ? { ...dept, ...frameRect(box) } : dept;
      }),
      nodeBoxes: Object.fromEntries(Object.entries(chrome.nodeBoxes).map(([id, box]) => {
        const current = frame.get(`position:${id}`);
        return [id, current ? frameRect(current) : box];
      })),
      lines: [], linesOpacity: 0,
    };
  }

  /** Grow the painted-chrome union; reset per render. */
  private rememberChrome(rect: WorldRect): void {
    this.chromeBounds = unionBoxes(
      this.chromeBounds ? [this.chromeBounds, rect] : [rect],
    );
  }

  /** Fail open on bad geometry so a cull pass cannot abort the animation frame. */
  cullToViewport(
    viewport: ViewportTransform,
    screen: { width: number; height: number },
  ): void {
    if (this.interactionSource) this.paintInteraction(this.interactionSource.getHovered());
    this.lastCullStats.passes += 1;
    const views = [...this.scene.listViews(), ...[...this.ghostViews].map(([key, value]) => ({ key, ...value }))];
    if (views.length < CULL_MIN_NODES) {
      this.resetCull();
      return;
    }
    const pad = 0.5 * Math.max(screen.width, screen.height);
    let drawn = 0;
    for (const { key, view } of views) {
      let renderable = true;
      try {
        const target = this.scene.getBox(key);
        const from = this.getTransitionFrame() && this.transitionFrom.get(key);
        const ghost = this.ghostViews.has(key) && this.getTransitionFrame()?.get(key);
        const box = ghost ? frameRect(ghost)
          : from && target ? unionBoxes([target, frameRect(from)]) : target;
        if (
          box &&
          Number.isFinite(box.x) && Number.isFinite(box.y) &&
          Number.isFinite(box.width) && Number.isFinite(box.height)
        ) {
          renderable = screenRectInView(worldBoxToScreen(box, viewport), screen, pad);
        }
      } catch {
        // Geometry failure must restore a view culled by the previous paint.
        renderable = true;
      }
      view.renderable = renderable;
      if (renderable) drawn += 1;
    }
    this.lastCullStats = {
      drawn,
      culled: views.length - drawn,
      passes: this.lastCullStats.passes,
    };
  }

  /** Restore node paint without changing the visibility owned by promote. */
  resetCull(): void {
    const views = this.scene.listViews();
    for (const { view } of views) view.renderable = true;
    for (const { view } of this.ghostViews.values()) view.renderable = true;
    this.lastCullStats = { drawn: views.length, culled: 0, passes: this.lastCullStats.passes };
  }

  getCullStats(): CullStats {
    return { ...this.lastCullStats };
  }

  async render(
    data: DiagramData,
    theme: NodeTheme,
    resolvedTheme: 'light' | 'dark',
    config: RenderConfig = defaultRenderConfig,
    options: RenderOptions = {},
    orgLayoutResult?: OrgLayoutResult,
  ): Promise<void> {
    if (this.destroyed) return;
    if (this.transition) {
      this.finishLineFade();
      if (options.transition === 'animate') this.captureTransitionSnapshot();
      else {
        this.releaseTransitionSnapshot();
        this.clearTransitionGhosts();
      }
    }
    this.highlightReady = false;
    this.highlightApplied = false;
    this.foundFocus = null;
    this.interactionLines = data.reportLines;
    const epoch = ++this.renderEpoch;
    this.currentPositions = data.positions;
    this.contours.reset();
    this.chromeBounds = null;
    this.contourWorld = null;
    this.dragGrid = null;
    this.dropTargets = null;
    this.personInteractions.reset();
    this.layers.clear();
    this.scene.clear();
    this.lastDiagnostics = [];
    // Reset here — not inside renderStaffCanvas — because org-view and grid renders
    // never enter it, and would otherwise leave the previous alpha box cached.
    this.lastStaffChrome = null;
    this.transitionChromePaint = new Map();

    this.layers.root.eventMode = 'static';
    this.layers.root.removeAllListeners('pointertap');
    this.layers.root.on('pointertap', () => {
      this.nodeDoubleTap.reset();
      options.onCanvasClick?.();
    });

    const lod = options.lod ?? 'near';
    this.lastLod = lod;
    const hasStaff = data.positions.length > 0;
    if (hasStaff) {
      await this.renderStaff(data, theme, resolvedTheme, config, { ...options, lod }, epoch);
    } else if (data.organizations.length > 0) {
      await this.renderOrganizations(data, theme, resolvedTheme, config, { ...options, lod }, epoch, orgLayoutResult);
    }
    if (!this.isRenderCurrent(epoch)) return;

    if (this.transition) {
      if (this.transitionPreparedEpoch !== epoch) {
        this.prepareTransition(options, hasStaff || data.organizations.length === 0);
      }
      this.applyTransitionFrame(this.transition.frame());
      this.lastConfirmedLod = lod;
    }
    this.drawSelection(options.selected ?? []);
    this.scene.applyPromoteVisibility();
    this.highlightReady = true;
  }

  /**
   * An empty contour layer with a silent console is the kind of quiet lie this
   * repo bans, so the one reason contours can still come out empty — seats with
   * no authored `gridCell` — goes to `getLayoutDiagnostics()`.
   *
   * T80 note: the painter itself no longer reports anything. Every message it
   * used to send explained why the Rust flood could not run, and the flood is
   * gone; the reasons went with it rather than falling silent.
   */
  private reportContourDiagnostic(message: string): void {
    this.lastDiagnostics = [...this.lastDiagnostics, message];
  }

  private isRenderCurrent(epoch: number): boolean {
    return !this.destroyed && epoch === this.renderEpoch;
  }

  /**
   * T75 D1: refresh selection chrome only — no layout / view rebuild.
   */
  repaintSelection(selected: NodeRef | null | readonly NodeRef[] = []): void {
    if (this.destroyed) return;
    const removed = this.layers.overlay.removeChildren();
    for (const child of removed) {
      child.destroy({ children: true });
    }
    this.drawSelection(selected);
  }

  /** Repaint cached edges and card alpha only, independently of selection chrome. */
  repaintHighlight(
    highlightedNode: string | null,
    foundFocus: ReadonlySet<string> | null,
    lines: readonly DiagramReportLine[],
    theme: NodeTheme,
  ): void {
    if (this.destroyed || !this.highlightReady) return;
    if (highlightedNode === null && !foundFocus?.size && !this.highlightApplied) return;
    const views = this.scene.listViews();
    if (views.length === 0) return;
    const found = foundFocus && views.some(({ key }) => foundFocus.has(key)) ? foundFocus : null;
    this.foundFocus = found;
    this.foundDimAlpha = theme.foundDimAlpha ?? 0.38;
    const path = highlightedNode === null ? null : reportPath(highlightedNode, lines);
    const dim = Boolean(path?.nodeKeys.size || found);
    for (const { key, view, baselineAlpha } of views) {
      view.alpha = found && !found.has(key) ? (theme.foundDimAlpha ?? 0.38) : baselineAlpha;
    }
    for (const view of this.layers.edges.children) {
      if (view instanceof StaffEdgesView || view instanceof OrgEdgesView) {
        view.applyHighlight({ accentKeys: path?.edgeKeys ?? new Set(), dim });
      }
    }
    this.highlightApplied = dim;
    if (this.interactionSource) this.paintInteraction(this.interactionSource.getHovered());
  }

  destroy(): void {
    if (this.destroyed) return;
    this.finishLineFade();
    this.transition?.destroy();
    this.releaseTransitionSnapshot();
    this.clearTransitionGhosts();
    this.destroyed = true;
    this.renderEpoch += 1;
    this.contours.reset();
    this.layers.clear();
    this.layers.root.destroy({ children: true });
  }

  /**
   * Paint the drop target ring and the ghost line to it.
   *
   * The ghost is what makes the gesture legible: a ring alone says «this card
   * is under the pointer», which is what hover already says. The line says what
   * would change — a new reporting line is exactly the thing being drawn. Red
   * and dashed-to-nowhere means the drop will be refused, and the user sees
   * that before letting go rather than after (T91 rows 16-17).
   */
  private drawDropPreview(positionId: string, targetId: string | null, valid: boolean): void {
    this.clearDropPreview();
    if (this.destroyed) return;
    const from = this.scene.getBox(positionId);
    if (!from) return;
    const to = targetId ? this.scene.getBox(targetId) : undefined;
    const color = valid ? DROP_VALID_COLOR : DROP_INVALID_COLOR;
    // The colour actually handed to `stroke` below, kept so a test can assert
    // «this drop reads as refused» without sampling pixels.
    this.lastDropPreview = to && targetId ? { targetId, valid, color } : null;

    if (to) {
      const ring = new Graphics();
      ring.rect(to.x - 4, to.y - 4, to.width + 8, to.height + 8);
      ring.stroke({ color, width: 3 });
      this.layers.dragPreview.addChild(ring);

      const ghost = new Graphics();
      ghost.moveTo(to.x + to.width / 2, to.y + to.height / 2);
      ghost.lineTo(from.x + from.width / 2, from.y + from.height / 2);
      ghost.stroke({ color, width: 2, alpha: 0.9 });
      this.layers.dragPreview.addChild(ghost);
    }
  }

  /**
   * Bucket the drawn seats, once per render and only if a drag asks.
   *
   * Built lazily rather than at the end of `render`: most renders never see a
   * drag, and paying for the index on every one of them would tax the path this
   * feature is not on. `render` drops it to null, so it can never outlive the
   * scene it describes.
   */
  private ensureDropTargets(): DropTargetIndex {
    if (this.dropTargets) return this.dropTargets;
    const boxes = this.scene.listBoxes().filter((b) => b.kind === 'position');
    // Bucket at the scene's pitch when it has one; otherwise at the largest
    // card, which keeps roughly one box per bucket either way.
    let cellW = this.dragGrid?.pitchX ?? 0;
    let cellH = this.dragGrid?.pitchY ?? 0;
    if (cellW <= 0 || cellH <= 0) {
      for (const b of boxes) {
        cellW = Math.max(cellW, b.width);
        cellH = Math.max(cellH, b.height);
      }
    }
    this.dropTargets = new DropTargetIndex(boxes, cellW, cellH);
    return this.dropTargets;
  }

  private clearDropPreview(): void {
    this.lastDropPreview = null;
    const removed = this.layers.dragPreview.removeChildren();
    for (const child of removed) child.destroy({ children: true });
  }

  private drawSelection(selected: NodeRef | null | readonly NodeRef[]): void {
    this.selectedViewKeys = new Set(normalizeSelected(selected).flatMap((ref) => {
      const key = this.interactionViewKey(ref);
      return key ? [key] : [];
    }));
    if (this.interactionSource) this.paintInteraction(this.interactionSource.getHovered());
    for (const node of normalizeSelected(selected)) {
      const box =
        this.getNodeBox(node.id) ??
        (node.positionId ? this.getNodeBox(node.positionId) : undefined) ??
        (node.personId ? this.getNodeBox(node.personId) : undefined);
      if (!box) continue;
      const g = new Graphics();
      g.rect(box.x - 3, box.y - 3, box.width + 6, box.height + 6);
      g.stroke({ color: 0x2563eb, width: 2 });
      this.layers.overlay.addChild(g);
    }
  }

  private rememberBox(box: NodeWorldBox): void {
    this.scene.rememberBox(box);
  }

  private async renderStaff(
    data: DiagramData,
    theme: NodeTheme,
    resolvedTheme: 'light' | 'dark',
    config: RenderConfig,
    options: RenderOptions,
    epoch: number,
  ): Promise<void> {
    const ctx: StaffSceneContext = { data, theme, resolvedTheme, config, options, epoch };
    const currentOrgId = resolveStaffCurrentOrgId(data, options.staff?.currentOrgId);
    if (currentOrgId) {
      await this.renderStaffCanvas(ctx, currentOrgId);
      return;
    }
    // No focus org: seats fall back to the bare cell grid (mockups, tests).
    await this.renderPositionGrid(ctx);
  }

  /** SPEC §2.2 three-tier canvas: zones, contours, edges, seats, org cards. */
  private async renderStaffCanvas(
    ctx: StaffSceneContext,
    currentOrgId: string,
  ): Promise<void> {
    const { data, theme, config, options, epoch } = ctx;
    // Layout, zone bands and routed edges come from one shared computation so the
    // renderer and the golden regression test run the same geometry, not two
    // copies that can drift (see staffLiveGeometry.ts). The geometry is computed
    // per-LOD from the Rust bridge (A4.2b); there is no pre-computed canvas.
    const live = await computeStaffLiveGeometry({
      data,
      currentOrgId,
      theme,
      resolvedTheme: ctx.resolvedTheme,
      config,
      staff: options.staff,
      lod: options.lod ?? 'near',
    });
    if (!this.isRenderCurrent(epoch)) return;
    const { canvas } = live;
    // `lastZoneLabelBand` records the *computed* band — before `staff.layout` is
    // spread into the options — so it can differ from `staffOptions.zoneLabelBand`.
    this.lastZoneLabelBand = live.zoneLabelBand;
    this.lastDiagnostics = [...canvas.diagnostics];

    const staffMerged = { ...DEFAULT_STAFF_LAYOUT_OPTIONS, ...live.staffOptions };
    const geom: StaffSceneGeometry = {
      positionById: new Map(data.positions.map((p) => [p.id, p])),
      margin: staffMerged.margin,
      pitchX: staffMerged.refCellWidth + staffMerged.horizontalGap,
      pitchY: staffMerged.refCellHeight + staffMerged.verticalGap,
      insetX: (staffMerged.refCellWidth - theme.person.width) / 2,
      insetY: (staffMerged.refCellHeight - theme.person.height) / 2,
    };
    this.dragGrid = {
      pitchX: geom.pitchX,
      pitchY: geom.pitchY,
      originX: 0,
      originY: 0,
      insetX: geom.insetX,
      insetY: geom.insetY,
    };

    // React near-view chrome (T129): on mid/near the React backdrop owns dept/org
    // frames and lines, so Pixi chrome (zones, dept cards, frame+edges) is skipped
    // to avoid double paint. Keyed on `staffReactChrome` — set by the host ONLY when
    // the backdrop is mounted — not on `staffAlphaMockup`, so a missing backdrop
    // leaves Pixi drawing the chrome (graceful fallback, never an empty scene). On
    // far, Pixi draws everything. Person/org cards are untouched: the promote
    // overlay hides the ones it draws in React; the rest stay Pixi.
    const reactChrome = config.staffReactChrome === true && (options.lod ?? 'near') !== 'far';
    if (reactChrome) {
      // The host owns the chrome in React; cache the geometry it must read (Б2).
      this.lastStaffChrome = buildStaffChromeGeometry(
        live,
        data,
        currentOrgId,
        config.staffChromePad ?? DEFAULT_STAFF_CHROME_PAD,
      );
    } else {
      if (config.staffZoneChrome) this.paintStaffZones(ctx, live, geom);
      await this.paintStaffDepartments(ctx, canvas, geom);
      if (!this.isRenderCurrent(epoch)) return;
      this.paintStaffFrameAndEdges(ctx, live);
    }
    if (this.transition) {
      const targets = canvas.positionNodes.map((node) => rectTarget(`position:${node.id}`, node));
      for (const card of canvas.orgCards) {
        if (theme.organization.orgCardLayout === 'gojs-vertical' && card.expanded) continue;
        targets.push(rectTarget(`organization:${card.orgId}`, card));
      }
      this.prepareTransition(options, true, targets);
    }
    this.addStaffPersonCards(ctx, canvas, geom);
    this.addStaffOrgCards(ctx, canvas);
  }

  private paintStaffZones(
    ctx: StaffSceneContext,
    live: StaffLiveGeometry,
    geom: StaffSceneGeometry,
  ): void {
    const { theme, resolvedTheme } = ctx;
    const { canvas, zones: tiers, contentPadding } = live;
    for (const tier of tiers) {
      if (tier.x !== undefined && tier.width !== undefined) {
        this.rememberChrome({ x: tier.x, y: tier.y, width: tier.width, height: tier.height });
      }
    }
    if (this.transition) {
      for (const tier of tiers) {
        if (tier.kind !== 'staff-block') continue;
        const bounds = tier.x !== undefined && tier.width !== undefined
          ? { x: tier.x, y: tier.y, width: tier.width, height: tier.height }
          : worldBoundsForTier(tier, canvas.positionNodes, canvas.orgCards,
            { margin: geom.margin, canvasWidth: canvas.width, contentPadding });
        this.addTransitionChrome(`frame:zone:${tier.organizationId ?? tier.tier}`, bounds, this.layers.zones,
          (rect) => StaffZonesView.fromCanvas({
            tiers: [{ ...tier, ...rect }], positionNodes: canvas.positionNodes,
            orgCards: canvas.orgCards, style: resolveStaffZoneStyle(theme, resolvedTheme),
            nodeTheme: theme, margin: geom.margin, canvasWidth: canvas.width, contentPadding,
          }));
      }
      return;
    }
    this.layers.zones.addChild(
      StaffZonesView.fromCanvas({
        tiers,
        positionNodes: canvas.positionNodes,
        orgCards: canvas.orgCards,
        style: resolveStaffZoneStyle(theme, resolvedTheme),
        nodeTheme: theme,
        margin: geom.margin,
        canvasWidth: canvas.width,
        contentPadding,
      }),
    );
  }

  /**
   * Contours only for authored grid cells — remapping tree/hybrid world coords
   * into the cell grid produces crooked “macaroni” blobs.
   */
  private async paintStaffDepartments(
    ctx: StaffSceneContext,
    canvas: StaffCanvasResult,
    geom: StaffSceneGeometry,
  ): Promise<void> {
    const { data, theme, config, options } = ctx;
    const { inputs: contourInputs, memberBoxesByDept } = contourSceneInputs(
      canvas.positionNodes,
      geom.positionById,
    );

    const deptStyle = config.departmentStyle ?? defaultRenderConfig.departmentStyle ?? 'blob';
    if (deptStyle === 'card') {
      this.paintDepartmentCards(data, theme, config, memberBoxesByDept);
      return;
    }
    if (contourInputs.length === 0) {
      // Blob mode without authored cells paints nothing — say so instead of
      // leaving the host to wonder where the contours went.
      if (canvas.positionNodes.length > 0) {
        this.reportContourDiagnostic(
          `Contours skipped: ${canvas.positionNodes.length} seats have no gridCell (departmentStyle: 'blob' needs authored coords)`,
        );
      }
      return;
    }

    this.contourWorld = resolveContourWorldTransform(
      canvas.positionNodes,
      geom.positionById,
      config.cellWidth,
      config.cellHeight,
      geom.pitchX,
      geom.pitchY,
    );
    this.dragGrid = {
      pitchX: this.contourWorld.pitchX,
      pitchY: this.contourWorld.pitchY,
      originX: this.contourWorld.originX,
      originY: this.contourWorld.originY,
      insetX: geom.insetX,
      insetY: geom.insetY,
    };
    await this.contours.paint({
      inputs: contourInputs,
      data,
      theme,
      config,
      lod: options.lod ?? 'near',
      morphMs: options.contourMorphMs,
      memberBoxesByDept,
    });
  }

  private paintStaffFrameAndEdges(ctx: StaffSceneContext, live: StaffLiveGeometry): void {
    const { theme, resolvedTheme, config } = ctx;
    const { canvas, routes, markedCrossings } = live;
    if (config.dashedGridFrame) {
      const frame = unionBoxes(
        canvas.positionNodes.map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height })),
        6,
      );
      if (frame) {
        const zoneStyle = resolveStaffZoneStyle(theme, resolvedTheme);
        if (this.transition) {
          this.addTransitionChrome('frame:grid', frame, this.layers.zones, (rect) => {
            const view = new Container();
            paintDashedFrame(view, rect, { color: zoneStyle.stroke, borderRadius: zoneStyle.borderRadius });
            return view;
          });
        } else {
          paintDashedFrame(this.layers.zones, frame, {
            color: zoneStyle.stroke,
            borderRadius: zoneStyle.borderRadius,
          });
        }
      }
    }

    // Routing happens once, in the single seam; the view is a pure painter that
    // takes the ready-made segments (T126 R6-6), so the picture the golden
    // captures is exactly the one painted here. markedKeys is empty for the
    // legacy router, which marks no foreign-frame crossings.
    const markedKeys = new Set(markedCrossings.map((c) => `${c.fromId}\u0000${c.toId}`));
    this.layers.edges.addChild(
      StaffEdgesView.fromLayout(routes, { theme: resolvedTheme, edge: theme.edge }, markedKeys),
    );
  }

  private addStaffPersonCards(
    ctx: StaffSceneContext,
    canvas: StaffCanvasResult,
    geom: StaffSceneGeometry,
  ): void {
    const { data, theme, config, options } = ctx;
    const lod = options.lod ?? 'near';
    const personById = new Map(data.persons.map((p) => [p.id, p]));
    const staffLayoutOpts = {
      ...DEFAULT_STAFF_LAYOUT_OPTIONS,
      ...options.staff?.layout,
      expandedOrgIds: options.staff?.expandedOrgIds ?? options.staff?.layout?.expandedOrgIds,
    };
    const expandedPosIds = new Set(staffLayoutOpts.expandedPositionIds ?? []);
    const childrenByOrg = new Map<string, Map<string, string[]>>();
    const childrenFor = (orgId: string) => {
      let m = childrenByOrg.get(orgId);
      if (!m) {
        m = adminChildrenMap(data.positions, data.reportLines, orgId);
        childrenByOrg.set(orgId, m);
      }
      return m;
    };

    for (const n of canvas.positionNodes) {
      const position = geom.positionById.get(n.id);
      if (!position) continue;
      const person = position.personId ? personById.get(position.personId) : undefined;
      const kids = childrenFor(position.organizationId).get(position.id) ?? [];
      // #96: prune is always on, so the chevron shows for any node with admin
      // children and a toggle handler (no gate term).
      const showExpand = kids.length > 0 && !!options.onPositionExpandToggle;
      const node = PersonNodeView.create(
        person,
        position,
        { ...theme.person, width: n.width, height: n.height },
        lod,
        {
          nodeTheme: theme,
          loadTexture: options.loadTexture,
          onContextMenu: options.onPersonContextMenu
            ? (pointer) =>
                options.onPersonContextMenu!(position.personId ?? '', position.id, {
                  ...pointer,
                  canvasX: 0,
                  canvasY: 0,
                })
            : undefined,
          expand: showExpand
            ? {
                hasChildren: true,
                expanded: isPositionExpanded(position, expandedPosIds),
                onToggle: () => options.onPositionExpandToggle!(position.id),
              }
            : undefined,
          // Card-split: when the host owns detail via the HTML overlay, a seat
          // that falls back to Pixi at mid draws the far mark, not a stale card.
          markAtMid: config.staffReactChrome === true,
        },
      );
      const start = this.transition?.frame().get(`position:${n.id}`);
      node.position.set(start?.x ?? n.x, start?.y ?? n.y);
      // A pinned outside manager is a reference, not a member: dimmed so the
      // block's own seats stay the foreground (T91 row 25).
      if (n.role === 'external') node.alpha = EXTERNAL_CARD_ALPHA;
      this.personInteractions.bind(node, {
        personId: position.personId,
        positionId: position.id,
        box: { id: position.id, kind: 'position', x: n.x, y: n.y, width: n.width, height: n.height },
        config,
        options,
        gridCell: position.gridCell,
        dragMode: seatDragMode(n.role),
      });
      this.layers.persons.addChild(node);
      this.registerView('position', position.id, node);
      this.registerMediaView(node.resolvedPhotoUrl, node);
    }
  }

  private addStaffOrgCards(ctx: StaffSceneContext, canvas: StaffCanvasResult): void {
    const { data, theme, resolvedTheme, config, options } = ctx;
    for (const card of canvas.orgCards) {
      const org = data.organizations.find((o) => o.id === card.orgId);
      if (!org) continue;
      const orgStyle = { ...theme.organization, width: card.width, height: card.height };
      // C2: expanded sub-org is a positions container — no empty org card chrome.
      if (orgStyle.orgCardLayout === 'gojs-vertical' && card.expanded) continue;

      const view = OrganizationNodeView.create(
        org,
        undefined,
        resolvedTheme,
        orgStyle,
        options.lod ?? 'near',
        { ...orgStaffCardOptions(org, card, options, config), nodeTheme: theme },
      );
      const start = this.transition?.frame().get(`organization:${card.orgId}`);
      view.position.set(start?.x ?? card.x, start?.y ?? card.y);
      view.eventMode = 'static';
      view.cursor = 'pointer';
      this.rememberBox({
        id: card.orgId,
        kind: 'organization',
        // 🔴 **Жодного з двох полів у штатному шляху.** `hasChildren` тут
        // порахувати легко (`card.positionCount`), і поле було б чесне саме по
        // собі — але хост читає **пару**, і §14 оголошує «ознака є, бокса
        // немає» як «кнопка в моделі є, кадр її не показує ⇒ підведи камеру».
        // У штатній сцені це неправда двічі: chevron **на екрані**, і камера ні
        // до чого. Порожня пара читається як «не покрито» — і це правда, бо
        // обсяг T115 кроку 2 — дерево.
        x: card.x,
        y: card.y,
        width: card.width,
        height: card.height,
      });
      this.registerView('organization', card.orgId, view);
      this.registerMediaView(view.resolvedSymbolUrl, view);
      bindOrgCardInteractions(view, {
        orgId: card.orgId,
        doubleTap: this.nodeDoubleTap,
        handlers: options,
        // Staff-scene org cards are not selectable — only positions are
        // manipulable here (owner 2026-09-13). Tap expands/drills, never selects.
        selectable: false,
        // Tier-3 card: expand in place when the host offers it, else drill in.
        onSingleTap: (orgId) => {
          if (options.onStaffOrgExpandToggle) options.onStaffOrgExpandToggle(orgId);
          else options.onStaffOrgDrill?.(orgId);
        },
      });
      this.layers.organizations.addChild(view);
    }
  }

  /** Seats on the bare cell grid — no tiers, no org cards (mockups, tests). */
  private async renderPositionGrid(ctx: StaffSceneContext): Promise<void> {
    const { data, theme, config, options, epoch } = ctx;
    const insetX = (config.cellWidth - theme.person.width) / 2;
    const insetY = (config.cellHeight - theme.person.height) / 2;

    // T78-C2: same member AABB path as staff — button-group needs boxes.
    const gridNodes = matrixNodeBoxes(data.positions, {
      cellWidth: config.cellWidth,
      cellHeight: config.cellHeight,
      cardWidth: theme.person.width,
      cardHeight: theme.person.height,
    });
    const { inputs: contourInputs, memberBoxesByDept } = contourSceneInputs(
      gridNodes,
      new Map(data.positions.map((p) => [p.id, p])),
    );

    await this.contours.paint({
      inputs: contourInputs,
      data,
      theme,
      config,
      lod: options.lod ?? 'near',
      morphMs: options.contourMorphMs,
      memberBoxesByDept,
    });

    // The staff and organisation paths check here; this one did not. Contour
    // paint is async, so a newer render can clear the layers and start filling
    // them while this call is suspended — `ContourPainter` drops its own stale
    // session, but nothing stopped the rest of this method from mounting its
    // cards into a scene that had already moved on (structure audit §Medium).
    if (!this.isRenderCurrent(epoch)) return;

    this.dragGrid = { pitchX: config.cellWidth, pitchY: config.cellHeight, originX: 0, originY: 0, insetX, insetY };

    const personById = new Map(data.persons.map((p) => [p.id, p]));
    if (this.transition) {
      this.prepareTransition(options, true, gridNodes.map((node) => rectTarget(`position:${node.id}`, node)));
    }
    for (const position of data.positions) {
      if (!position.gridCell) continue;
      const person = position.personId ? personById.get(position.personId) : undefined;
      const node = PersonNodeView.create(person, position, theme.person, options.lod ?? 'near', {
        nodeTheme: theme,
        loadTexture: options.loadTexture,
        onContextMenu: options.onPersonContextMenu
          ? (pointer) =>
              options.onPersonContextMenu!(position.personId ?? '', position.id, {
                ...pointer,
                canvasX: 0,
                canvasY: 0,
              })
          : undefined,
        // Card-split: seat falling back to Pixi at mid draws the far mark.
        markAtMid: config.staffReactChrome === true,
      });
      const x = position.gridCell.col * config.cellWidth + insetX;
      const y = position.gridCell.row * config.cellHeight + insetY;
      const start = this.transition?.frame().get(`position:${position.id}`);
      node.position.set(start?.x ?? x, start?.y ?? y);
      this.personInteractions.bind(node, {
        personId: position.personId,
        positionId: position.id,
        box: {
          id: position.id,
          kind: 'position',
          x,
          y,
          width: theme.person.width,
          height: theme.person.height,
        },
        config,
        options,
        gridCell: position.gridCell,
        // This path draws only seats that have a `gridCell` (see the guard at
        // the top of the loop) — every card here is authored, so every drag
        // here moves.
        dragMode: 'move',
      });
      this.layers.persons.addChild(node);
      this.registerView('position', position.id, node);
      this.registerMediaView(node.resolvedPhotoUrl, node);
    }
  }

  private async renderOrganizations(
    data: DiagramData,
    theme: NodeTheme,
    resolvedTheme: 'light' | 'dark',
    config: RenderConfig,
    options: RenderOptions,
    epoch: number,
    orgLayoutResult?: OrgLayoutResult,
  ): Promise<void> {
    // Layout is computed by the orchestrator (#4) and handed down (split T2a);
    // the in-renderer compute stays only as a fallback for callers that pass
    // none (tests, and any path not yet pre-computing). Removing it is a later
    // cut, once every caller hands a result in.
    const layout =
      orgLayoutResult ??
      (await computeOrgLayout(
        data.organizations,
        data.orgLinks ?? [],
        options.orgLayout,
      ));
    if (!this.isRenderCurrent(epoch)) return;

    const edgesView = OrgEdgesView.fromEdges(layout.edges, {
      color: resolvedTheme === 'dark' ? 0x64748b : 0x94a3b8,
      ...theme.edge,
    });
    this.layers.edges.addChild(edgesView);

    const orgById = new Map(data.organizations.map((o) => [o.id, o]));
    if (config.orgSiblingGroupChrome) {
      const outline = (config.orgSiblingGroupStyle ?? 'zone') === 'outline';
      const zone = theme.staffZone;
      const frame = outline
        ? {
            pad: 14,
            color: resolvedTheme === 'dark' ? 0x64748b : 0x94a3b8,
          }
        : {
            pad: 32,
            color: zone?.stroke ?? 0x3d5067,
            fill: zone?.fill ?? 0x191f26,
            fillAlpha: zone?.fillAlpha ?? 0.92,
            borderRadius: zone?.borderRadius ?? 12,
          };
      const groups = siblingOrgGroupBounds(layout.nodes, frame.pad, {
        collapsedMatrixOnly: outline,
        orgById,
      });
      for (const g of groups) {
        paintDashedFrame(this.layers.zones, g.bounds, { width: 1, ...frame });
      }
    }

    const groupById = new Map(data.groups.map((g) => [g.id, g]));

    for (const ln of layout.nodes) {
      const org = orgById.get(ln.orgId);
      if (!org) continue;
      const primaryGroupId = org.groupIds[0];
      const group = primaryGroupId ? groupById.get(primaryGroupId) : undefined;
      const node = OrganizationNodeView.create(
        org,
        group,
        resolvedTheme,
        {
          ...theme.organization,
          width: ln.width,
          height: ln.height,
        },
        options.lod ?? 'near',
        { ...orgTreeOptions(org, data, options, config), nodeTheme: theme },
      );
      node.position.set(ln.x, ln.y);
      this.rememberBox({
        id: org.id,
        kind: 'organization',
        x: ln.x,
        y: ln.y,
        width: ln.width,
        height: ln.height,
        // Картка стоїть у `ln.x/ln.y`, бокс кнопки — у координатах картки, тож
        // світові = сума. Не `getBounds()`: той віддав би координати **після**
        // камери, і бокс був би правильний рівно на зумі 1 (T115 крок 2).
        ...worldExpanderBox(node.expanderBox(), ln.x, ln.y),
        hasChildren: orgHasChildren(data.organizations, org.id),
      });
      bindOrgCardInteractions(node, {
        orgId: org.id,
        doubleTap: this.nodeDoubleTap,
        handlers: options,
      });
      this.layers.organizations.addChild(node);
      this.registerView('organization', org.id, node);
      this.registerMediaView(node.resolvedSymbolUrl, node);
    }
  }

  private paintDepartmentCards(
    data: DiagramData,
    theme: NodeTheme,
    config: RenderConfig,
    memberBoxesByDept: Map<string, ContourMemberBox[]>,
  ): void {
    const style = resolveDepartmentCardStyle(theme);
    const minMembers = config.minContourMembers ?? defaultRenderConfig.minContourMembers;
    for (const dept of data.departments) {
      const members = memberBoxesByDept.get(dept.id) ?? [];
      const bounds = unionBoxes(members);
      if (this.transition && bounds && members.length >= minMembers) {
        this.addTransitionChrome(`frame:dept:${dept.id}`, bounds, this.layers.departments,
          (rect) => DepartmentCardView.fromMembers(dept, [rect], style, {
            minMembers: 1, nodeTheme: theme,
            positionsCount: countDepartmentPositions(data.positions, dept.id),
          }) ?? new Container());
        continue;
      }
      const card = DepartmentCardView.fromMembers(dept, members, style, {
        minMembers,
        nodeTheme: theme,
        positionsCount: countDepartmentPositions(data.positions, dept.id),
      });
      if (card) this.layers.departments.addChild(card);
    }
  }
}

/**
 * Локальний бокс кнопки → світовий, зсувом на позицію картки.
 *
 * Типи по краях різні **свідомо**: на вході {@link ChromeBox}, який своїм
 * означенням заявляє координати картки, на виході — поле `NodeWorldBox`, тобто
 * світові. Спільний іменований тип на обидва кінці стер би саме ту різницю,
 * заради якої функція існує.
 *
 * Повертає **порожній об'єкт**, коли кнопки немає: так виклик лишається одним
 * спредом, а поле просто не з'являється — замість `expander: undefined`, який
 * у JSON-порівняннях поводиться інакше за відсутнє.
 */
function worldExpanderBox(
  local: ChromeBox | undefined,
  cardX: number,
  cardY: number,
): Pick<NodeWorldBox, 'expander'> {
  if (!local) return {};
  return {
    expander: {
      x: cardX + local.x,
      y: cardY + local.y,
      width: local.width,
      height: local.height,
    },
  };
}

function resolveDepartmentCardStyle(theme: NodeTheme): DepartmentCardStyle {
  if (theme.departmentCard) return theme.departmentCard;
  return {
    fill: 0x242f3d,
    fillAlpha: 0.88,
    stroke: 0x3d5067,
    strokeWidth: 1,
    borderRadius: 8,
    labelColor: 0xf1f5f9,
    labelFontSize: 14,
  };
}

function rectTarget(key: string, rect: WorldRect): TargetBox {
  return { key, x: rect.x, y: rect.y, w: rect.width, h: rect.height };
}

function frameRect(box: TargetBox): WorldRect {
  return { x: box.x, y: box.y, width: box.w, height: box.h };
}
