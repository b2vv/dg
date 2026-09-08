import type { Container } from 'pixi.js';
import { contourButtonGroupMargin } from './contourButtonGroup.js';
import { DEFAULT_CORRIDOR_CELLS, corridorPx } from './contourCorridor.js';
import { DepartmentBlobView } from './DepartmentBlob.js';
import { runPointMorph, type PointMorphHandle } from './contourMorph.js';
import { paintMagneticGroups } from './paintMagneticGroups.js';
import { resolveMagnetRadius } from '../../contour/magnetRadius.js';
import { cloneMemberBoxes, offsetMemberBoxesForGridMove } from './offsetMemberBoxes.js';
import { defaultRenderConfig } from '../types.js';
import type { DepartmentBlobStyle, NodeTheme, RenderConfig } from '../types.js';
import type { ContourMagnetConfig, ContourPositionInput } from './types.js';
import type { ContourMemberBox } from './contourClearance.js';
import type { LodLevel } from '../lod.js';
import type { DiagramData, GridCell } from '../../data/types.js';
import type { SeatDrop } from '../../interaction/positionMove.js';

const DEFAULT_MORPH_MS = 160;

interface ContourSession {
  baseInputs: ContourPositionInput[];
  inputs: ContourPositionInput[];
  magnet: ContourMagnetConfig;
  style: DepartmentBlobStyle;
  lod: LodLevel;
  morphMs: number;
  deptNames: Map<string, string>;
  personCounts: Map<string, number>;
  /** Paint only depts with at least this many positions (T46). */
  minContourMembers: number;
  /** Paint-only: demo Padding slider → px margin around card union. */
  paintPaddingCells: number;
  /** Paint-only: demo Smooth slider → corner arc segments. */
  paintSmoothIterations: number;
  /** G2 corridor in px for the button-group painter. */
  corridorPx: number;
  memberBoxesByDept: Map<string, ContourMemberBox[]>;
  baseMemberBoxesByDept: Map<string, ContourMemberBox[]>;
  blobsByDept: Map<string, DepartmentBlobView[]>;
  morphHandles: Map<DepartmentBlobView, PointMorphHandle>;
  previewGen: number;
}

/** What the painter needs from the renderer, and nothing more. */
export interface ContourPainterDeps {
  /** Fills go under the cards, strokes above them. */
  layers: { departments: Container; departmentStrokes: Container };
  isDestroyed(): boolean;
}

export interface ContourPaintRequest {
  inputs: ContourPositionInput[];
  data: DiagramData;
  theme: NodeTheme;
  config: RenderConfig;
  lod: LodLevel;
  morphMs?: number;
  memberBoxesByDept?: Map<string, ContourMemberBox[]>;
}

/**
 * Department contours: builds a session per render, paints its rings, and
 * morphs them while a card is dragged.
 *
 * T77-M01 Option B holds without exception now: rings are computed in TS, with
 * no worker round-trip and no await in the paint path. The second engine that
 * did take one — the Rust cell flood — is gone (T80), because the C-shapes it
 * existed to draw are shapes this product does not have.
 */
export class ContourPainter {
  private session: ContourSession | null = null;

  constructor(private readonly deps: ContourPainterDeps) {}

  /** True while a session owns painted blobs (drag preview needs one). */
  get hasSession(): boolean {
    return this.session !== null;
  }

  /** Drop the session and stop any in-flight morph (render entry / destroy). */
  reset(): void {
    this.cancelMorphs();
    this.session = null;
  }

