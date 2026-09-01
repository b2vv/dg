import type { Container } from 'pixi.js';
import type { LodLevel } from './lod.js';
import { snapToGrid, snapWorldToCell } from '../interaction/positionMove.js';
import type { DoubleTapTracker } from '../interaction/doubleTap.js';
import {
  isPrimaryPointerTap,
  isSelectionToggleModifier,
  readSelectionPointerMods,
  type SelectionPointerMods,
} from '../interaction/selection.js';
import type { ContextMenuPointer } from '../interaction/contextMenuPayload.js';
import type { PersonNodeView } from './PersonNode.js';
import { bindCardContextMenu } from './cardContextMenu.js';
import type { NodeWorldBox } from './SceneRegistry.js';
import type { RenderConfig } from './types.js';

/** Pitch, origin and card inset of the grid a drag snaps to. */
export interface DragGrid {
  pitchX: number;
  pitchY: number;
  originX: number;
  originY: number;
  insetX: number;
  insetY: number;
}

/** Pointer callbacks a bound seat can fire (subset of RenderOptions). */
export interface PersonPointerHandlers {
  onPersonClick?: (
    personId: string | undefined,
    positionId: string,
    mods: SelectionPointerMods,
  ) => void;
  onPersonDoubleClick?: (personId: string, positionId: string) => void;
  onPersonContextMenu?: (
    personId: string,
    positionId: string,
    pointer: Required<ContextMenuPointer>,
  ) => void;
  onPersonDragEnd?: (positionId: string, col: number, row: number) => void;
  onPersonReparent?: (positionId: string, managerId: string) => void;
}

/**
 * What dragging this card means — decided by the scene, not by the user (T91
 * GATE 1).
 *
 * A card whose cell the host authored can be *moved*: the coordinates are data,
 * and putting them somewhere else is an edit that survives the next layout. A
 * card the layout placed cannot — dropping it on a cell would write a
 * `gridCell` it never had, silently turning a computed position into an
 * authored one. What that gesture can mean instead is *whose report this seat
 * is*, which is data in both cases.
 *
 * `none` is the third case: a card that is only *shown* here, such as a manager
 * pinned in from another organisation. Editing it would edit a seat the viewer
 * did not open, so the gesture falls through to panning instead.
 */
export type SeatDragMode = 'move' | 'reparent' | 'none';

export interface PersonBindArgs {
  personId: string | undefined;
  positionId: string;
  box: NodeWorldBox;
  config: RenderConfig;
  options: PersonPointerHandlers;
  /** Authored cell of this card — the drag origin is derived from it. */
  gridCell?: { col: number; row: number };
  /** Scene's verdict on what a drag here means; `move` keeps the old path. */
  dragMode?: SeatDragMode;
}

export interface PersonInteractionDeps {
  /** Layer the pointer's global position is converted into. */
  personLayer: Container;
  doubleTap: DoubleTapTracker;
  rememberBox(box: NodeWorldBox): void;
  /** Snap grid for the current scene; null before a scene sets one. */
  dragGrid(): DragGrid | null;
  /** Band the scene is drawn at — see the drag gate in `bind`. */
  currentLod(): LodLevel;
  previewDrag(positionId: string, col: number, row: number): void;
  restoreContours(): void;
  /** Card nearest the pointer within the magnet radius, excluding the dragged one. */
  dropTargetAt(x: number, y: number, skipId: string): string | undefined;
  /** May `positionId` be made to report to `managerId`? */
  canDropOn(positionId: string, managerId: string): boolean;
  /** Paint the ring and ghost line; `targetId` null clears the target half. */
  showDropPreview(positionId: string, targetId: string | null, valid: boolean): void;
  clearDropPreview(): void;
  /** Nothing paints on its own any more — a moved card has to ask. */
  requestPaint(): void;
}

