import type { Container } from 'pixi.js';
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
}

export interface PersonBindArgs {
  personId: string | undefined;
  positionId: string;
  box: NodeWorldBox;
  config: RenderConfig;
  options: PersonPointerHandlers;
  /** Authored cell of this card — the drag origin is derived from it. */
  gridCell?: { col: number; row: number };
}

export interface PersonInteractionDeps {
  /** Layer the pointer's global position is converted into. */
  personLayer: Container;
  doubleTap: DoubleTapTracker;
  rememberBox(box: NodeWorldBox): void;
  /** Snap grid for the current scene; null before a scene sets one. */
  dragGrid(): DragGrid | null;
  previewDrag(positionId: string, col: number, row: number): void;
  restoreContours(): void;
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
}

/**
 * Pointer behaviour of seat cards: select, double-tap, context menu and drag
 * with a live contour preview. Owns the drag state so the renderer does not.
 */
export class PersonInteractions {
  private drag: DragState | null = null;

  constructor(private readonly deps: PersonInteractionDeps) {}

  /** Render entry: the old cards are gone, so any drag on them is too. */
  reset(): void {
    this.drag = null;
  }

  /** Wire click, double-tap, context menu and drag for one seat card. */
  bind(node: PersonNodeView, args: PersonBindArgs): void {
    const { personId, positionId, box, config, options, gridCell } = args;
    this.deps.rememberBox(box);

    node.on('pointertap', (e) => {
      if (!isPrimaryPointerTap(e)) return;
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
      if (node.isChromePointer(e)) {
        e.stopPropagation();
        return;
      }
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
      if (!this.drag.moved) return;
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
      const { originX, originY, moved } = this.drag;
      this.drag = null;
      if (!moved) {
        node.position.set(originX, originY);
        return;
      }
      const snap = this.snapTo(node.x, node.y, config);
      if (snap.col < 0 || snap.row < 0) {
        node.position.set(originX, originY);
        this.deps.restoreContours();
        return;
      }
      options.onPersonDragEnd?.(positionId, snap.col, snap.row);
    };

    node.on('pointerup', endDrag);
    node.on('pointerupoutside', endDrag);
  }

  private snapTo(x: number, y: number, config: RenderConfig): { col: number; row: number } {
    const grid = this.drag?.snapGrid ?? this.deps.dragGrid();
    if (grid) {
      return snapWorldToCell(x, y, grid);
    }
    return snapToGrid(x, y, config.cellWidth, config.cellHeight);
  }
}