  cancelMorphs(): void {
    const session = this.session;
    if (!session) return;
    for (const handle of session.morphHandles.values()) handle.cancel();
    session.morphHandles.clear();
  }
  private beginSession(args: {
    inputs: ContourPositionInput[];
    magnet: ContourMagnetConfig;
    style: DepartmentBlobStyle;
    lod: LodLevel;
    morphMs: number;
    deptNames: Map<string, string>;
    personCounts: Map<string, number>;
    minContourMembers: number;
    paintPaddingCells: number;
    paintSmoothIterations: number;
    corridorPx: number;
    memberBoxesByDept?: Map<string, ContourMemberBox[]>;
  }): ContourSession {
    this.cancelMorphs();
    const cloned = args.inputs.map((p) => ({ ...p }));
    const boxes = cloneMemberBoxes(args.memberBoxesByDept);
    this.session = {
      ...args,
      memberBoxesByDept: boxes,
      baseMemberBoxesByDept: cloneMemberBoxes(boxes),
      baseInputs: cloned.map((p) => ({ ...p })),
      inputs: cloned,
      blobsByDept: new Map(),
      morphHandles: new Map(),
      previewGen: 0,
    };
    return this.session;
  }

  /** Rings for the one engine there is: the TS button-group painter. */
  private buildPaintRingsByDept(): Map<string, { x: number; y: number }[][]> {
    const session = this.session;
    if (!session) return new Map();

    // Same painter as the SVG export — canvas and export must not drift apart.
    const painted = paintMagneticGroups({
      inputs: session.inputs,
      memberBoxesByDept: session.memberBoxesByDept,
      departmentIds: [...new Set(session.inputs.map((p) => p.departmentId))].sort(),
      magnetRadius: resolveMagnetRadius(session.magnet.magnetRadius),
      strokeWidth: session.style.strokeWidth,
      paddingCells: session.paintPaddingCells,
      smoothIterations: session.paintSmoothIterations,
      personCounts: session.personCounts,
      minContourMembers: session.minContourMembers,
      corridorPx: session.corridorPx,
    });

    const out = new Map<string, { x: number; y: number }[][]>();
    for (const group of painted) {
      const rings = out.get(group.departmentId) ?? [];
      rings.push(group.ring);
      out.set(group.departmentId, rings);
    }
    return out;
  }

  private mountDeptBlob(blob: DepartmentBlobView): void {
    this.deps.layers.departments.addChild(blob);
    this.deps.layers.departmentStrokes.addChild(blob.strokeGraphics);
  }

  private unmountDeptBlob(blob: DepartmentBlobView): void {
    this.deps.layers.departmentStrokes.removeChild(blob.strokeGraphics);
    this.deps.layers.departments.removeChild(blob);
    blob.destroy();
  }

  /** Re-run the painter for the live session; `morph` animates the change. */
  refresh(morph: boolean): void {
    const session = this.session;
    if (!session) return;

    const ringsByDept = this.buildPaintRingsByDept();

    for (const [deptId, blobs] of [...session.blobsByDept.entries()]) {
      if (ringsByDept.has(deptId)) continue;
      for (const blob of blobs) {
        session.morphHandles.get(blob)?.cancel();
        session.morphHandles.delete(blob);
        this.unmountDeptBlob(blob);
      }
      session.blobsByDept.delete(deptId);
    }

    for (const [deptId, rings] of ringsByDept) {
      let blobs = session.blobsByDept.get(deptId);
      if (!blobs) {
        blobs = [];
        session.blobsByDept.set(deptId, blobs);
      }

      const label = session.deptNames.get(deptId) ?? deptId;
      const count = session.personCounts.get(deptId);

      if (blobs.length !== rings.length) {
        for (const blob of blobs) {
          session.morphHandles.get(blob)?.cancel();
          session.morphHandles.delete(blob);
          this.unmountDeptBlob(blob);
        }
        blobs.length = 0;
        for (const ring of rings) {
          const blob = DepartmentBlobView.fromPoints(
            ring,
            label,
            session.style,
            session.lod,
            count,
          );
          blobs.push(blob);
          this.mountDeptBlob(blob);
        }
        continue;
      }

      for (let i = 0; i < rings.length; i += 1) {
        const blob = blobs[i]!;
        const to = rings[i]!;
        const from = blob.getDrawnPoints().map((p) => ({ x: p.x, y: p.y }));
        session.morphHandles.get(blob)?.cancel();
        session.morphHandles.delete(blob);

        if (!morph || session.morphMs <= 0 || from.length < 2 || to.length < 2) {
          blob.redrawPoints(to, session.style, session.lod, count);
          continue;
        }

        const handle = runPointMorph({
          from,
          to,
          durationMs: session.morphMs,
          onUpdate: (pts) => {
            blob.redrawPoints(pts, session.style, session.lod, count);
          },
        });
        session.morphHandles.set(blob, handle);
      }
    }
  }