interface DragState {
  positionId: string;
  node: PersonNodeView;
  originX: number;
  originY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  pointerId: number;
  moved: boolean;
  previewCol: number | null;
  previewRow: number | null;
  /** T78-L1: per-card grid origin (staff tiers share gridCell indices). */
  snapGrid: DragGrid | null;
  mode: SeatDragMode;
  /** Last target the preview was drawn for — repaint only on change. */
  targetId: string | null;
}

/**
 * Pointer behaviour of seat cards: select, double-tap, context menu and drag
 * with a live contour preview. Owns the drag state so the renderer does not.
 */
export class PersonInteractions {
  private drag: DragState | null = null;

  /**
   * Swallow the tap that closes a drag.
   *
   * `pointertap` fires after `pointerup`, by which time `endDrag` has cleared
   * `this.drag` — so the guard that reads `this.drag?.moved` in the tap handler
   * has never actually caught anything, and every completed drag also selected
   * a card. A move hid it, because the re-render that follows repaints the
   * chrome; a *refused* re-parent does not re-render, and the stray selection
   * ring around the card you were told you could not drop on became plainly
   * visible (T91, found in the browser).
   */
  private tapAfterDrag = false;

  constructor(private readonly deps: PersonInteractionDeps) {}

  /** Render entry: the old cards are gone, so any drag on them is too. */
  reset(): void {
    if (this.drag?.mode === 'reparent') this.deps.clearDropPreview();
    this.drag = null;
    this.tapAfterDrag = false;
  }

