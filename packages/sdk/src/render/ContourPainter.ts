import type { Container } from 'pixi.js';
import { contourButtonGroupMargin } from './contourButtonGroup.js';
import {
  DEFAULT_CORRIDOR_CELLS,
  corridorCellsForFlood,
  corridorPx,
} from './contourCorridor.js';
import { computeFloodContours } from './floodContourEngine.js';
import type { ContourWorldTransform } from './contourWorldTransform.js';
import { DepartmentBlobView } from './DepartmentBlob.js';
import { runPointMorph, type PointMorphHandle } from './contourMorph.js';
import { paintMagneticGroups } from './paintMagneticGroups.js';
import { resolveMagnetRadius } from './magnetRadius.js';
import { cloneMemberBoxes, offsetMemberBoxesForGridMove } from './offsetMemberBoxes.js';
import { defaultRenderConfig } from './types.js';
import type {
  ContourEngine,
  DepartmentBlobStyle,
  NodeTheme,
  RenderConfig,
} from './types.js';
import type { ContourMagnetConfig, ContourPositionInput } from '../contour/bridge.js';
import type { ContourMemberBox } from './contourClearance.js';
import type { LodLevel } from './lod.js';
import type { DiagramData } from '../data/types.js';

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
  /** Which geometry paints the contour (T80). */
  engine: ContourEngine;
  /** positionId → organizationId; the flood runs per org block (local cells). */
  orgByPosition: Map<string, string>;
  /** Seat box the flood ring is snapped onto (cells are wider than cards). */
  cardWidth: number;
  cardHeight: number;
  /** G2 corridor in px for the button-group painter. */
  corridorPx: number;
  /** Rings from the Rust flood, already mapped to world space (`cell-flood`). */
  floodRingsByDept: Map<string, { x: number; y: number }[][]>;
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
  /** Cell-space → world (pitch + origin); null until staff layout resolves it. */
  worldTransform(): ContourWorldTransform | null;
  /** Card inset inside its cell, for snapping flood rings onto card bounds. */
  cardInset(): { x: number; y: number };
  reportDiagnostic(message: string): void;
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
 * Department contours: builds a session per render, paints its rings with the
 * configured engine, and morphs them while a card is dragged.
 *
 * T77-M01 Option B still holds for `button-group` — rings are computed in TS,
 * with no worker round-trip. `cell-flood` (T80) opts into one await on purpose.
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
    engine: ContourEngine;
    orgByPosition: Map<string, string>;
    cardWidth: number;
    cardHeight: number;
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
      floodRingsByDept: new Map(),
    };
    return this.session;
  }

  /** Rings for the current engine: TS button-group by default, else the flood. */
  private buildPaintRingsByDept(): Map<string, { x: number; y: number }[][]> {
    const session = this.session;
    if (!session) return new Map();
    if (session.engine === 'cell-flood') return session.floodRingsByDept;

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
    const corridorCells = config.corridorCells ?? defaultRenderConfig.corridorCells ?? DEFAULT_CORRIDOR_CELLS;
    const magnet: ContourMagnetConfig = {
      paddingCells: 0,
      // G2: the flood dilates foreign cells by whole rings; below one cell the
      // exclusion of the foreign cell itself is already the gap.
      corridorCells: corridorCellsForFlood(corridorCells),
      cellWidth: config.cellWidth,
      cellHeight: config.cellHeight,
      smoothIterations: 0,
      magnetRadius: resolveMagnetRadius(config.magnetRadius),
    };
    const lod = request.lod;
    const deptNames = new Map(data.departments.map((d) => [d.id, d.name]));
    const personCounts = countPositionsByDept(data.positions);
    const engine = config.contourEngine ?? defaultRenderConfig.contourEngine ?? 'button-group';
    const session = this.beginSession({
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
      engine,
      orgByPosition: new Map(data.positions.map((p) => [p.id, p.organizationId])),
      cardWidth: theme.person.width,
      cardHeight: theme.person.height,
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
    if (engine === 'cell-flood') {
      await this.loadFloodRings(session, magnet);
      if (!this.isCurrent(session)) return;
    }
    this.refresh(false);
  }

  private isCurrent(session: ContourSession): boolean {
    return !this.deps.isDestroyed() && this.session === session;
  }

  /**
   * `cell-flood`: Rust flood geometry (G1–G8) instead of the TS button-group.
   *
   * `gridCell` is **local to one org block**, so the flood runs per block and
   * each block's rings are mapped with its own origin — feeding every block to
   * one flood would overlay tier 1 and tier 2 on the same cell grid. Rings come
   * back in cell units and go through the transform the drag grid uses.
   */
  private async loadFloodRings(
    session: ContourSession,
    magnet: ContourMagnetConfig,
  ): Promise<void> {
    session.floodRingsByDept = new Map();
    const transform = this.deps.worldTransform();
    if (!transform) {
      this.deps.reportDiagnostic(
        'Contour flood skipped: no cell transform — positions need authored gridCell',
      );
      return;
    }

    const { ringsByDept, diagnostics } = await computeFloodContours({
      inputs: session.inputs,
      magnet,
      orgByPosition: session.orgByPosition,
      memberBoxes: [...session.memberBoxesByDept.values()].flat(),
      transform,
      cards: {
        cardWidth: session.cardWidth,
        cardHeight: session.cardHeight,
        insetX: this.deps.cardInset().x,
        insetY: this.deps.cardInset().y,
        padding: contourButtonGroupMargin(session.paintPaddingCells, session.style.strokeWidth),
      },
      personCounts: session.personCounts,
      minContourMembers: session.minContourMembers,
      isCurrent: () => this.isCurrent(session),
    });

    if (!this.isCurrent(session)) return;
    session.floodRingsByDept = ringsByDept;
    for (const message of diagnostics) this.deps.reportDiagnostic(message);
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

  /** Live preview while a card is dragged to (col,row). */
  previewDrag(positionId: string, col: number, row: number): void {
    const session = this.session;
    if (!session || col < 0 || row < 0) return;
    const prev = session.inputs.find((p) => p.id === positionId);
    const dCol = col - (prev?.col ?? col);
    const dRow = row - (prev?.row ?? row);
    session.inputs = session.inputs.map((p) => (p.id === positionId ? { ...p, col, row } : p));
    session.memberBoxesByDept = offsetMemberBoxesForGridMove(
      session.memberBoxesByDept,
      positionId,
      dCol,
      dRow,
      session.magnet.cellWidth ?? 0,
      session.magnet.cellHeight ?? 0,
    );
    session.previewGen += 1;
    this.refresh(true);
  }
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