  /** Build a session for this render and paint it. */
  async paint(request: ContourPaintRequest): Promise<void> {
    const { inputs, data, theme, config } = request;
    // Only what the painter reads back off the session: the radius that groups
    // cards, and the cell pitch the blobs are measured in.
    const magnet: ContourMagnetConfig = {
      cellWidth: config.cellWidth,
      cellHeight: config.cellHeight,
      magnetRadius: resolveMagnetRadius(config.magnetRadius),
    };
    const lod = request.lod;
    const deptNames = new Map(data.departments.map((d) => [d.id, d.name]));
    const personCounts = countPositionsByDept(data.positions);
    this.beginSession({
      inputs,
      magnet,
      style: theme.department,
      lod,
      morphMs: request.morphMs ?? DEFAULT_MORPH_MS,
      deptNames,
      personCounts,
      minContourMembers: config.minContourMembers ?? defaultRenderConfig.minContourMembers,
      paintPaddingCells: config.paddingCells,
      paintSmoothIterations: config.smoothIterations,
      corridorPx: corridorPx(
        config.corridorCells ?? defaultRenderConfig.corridorCells ?? DEFAULT_CORRIDOR_CELLS,
        {
          cellWidth: config.cellWidth,
          cellHeight: config.cellHeight,
          cardWidth: theme.person.width,
          cardHeight: theme.person.height,
        },
        contourButtonGroupMargin(config.paddingCells, theme.department.strokeWidth),
      ),
      memberBoxesByDept: request.memberBoxesByDept,
    });
    if (this.deps.isDestroyed() || !this.session) return;
    this.refresh(false);
  }

  private isCurrent(session: ContourSession): boolean {
    return !this.deps.isDestroyed() && this.session === session;
  }

  /** Drag was rejected — put the contours back where they started. */
  restoreAfterFailedDrag(): void {
    const session = this.session;
    if (!session) return;
    session.inputs = session.baseInputs.map((p) => ({ ...p }));
    session.memberBoxesByDept = cloneMemberBoxes(session.baseMemberBoxesByDept);
    session.previewGen += 1;
    this.refresh(true);
  }

  /**
   * Live preview while a card is dragged to `target` — shows the seat-drop
   * `resolveSeatDrop` already settled on (T111-K4a, plan §3), not just where
   * the dragged card landed. `push`/`swap` move **two** entries in the
   * contour model; `ask` is shown as `swap` (the one applicable preview —
   * `resolveSeatDrop`'s answer is not final for `ask`, plan §3).
   *
   * Recomputed from `session.baseInputs`/`baseMemberBoxesByDept` — the
   * authored state a session starts with and never mutates — on **every**
   * call rather than as a delta on the previous frame. A delta would drift
   * when the resolved kind changes mid-drag (push on one frame, swap the
   * next, as the pointer crosses a cell boundary): recomputing from the same
   * origin every time makes that drift structurally impossible instead of
   * merely rare.
   */
  previewDrag(positionId: string, target: GridCell, drop: SeatDrop): void {
    const session = this.session;
    if (!session || target.col < 0 || target.row < 0) return;

    const moverBase = session.baseInputs.find((p) => p.id === positionId);
    let inputs = session.baseInputs.map((p) => ({ ...p }));
    let boxes = cloneMemberBoxes(session.baseMemberBoxesByDept);

    inputs = inputs.map((p) =>
      p.id === positionId ? { ...p, col: target.col, row: target.row } : p,
    );
    if (moverBase) {
      boxes = offsetMemberBoxesForGridMove(
        boxes,
        positionId,
        target.col - moverBase.col,
        target.row - moverBase.row,
        session.magnet.cellWidth ?? 0,
        session.magnet.cellHeight ?? 0,
      );
    }

    const occupantMove = projectedOccupantMove(drop, moverBase);
    if (occupantMove) {
      const occupantBase = session.baseInputs.find((p) => p.id === occupantMove.occupantId);
      if (occupantBase) {
        inputs = inputs.map((p) =>
          p.id === occupantMove.occupantId
            ? { ...p, col: occupantMove.to.col, row: occupantMove.to.row }
            : p,
        );
        boxes = offsetMemberBoxesForGridMove(
          boxes,
          occupantMove.occupantId,
          occupantMove.to.col - occupantBase.col,
          occupantMove.to.row - occupantBase.row,
          session.magnet.cellWidth ?? 0,
          session.magnet.cellHeight ?? 0,
        );
      }
      // No entry for the occupant in this session (stale id, race with a data
      // change) — leave it untouched rather than inventing a position for it.
    }

    session.inputs = inputs;
    session.memberBoxesByDept = boxes;
    session.previewGen += 1;
    this.refresh(true);
  }