  /** Wire click, double-tap, context menu and drag for one seat card. */
  bind(node: PersonNodeView, args: PersonBindArgs): void {
    const { personId, positionId, box, config, options, gridCell } = args;
    const dragMode: SeatDragMode = args.dragMode ?? 'move';
    this.deps.rememberBox(box);

    node.on('pointertap', (e) => {
      if (!isPrimaryPointerTap(e)) return;
      if (this.tapAfterDrag) {
        this.tapAfterDrag = false;
        this.deps.doubleTap.reset();
        return;
      }
      if (this.drag?.moved) return;
      if (node.activateChromePointer(e)) {
        this.deps.doubleTap.reset();
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
      const mods = readSelectionPointerMods(e);
      // Modifier+click toggles set membership — do not feed double-tap expand (T69).
      if (isSelectionToggleModifier(mods)) {
        this.deps.doubleTap.reset();
        options.onPersonClick?.(personId, positionId, mods);
        return;
      }
      const kind = this.deps.doubleTap.tap(`person:${personId ?? ''}:${positionId}`);
      if (kind === 'double') {
        if (personId) options.onPersonDoubleClick?.(personId, positionId);
        return;
      }
      options.onPersonClick?.(personId, positionId, mods);
    });

    bindCardContextMenu(node, (pointer) =>
      options.onPersonContextMenu?.(personId ?? '', positionId, pointer),
    );

    node.on('pointerdown', (e) => {
      // A new press starts a new gesture: whatever the last one left behind
      // must not swallow this one's tap.
      this.tapAfterDrag = false;
      if (node.isChromePointer(e)) {
        e.stopPropagation();
        return;
      }
      // Drag only where the card is a card. Below `near` a seat is a compressed
      // strip (mid) or a dot (far), so a drag there aims at something the user
      // cannot see and drops it somewhere they did not choose. Falling through
      // without stopPropagation lets the stage pan instead, which is what the
      // same gesture means when there is no card to grab — and a tap still
      // selects, since selection rides on pointertap rather than on this.
      if (this.deps.currentLod() !== 'near') return;
      // Shown, not owned — see `SeatDragMode`.
      if (dragMode === 'none') return;
      const local = this.deps.personLayer.toLocal(e.global);
      const grid = this.deps.dragGrid();
      // T78-L1: origin from THIS card's world + gridCell, not the first staff tier.
      const snapGrid: DragGrid | null =
        grid && gridCell
          ? {
              ...grid,
              originX: node.x - gridCell.col * grid.pitchX - grid.insetX,
              originY: node.y - gridCell.row * grid.pitchY - grid.insetY,
            }
          : grid;
      this.drag = {
        positionId,
        node,
        originX: node.x,
        originY: node.y,
        grabOffsetX: local.x - node.x,
        grabOffsetY: local.y - node.y,
        pointerId: e.pointerId,
        moved: false,
        previewCol: null,
        previewRow: null,
        snapGrid,
        mode: dragMode,
        targetId: null,
      };
      e.stopPropagation();
    });

    node.on('globalpointermove', (e) => {
      if (!this.drag || this.drag.positionId !== positionId) return;
      if (e.pointerId !== this.drag.pointerId) return;
      const local = this.deps.personLayer.toLocal(e.global);
      const nx = local.x - this.drag.grabOffsetX;
      const ny = local.y - this.drag.grabOffsetY;
      if (Math.hypot(nx - this.drag.originX, ny - this.drag.originY) > 4) {
        this.drag.moved = true;
      }
      node.position.set(nx, ny);
      this.deps.requestPaint();
      if (!this.drag.moved) return;
      if (this.drag.mode === 'reparent') {
        this.trackTarget(positionId, local.x, local.y);
        return;
      }
      const snap = this.snapTo(nx, ny, config);
      if (snap.col < 0 || snap.row < 0) return;
      if (snap.col === this.drag.previewCol && snap.row === this.drag.previewRow) return;
      this.drag.previewCol = snap.col;
      this.drag.previewRow = snap.row;
      this.deps.previewDrag(positionId, snap.col, snap.row);
    });

    const endDrag = (e: { pointerId: number }) => {
      if (!this.drag || this.drag.positionId !== positionId) return;
      if (e.pointerId !== this.drag.pointerId) return;
      const { originX, originY, moved, mode, targetId } = this.drag;
      this.drag = null;
      if (moved) this.tapAfterDrag = true;
      if (mode === 'reparent') {
        // The card always goes home: its place is the layout's to decide, and
        // the edit this gesture makes is to the reporting line, not to a
        // coordinate (T91 rows 18-20).
        this.deps.clearDropPreview();
        node.position.set(originX, originY);
        this.deps.requestPaint();
        if (moved && targetId && this.deps.canDropOn(positionId, targetId)) {
          options.onPersonReparent?.(positionId, targetId);
        }
        return;
      }
      if (!moved) {
        node.position.set(originX, originY);
        this.deps.requestPaint();
        return;
      }
      const snap = this.snapTo(node.x, node.y, config);
      if (snap.col < 0 || snap.row < 0) {
        node.position.set(originX, originY);
        this.deps.restoreContours();
        this.deps.requestPaint();
        return;
      }
      options.onPersonDragEnd?.(positionId, snap.col, snap.row);
    };

    node.on('pointerup', endDrag);
    node.on('pointerupoutside', endDrag);
  }

  /**
   * Follow the pointer's drop target and keep the preview in step.
   *
   * Repaints only when the target changes, so holding still costs nothing —
   * the lookup itself is bounded by the index, not by the scene size.
   */
  private trackTarget(positionId: string, x: number, y: number): void {
    if (!this.drag) return;
    const targetId = this.deps.dropTargetAt(x, y, positionId) ?? null;
    if (targetId === this.drag.targetId) return;
    this.drag.targetId = targetId;
    const valid = targetId !== null && this.deps.canDropOn(positionId, targetId);
    this.deps.showDropPreview(positionId, targetId, valid);
    this.deps.requestPaint();
  }

  /** Nothing is being dragged onto anything — used by tests and by reset. */
  private snapTo(x: number, y: number, config: RenderConfig): { col: number; row: number } {
    const grid = this.drag?.snapGrid ?? this.deps.dragGrid();
    if (grid) {
      return snapWorldToCell(x, y, grid);
    }
    return snapToGrid(x, y, config.cellWidth, config.cellHeight);
  }
}