  /**
   * Test seam: this position's projected cell and member-box origin, if the
   * session currently knows about it. `ContourPainter` is not part of the
   * public barrel, so this is not public API surface.
   */
  previewState(positionId: string): { col: number; row: number; box?: { x: number; y: number } } | undefined {
    const session = this.session;
    if (!session) return undefined;
    const input = session.inputs.find((p) => p.id === positionId);
    if (!input) return undefined;
    const box = [...session.memberBoxesByDept.values()]
      .flat()
      .find((b) => b.positionId === positionId);
    return { col: input.col, row: input.row, box: box ? { x: box.x, y: box.y } : undefined };
  }
}

/**
 * Where the seat a drop displaces should preview to, given the mover's
 * authored cell. `free` displaces nobody. `push` sends the occupant to the
 * cell `resolveSeatDrop` already found free. `swap` — and `ask`, shown as a
 * swap because it is the only preview `resolveSeatDrop`'s answer supports
 * before the user picks (plan §3) — sends the occupant to the cell the mover
 * is leaving; without a known origin for the mover there is nowhere sound to
 * put the occupant, so it is left where it started.
 */
/**
 * Where the *other* seat ends up under a resolved drop, if it moves at all.
 *
 * Exported because the sprite layer (T111-K4b) has to place the neighbour's
 * card at exactly the cell this contour projection puts its member box in.
 * Two copies of this switch would be two chances for the ring and the card to
 * disagree — the very split plan §1 exists to prevent.
 *
 * `moverBase` is only read for its cell, so it is typed as such: the contour
 * session passes a `ContourPositionInput`, the renderer a `DiagramPosition`'s
 * `gridCell`, and neither needs to know about the other.
 */
export function projectedOccupantMove(
  drop: SeatDrop,
  moverBase: { col: number; row: number } | undefined,
): { occupantId: string; to: GridCell } | undefined {
  switch (drop.kind) {
    case 'free':
      return undefined;
    case 'push':
      return { occupantId: drop.occupantId, to: drop.to };
    case 'swap':
    case 'ask':
      return moverBase ? { occupantId: drop.occupantId, to: { col: moverBase.col, row: moverBase.row } } : undefined;
    default:
      return assertNeverSeatDrop(drop);
  }
}

function assertNeverSeatDrop(x: never): never {
  throw new Error(`Unexpected SeatDrop kind: ${String((x as SeatDrop).kind)}`);
}

/** Seats per department — drives `minContourMembers` and the blob badge. */
function countPositionsByDept(positions: DiagramData['positions']): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of positions) {
    if (!p.departmentId) continue;
    map.set(p.departmentId, (map.get(p.departmentId) ?? 0) + 1);
  }
  return map;
}
