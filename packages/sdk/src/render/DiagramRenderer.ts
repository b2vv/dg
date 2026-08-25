import { Container, Graphics } from 'pixi.js';
import {
  type ContourMagnetConfig,
  type ContourPositionInput,
  type DeptContourResult,
} from '../contour/bridge.js';
import { computeAllContours } from '../contour/bridge.js';
import { filterContoursForPaint } from './contourPaintFilter.js';
import { contourSceneInputs, matrixNodeBoxes } from './contourInputs.js';
import { mapFloodRingToCards, type FloodCardGeometry } from './floodRingCards.js';
import { contourButtonGroupMargin } from './contourButtonGroup.js';
import {
  corridorCellsForFlood,
  corridorPx,
  DEFAULT_CORRIDOR_CELLS,
} from './contourCorridor.js';
import { layoutStaffCanvas } from '../layout/staff/canvasLayout.js';
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
import type { OrgLayoutOptions } from '../layout/types.js';
import { isOrgCollapsed, orgHasChildren } from '../layout/orgMode.js';
import { snapToGrid, snapWorldToCell } from '../interaction/positionMove.js';
import { DoubleTapTracker } from '../interaction/doubleTap.js';
import {
  isPrimaryPointerTap,
  isSelectionToggleModifier,
  readSelectionPointerMods,
  type SelectionPointerMods,
} from '../interaction/selection.js';
import type { NodeRef } from '../interaction/types.js';
import {
  nodeEntityKey,
  parseNodeEntityKey,
  promoteIdMatches,
} from './promoteMath.js';
import { DepartmentBlobView } from './DepartmentBlob.js';
import { DepartmentCardView, paintDashedFrame } from './DepartmentCardView.js';
import { StaffZonesView } from './StaffZonesView.js';
import { enrichStaffTierBands, unionBoxes } from './staffZoneBounds.js';
import { OrgEdgesView } from './OrgEdgesView.js';
import { StaffEdgesView } from './StaffEdgesView.js';
import { PersonNodeView } from './PersonNode.js';
import { OrganizationNodeView } from './OrganizationNode.js';
import { runPointMorph, type PointMorphHandle } from './contourMorph.js';
import type {
  ContourEngine,
  DepartmentBlobStyle,
  DepartmentCardStyle,
  NodeTheme,
  RenderConfig,
  StaffZoneStyle,
} from './types.js';
import { defaultRenderConfig } from './types.js';
import type { DiagramData, DiagramOrganization } from '../data/types.js';
import type { LodLevel } from './lod.js';
import { mapStaffEdgeBoxesForLod, mapPositionNodesToStaffEdgeBoxes } from './visualEdgeBox.js';
import {
  resolveContourWorldTransform,
  type ContourWorldTransform,
} from './contourWorldTransform.js';
import {
  type ContourMemberBox,
} from './contourClearance.js';
import { paintMagneticGroups } from './paintMagneticGroups.js';
import { resolveMagnetRadius } from './magnetRadius.js';
import { inferStaffCurrentOrgId } from './inferStaffCurrentOrgId.js';
import { offsetMemberBoxesForGridMove, cloneMemberBoxes } from './offsetMemberBoxes.js';

export type ContourComputer = (
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
) => Promise<DeptContourResult[]>;

export interface RenderOptions {
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
    pointer: { clientX: number; clientY: number; canvasX: number; canvasY: number },
  ) => void;
  onOrgContextMenu?: (
    orgId: string,
    pointer: { clientX: number; clientY: number; canvasX: number; canvasY: number },
  ) => void;
  onOrgExpand?: (orgId: string) => void;
  onOrgCollapse?: (orgId: string) => void;
  onPersonDragEnd?: (positionId: string, col: number, row: number) => void;
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
  loadTexture?: import('./nodeMedia.js').NodeTextureLoader;
}

export interface NodeWorldBox {
  id: string;
  kind: 'person' | 'organization' | 'position';
  x: number;
  y: number;
  width: number;
  height: number;
}

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

export class LayerManager {
  readonly root = new Container();
  /** T64 named zones under department chrome / cards. */
  readonly zones = new Container();
  readonly departments = new Container();
  readonly edges = new Container();
  readonly organizations = new Container();
  readonly persons = new Container();
  /** Contour strokes above cards so corridor outlines stay visible / stable. */
  readonly departmentStrokes = new Container();
  readonly overlay = new Container();

  constructor() {
    this.root.addChild(
      this.zones,
      this.departments,
      this.edges,
      this.organizations,
      this.persons,
      this.departmentStrokes,
      this.overlay,
    );
    // Edges/strokes/zones are paint-only — must not steal hits from node chrome underneath.
    this.edges.eventMode = 'none';
    this.departmentStrokes.eventMode = 'none';
    this.zones.eventMode = 'none';
  }

  clear(): void {
    this.destroyLayerChildren(this.zones);
    this.destroyLayerChildren(this.departments);
    this.destroyLayerChildren(this.edges);
    this.destroyLayerChildren(this.organizations);
    this.destroyLayerChildren(this.persons);
    this.destroyLayerChildren(this.departmentStrokes);
    this.destroyLayerChildren(this.overlay);
  }

  /** T75 D3: removeChildren alone leaks GPU; destroy detached views. */
  private destroyLayerChildren(layer: Container): void {
    const removed = layer.removeChildren();
    for (const child of removed) {
      child.destroy({ children: true });
    }
  }
}

const DEFAULT_MORPH_MS = 160;

export class DiagramRenderer {
  readonly layers = new LayerManager();
  private destroyed = false;
  /** Bumped at each render entry; stale async passes bail after await (T75 D2). */
  private renderEpoch = 0;
  private nodeBoxes = new Map<string, NodeWorldBox>();
  /** Pixi views keyed by node/position/org id — for promote hide/show. */
  private nodeViews = new Map<string, Container>();
  /** T74 M1: media URL → views that can reloadMedia() after invalidate. */
  private mediaUrlViews = new Map<string, Set<{ reloadMedia: () => Promise<void> }>>();
  private promotedIds = new Set<string>();
  private contourSession: ContourSession | null = null;
  private lastDiagnostics: string[] = [];
  /** Contour cell-space → staff world (pitch + origin). */
  private contourWorld: ContourWorldTransform | null = null;
  /** Active grid for person drag snap (staff pitch or bare cell). */
  private dragGrid: {
    pitchX: number;
    pitchY: number;
    originX: number;
    originY: number;
    insetX: number;
    insetY: number;
  } | null = null;
  private drag: {
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
    snapGrid: {
      pitchX: number;
      pitchY: number;
      originX: number;
      originY: number;
      insetX: number;
      insetY: number;
    } | null;
  } | null = null;
  /** Body double-tap tracker (T69); chrome / canvas resets it. */
  private readonly nodeDoubleTap = new DoubleTapTracker();

  mount(stage: Container): void {
    stage.addChild(this.layers.root);
  }

  getNodeBox(id: string): NodeWorldBox | undefined {
    const direct = this.nodeBoxes.get(id);
    if (direct) return direct;
    const parsed = parseNodeEntityKey(id);
    if (parsed) {
      return (
        this.nodeBoxes.get(nodeEntityKey(parsed.kind, parsed.id)) ??
        this.nodeBoxes.get(parsed.id)
      );
    }
    return (
      this.nodeBoxes.get(nodeEntityKey('position', id)) ??
      this.nodeBoxes.get(nodeEntityKey('organization', id)) ??
      this.nodeBoxes.get(nodeEntityKey('person', id))
    );
  }

  /** Soft layout warnings from the last successful `render` (may be empty). */
  getLayoutDiagnostics(): readonly string[] {
    return this.lastDiagnostics;
  }

  listNodeBoxes(): readonly NodeWorldBox[] {
    return [...this.nodeBoxes.values()];
  }

  /**
   * Hide Pixi views for ids that are promoted to HTML (avoids double paint).
   * Call after render or when the promote set changes.
   */
  setPromotedNodeIds(ids: readonly string[]): void {
    this.promotedIds = new Set(ids);
    this.applyPromoteVisibility();
  }

  getPromotedNodeIds(): readonly string[] {
    return [...this.promotedIds];
  }

  private registerView(kind: NodeWorldBox['kind'], id: string, view: Container): void {
    const key = nodeEntityKey(kind, id);
    this.nodeViews.set(key, view);
    view.visible = !this.isPromotedKey(key);
  }

  private isPromotedKey(key: string): boolean {
    if (this.promotedIds.has(key)) return true;
    return promoteIdMatches(this.promotedIds, key);
  }

  private registerMediaView(
    url: string | undefined,
    view: { reloadMedia: () => Promise<void> },
  ): void {
    const trimmed = url?.trim();
    if (!trimmed) return;
    let set = this.mediaUrlViews.get(trimmed);
    if (!set) {
      set = new Set();
      this.mediaUrlViews.set(trimmed, set);
    }
    set.add(view);
  }

  /**
   * T74 M1: after MediaService.invalidate — reload textures on live sprites
   * without a full scene rebuild.
   */
  async refreshMediaUrls(urls: readonly string[]): Promise<void> {
    if (this.destroyed) return;
    const seen = new Set<{ reloadMedia: () => Promise<void> }>();
    for (const raw of urls) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      for (const view of this.mediaUrlViews.get(trimmed) ?? []) {
        seen.add(view);
      }
    }
    await Promise.all([...seen].map((v) => v.reloadMedia()));
  }

  private applyPromoteVisibility(): void {
    for (const [id, view] of this.nodeViews) {
      view.visible = !this.isPromotedKey(id);
    }
  }

  /** Axis-aligned union of remembered node boxes (world space). */
  getContentBounds(): { x: number; y: number; width: number; height: number } | null {
    if (this.nodeBoxes.size === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const box of this.nodeBoxes.values()) {
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  async render(
    data: DiagramData,
    theme: NodeTheme,
    resolvedTheme: 'light' | 'dark',
    config: RenderConfig = defaultRenderConfig,
    options: RenderOptions = {},
  ): Promise<void> {
    if (this.destroyed) return;
    const epoch = ++this.renderEpoch;
    this.cancelContourMorphs();
    this.contourSession = null;
    this.contourWorld = null;
    this.dragGrid = null;
    this.layers.clear();
    this.nodeBoxes.clear();
    this.nodeViews.clear();
    this.mediaUrlViews.clear();
    this.lastDiagnostics = [];
    this.drag = null;

    this.layers.root.eventMode = 'static';
    this.layers.root.removeAllListeners('pointertap');
    this.layers.root.on('pointertap', () => {
      this.nodeDoubleTap.reset();
      options.onCanvasClick?.();
    });

    const lod = options.lod ?? 'near';
    const hasStaff = data.positions.length > 0;
    if (hasStaff) {
      await this.renderStaff(data, theme, resolvedTheme, config, { ...options, lod }, epoch);
    } else if (data.organizations.length > 0) {
      await this.renderOrganizations(data, theme, resolvedTheme, config, { ...options, lod }, epoch);
    }
    if (!this.isRenderCurrent(epoch)) return;

    this.drawSelection(options.selected ?? []);
    this.applyPromoteVisibility();
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

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.renderEpoch += 1;
    this.cancelContourMorphs();
    this.contourSession = null;
    this.layers.clear();
    this.layers.root.destroy({ children: true });
  }

  private cancelContourMorphs(): void {
    const session = this.contourSession;
    if (!session) return;
    for (const handle of session.morphHandles.values()) handle.cancel();
    session.morphHandles.clear();
  }

  private normalizeSelected(
    selected: NodeRef | null | readonly NodeRef[] | undefined,
  ): readonly NodeRef[] {
    if (!selected) return [];
    if (Array.isArray(selected)) return selected as readonly NodeRef[];
    return [selected as NodeRef];
  }

  private drawSelection(selected: NodeRef | null | readonly NodeRef[]): void {
    for (const node of this.normalizeSelected(selected)) {
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
    const key = parseNodeEntityKey(box.id) ? box.id : nodeEntityKey(box.kind, box.id);
    this.nodeBoxes.set(key, { ...box, id: key });
  }

  private beginContourSession(args: {
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
    this.cancelContourMorphs();
    const cloned = args.inputs.map((p) => ({ ...p }));
    const boxes = cloneMemberBoxes(args.memberBoxesByDept);
    this.contourSession = {
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
    return this.contourSession;
  }

  /** Rings for the current engine: TS button-group by default, else the flood. */
  private buildPaintRingsByDept(): Map<string, { x: number; y: number }[][]> {
    const session = this.contourSession;
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
    this.layers.departments.addChild(blob);
    this.layers.departmentStrokes.addChild(blob.strokeGraphics);
  }

  private unmountDeptBlob(blob: DepartmentBlobView): void {
    this.layers.departmentStrokes.removeChild(blob.strokeGraphics);
    this.layers.departments.removeChild(blob);
    blob.destroy();
  }

  private refreshContourPaint(morph: boolean): void {
    const session = this.contourSession;
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

  private async paintContours(
    inputs: ContourPositionInput[],
    data: DiagramData,
    theme: NodeTheme,
    config: RenderConfig,
    options: RenderOptions,
  ): Promise<void> {
    // T77-M01 Option B still holds for `button-group`: rings are computed in
    // TS, no round-trip. `cell-flood` (T80) opts into one await on purpose.
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
    const lod = options.lod ?? 'near';
    const deptNames = new Map(data.departments.map((d) => [d.id, d.name]));
    const personCounts = countPositionsByDept(data.positions);
    const engine = config.contourEngine ?? defaultRenderConfig.contourEngine ?? 'button-group';
    const session = this.beginContourSession({
      inputs,
      magnet,
      style: theme.department,
      lod,
      morphMs: options.contourMorphMs ?? DEFAULT_MORPH_MS,
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
      memberBoxesByDept: options.contourMemberBoxesByDept,
    });
    if (this.destroyed || !this.contourSession) return;
    if (engine === 'cell-flood') {
      await this.loadFloodRings(session, magnet);
      if (this.destroyed || this.contourSession !== session) return;
    }
    this.refreshContourPaint(false);
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
    const transform = this.contourWorld;
    if (!transform) {
      this.reportContourDiagnostic(
        'Contour flood skipped: no cell transform — positions need authored gridCell',
      );
      return;
    }
    const boxById = new Map(
      [...session.memberBoxesByDept.values()].flat().map((b) => [b.positionId, b]),
    );

    for (const [, inputs] of groupInputsByOrg(session.inputs, session.orgByPosition)) {
      const cellById = new Map(inputs.map((p) => [p.id, { gridCell: { col: p.col, row: p.row } }]));
      const nodes = inputs
        .map((p) => boxById.get(p.id))
        .filter((b): b is NonNullable<typeof b> => !!b)
        .map((b) => ({ id: b.positionId, x: b.x, y: b.y, width: b.width, height: b.height }));
      const blockTransform = resolveContourWorldTransform(
        nodes,
        cellById,
        transform.cellWidth,
        transform.cellHeight,
        transform.pitchX,
        transform.pitchY,
      );

      let contours: DeptContourResult[];
      try {
        contours = await computeAllContours(inputs, magnet);
      } catch (err) {
        this.reportContourDiagnostic(
          `Contour flood unavailable: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
      if (this.destroyed || this.contourSession !== session) return;

      // Cells are wider than the seats inside them, so the ring is snapped onto
      // the card rectangle + the same padding the button-group wash uses —
      // otherwise the contour hangs a whole gap away on the right and bottom.
      const cards: FloodCardGeometry = {
        pitchX: blockTransform.pitchX,
        pitchY: blockTransform.pitchY,
        cellWidth: blockTransform.cellWidth,
        cellHeight: blockTransform.cellHeight,
        originX: blockTransform.originX,
        originY: blockTransform.originY,
        cardWidth: session.cardWidth,
        cardHeight: session.cardHeight,
        insetX: this.dragGrid?.insetX ?? 0,
        insetY: this.dragGrid?.insetY ?? 0,
        padding: contourButtonGroupMargin(session.paintPaddingCells, session.style.strokeWidth),
      };

      for (const contour of filterContoursForPaint(
        contours,
        session.personCounts,
        session.minContourMembers,
      )) {
        if (contour.points.length < 3) continue;
        const rings = session.floodRingsByDept.get(contour.departmentId) ?? [];
        rings.push(mapFloodRingToCards(contour.points, cards));
        session.floodRingsByDept.set(contour.departmentId, rings);
      }
    }
  }

  /**
   * An empty contour layer with a silent console is the kind of quiet lie this
   * repo bans — every reason the flood produced nothing goes to
   * `getLayoutDiagnostics()`, which the host receives after each render.
   */
  private reportContourDiagnostic(message: string): void {
    this.lastDiagnostics = [...this.lastDiagnostics, message];
  }

  private async restoreContoursAfterFailedDrag(): Promise<void> {
    const session = this.contourSession;
    if (!session) return;
    session.inputs = session.baseInputs.map((p) => ({ ...p }));
    session.memberBoxesByDept = cloneMemberBoxes(session.baseMemberBoxesByDept);
    session.previewGen += 1;
    this.refreshContourPaint(true);
  }

  private async previewDragContours(positionId: string, col: number, row: number): Promise<void> {
    const session = this.contourSession;
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
    this.refreshContourPaint(true);
  }

  private bindPersonInteractions(
    node: PersonNodeView,
    personId: string | undefined,
    positionId: string,
    box: NodeWorldBox,
    config: RenderConfig,
    options: RenderOptions,
    gridCell?: { col: number; row: number },
  ): void {
    this.rememberBox(box);

    node.on('pointertap', (e) => {
      if (!isPrimaryPointerTap(e)) return;
      if (this.drag?.moved) return;
      if (node.activateChromePointer(e)) {
        this.nodeDoubleTap.reset();
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
      const mods = readSelectionPointerMods(e);
      // Modifier+click toggles set membership — do not feed double-tap expand (T69).
      if (isSelectionToggleModifier(mods)) {
        this.nodeDoubleTap.reset();
        options.onPersonClick?.(personId, positionId, mods);
        return;
      }
      const kind = this.nodeDoubleTap.tap(`person:${personId ?? ''}:${positionId}`);
      if (kind === 'double') {
        if (personId) options.onPersonDoubleClick?.(personId, positionId);
        return;
      }
      options.onPersonClick?.(personId, positionId, mods);
    });

    node.on('rightclick', (e) => {
      e.stopPropagation();
      e.preventDefault?.();
      options.onPersonContextMenu?.(personId ?? '', positionId, {
        clientX: e.clientX,
        clientY: e.clientY,
        canvasX: e.global.x,
        canvasY: e.global.y,
      });
    });

    node.on('pointerdown', (e) => {
      if (node.isChromePointer(e)) {
        e.stopPropagation();
        return;
      }
      const local = this.layers.persons.toLocal(e.global);
      // T78-L1: origin from THIS card's world + gridCell, not the first staff tier.
      let snapGrid: typeof this.drag extends null ? never : NonNullable<typeof this.drag>['snapGrid'] =
        this.dragGrid;
      if (this.dragGrid && gridCell) {
        snapGrid = {
          ...this.dragGrid,
          originX: node.x - gridCell.col * this.dragGrid.pitchX - this.dragGrid.insetX,
          originY: node.y - gridCell.row * this.dragGrid.pitchY - this.dragGrid.insetY,
        };
      }
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
      const local = this.layers.persons.toLocal(e.global);
      const nx = local.x - this.drag.grabOffsetX;
      const ny = local.y - this.drag.grabOffsetY;
      if (Math.hypot(nx - this.drag.originX, ny - this.drag.originY) > 4) {
        this.drag.moved = true;
      }
      node.position.set(nx, ny);
      if (!this.drag.moved) return;
      const snap = this.snapPersonDrag(nx, ny, config);
      if (snap.col < 0 || snap.row < 0) return;
      if (snap.col === this.drag.previewCol && snap.row === this.drag.previewRow) return;
      this.drag.previewCol = snap.col;
      this.drag.previewRow = snap.row;
      void this.previewDragContours(positionId, snap.col, snap.row);
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
      const snap = this.snapPersonDrag(node.x, node.y, config);
      if (snap.col < 0 || snap.row < 0) {
        node.position.set(originX, originY);
        void this.restoreContoursAfterFailedDrag();
        return;
      }
      options.onPersonDragEnd?.(positionId, snap.col, snap.row);
    };

    node.on('pointerup', endDrag);
    node.on('pointerupoutside', endDrag);
  }

  private snapPersonDrag(
    x: number,
    y: number,
    config: RenderConfig,
  ): { col: number; row: number } {
    const grid = this.drag?.snapGrid ?? this.dragGrid;
    if (grid) {
      return snapWorldToCell(x, y, grid);
    }
    return snapToGrid(x, y, config.cellWidth, config.cellHeight);
  }

  private async renderStaff(
    data: DiagramData,
    theme: NodeTheme,
    resolvedTheme: 'light' | 'dark',
    config: RenderConfig,
    options: RenderOptions,
    epoch: number,
  ): Promise<void> {
    const currentOrgId = options.staff?.currentOrgId ?? inferStaffCurrentOrgId(data);

    if (currentOrgId && data.organizations.some((o) => o.id === currentOrgId)) {
      const staffOpts: StaffLayoutOptions = {
        // Keep staff boxes on the same pitch as contour cells.
        nodeWidth: theme.person.width,
        nodeHeight: theme.person.height,
        refCellWidth: config.cellWidth,
        refCellHeight: config.cellHeight,
        ...options.staff?.layout,
        expandedOrgIds: options.staff?.expandedOrgIds ?? options.staff?.layout?.expandedOrgIds,
      };
      const canvas = await layoutStaffCanvas(
        {
          organizations: data.organizations,
          positions: data.positions,
          reports: data.reportLines,
          groups: data.groups,
          departments: data.departments,
          persons: data.persons,
        },
        currentOrgId,
        staffOpts,
      );
      if (!this.isRenderCurrent(epoch)) return;

      this.lastDiagnostics = [...canvas.diagnostics];

      const personById = new Map(data.persons.map((p) => [p.id, p]));
      const positionById = new Map(data.positions.map((p) => [p.id, p]));
      const staffMerged = { ...DEFAULT_STAFF_LAYOUT_OPTIONS, ...staffOpts };
      const pitchX = staffMerged.refCellWidth + staffMerged.horizontalGap;
      const pitchY = staffMerged.refCellHeight + staffMerged.verticalGap;
      const insetX = (staffMerged.refCellWidth - theme.person.width) / 2;
      const insetY = (staffMerged.refCellHeight - theme.person.height) / 2;
      this.dragGrid = {
        pitchX,
        pitchY,
        originX: 0,
        originY: 0,
        insetX,
        insetY,
      };

      if (config.staffZoneChrome) {
        // The org block wraps the department wrappers, not the bare seats.
        const contentPadding = departmentWrapperPadding(theme, config);
        const tiers = enrichStaffTierBands(
          canvas.tiers,
          canvas.positionNodes,
          canvas.orgCards,
          data.organizations,
          { margin: staffMerged.margin, canvasWidth: canvas.width, contentPadding },
        );
        this.layers.zones.addChild(
          StaffZonesView.fromCanvas({
            tiers,
            positionNodes: canvas.positionNodes,
            orgCards: canvas.orgCards,
            style: resolveStaffZoneStyle(theme, resolvedTheme),
            margin: staffMerged.margin,
            canvasWidth: canvas.width,
            contentPadding,
          }),
        );
      }

      // Contours only for authored grid cells — remapping tree/hybrid world
      // coords into the cell grid produces crooked “macaroni” blobs.
      const { inputs: contourInputs, memberBoxesByDept } = contourSceneInputs(
        canvas.positionNodes,
        positionById,
      );

      const deptStyle = config.departmentStyle ?? defaultRenderConfig.departmentStyle ?? 'blob';
      if (deptStyle === 'card') {
        this.paintDepartmentCards(data, theme, config, memberBoxesByDept);
      } else if (contourInputs.length === 0 && canvas.positionNodes.length > 0) {
        // Blob mode without authored cells paints nothing — say so instead of
        // leaving the host to wonder where the contours went.
        this.reportContourDiagnostic(
          `Contours skipped: ${canvas.positionNodes.length} seats have no gridCell (departmentStyle: 'blob' needs authored coords)`,
        );
      } else if (contourInputs.length > 0) {
        this.contourWorld = resolveContourWorldTransform(
          canvas.positionNodes,
          positionById,
          config.cellWidth,
          config.cellHeight,
          pitchX,
          pitchY,
        );
        this.dragGrid = {
          pitchX: this.contourWorld.pitchX,
          pitchY: this.contourWorld.pitchY,
          originX: this.contourWorld.originX,
          originY: this.contourWorld.originY,
          insetX,
          insetY,
        };
        await this.paintContours(contourInputs, data, theme, config, {
          ...options,
          contourMemberBoxesByDept: memberBoxesByDept,
        });
        if (!this.isRenderCurrent(epoch)) return;
      }

      if (config.dashedGridFrame) {
        const frame = unionBoxes(
          canvas.positionNodes.map((n) => ({
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
          })),
          6,
        );
        if (frame) {
          const zoneStyle = resolveStaffZoneStyle(theme, resolvedTheme);
          paintDashedFrame(this.layers.zones, frame, {
            color: zoneStyle.stroke,
            borderRadius: zoneStyle.borderRadius,
          });
        }
      }

      const lod = options.lod ?? 'near';
      const edgeBoxes = mapStaffEdgeBoxesForLod(
        mapPositionNodesToStaffEdgeBoxes(canvas.positionNodes, positionById, theme.person),
        canvas.orgCards.map((c) => ({
          id: c.orgId,
          x: c.x,
          y: c.y,
          width: c.width,
          height: c.height,
        })),
        lod,
      );
      this.layers.edges.addChild(
        StaffEdgesView.fromLayout(canvas.edges, edgeBoxes, {
          theme: resolvedTheme,
          edge: theme.edge,
        }),
      );

      const staffLayoutOpts = {
        ...DEFAULT_STAFF_LAYOUT_OPTIONS,
        ...options.staff?.layout,
        expandedOrgIds: options.staff?.expandedOrgIds ?? options.staff?.layout?.expandedOrgIds,
      };
      const expandedPosIds = new Set(staffLayoutOpts.expandedPositionIds ?? []);
      const collapsePositions = staffLayoutOpts.collapseUnexpandedPositions === true;
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
        const position = positionById.get(n.id);
        if (!position) continue;
        const person = position.personId ? personById.get(position.personId) : undefined;
        const personStyle = {
          ...theme.person,
          width: n.width,
          height: n.height,
        };
        const kids = childrenFor(position.organizationId).get(position.id) ?? [];
        const showExpand = collapsePositions && kids.length > 0 && !!options.onPositionExpandToggle;
        const node = PersonNodeView.create(person, position, personStyle, lod, {
          loadTexture: options.loadTexture,
          onContextMenu: options.onPersonContextMenu
            ? (pointer) =>
                options.onPersonContextMenu!(
                  position.personId ?? '',
                  position.id,
                  {
                    ...pointer,
                    canvasX: 0,
                    canvasY: 0,
                  },
                )
            : undefined,
          expand: showExpand
            ? {
                hasChildren: true,
                expanded: isPositionExpanded(position, expandedPosIds),
                onToggle: () => options.onPositionExpandToggle!(position.id),
              }
            : undefined,
        });
        node.position.set(n.x, n.y);
        this.bindPersonInteractions(
          node,
          position.personId,
          position.id,
          {
            id: position.id,
            kind: 'position',
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
          },
          config,
          options,
          position.gridCell,
        );
        this.layers.persons.addChild(node);
        this.registerView('position', position.id, node);
        this.registerMediaView(node.resolvedPhotoUrl, node);
      }

      for (const card of canvas.orgCards) {
        const org = data.organizations.find((o) => o.id === card.orgId);
        if (!org) continue;
        const orgStyle = {
          ...theme.organization,
          width: card.width,
          height: card.height,
        };
        const gojsVertical = orgStyle.orgCardLayout === 'gojs-vertical';
        if (gojsVertical && card.expanded) {
          // C2: expanded sub-org is a positions container — no empty org card chrome.
          continue;
        }
        const view = OrganizationNodeView.create(
          org,
          undefined,
          resolvedTheme,
          orgStyle,
          lod,
          this.orgStaffCardOptions(org, card, options, config),
        );
        view.position.set(card.x, card.y);
        view.eventMode = 'static';
        view.cursor = 'pointer';
        this.rememberBox({
          id: card.orgId,
          kind: 'organization',
          x: card.x,
          y: card.y,
          width: card.width,
          height: card.height,
        });
        this.registerView('organization', card.orgId, view);
        this.registerMediaView(view.resolvedSymbolUrl, view);
        view.on('pointertap', (e) => {
          if (!isPrimaryPointerTap(e)) return;
          if (view.activateChromePointer(e)) {
            this.nodeDoubleTap.reset();
            e.stopPropagation();
            return;
          }
          e.stopPropagation();
          const mods = readSelectionPointerMods(e);
          if (isSelectionToggleModifier(mods)) {
            this.nodeDoubleTap.reset();
            options.onOrgClick?.(card.orgId, mods);
            return;
          }
          const kind = this.nodeDoubleTap.tap(`org:${card.orgId}`);
          if (kind === 'double') {
            options.onOrgDoubleClick?.(card.orgId);
            return;
          }
          if (options.onStaffOrgExpandToggle) {
            options.onStaffOrgExpandToggle(card.orgId);
          } else {
            options.onStaffOrgDrill?.(card.orgId);
          }
          options.onOrgClick?.(card.orgId, mods);
        });
        view.on('pointerdown', (e) => {
          if (view.isChromePointer(e)) {
            e.stopPropagation();
            return;
          }
          e.stopPropagation();
        });
        view.on('rightclick', (e) => {
          e.stopPropagation();
          e.preventDefault?.();
          options.onOrgContextMenu?.(card.orgId, {
            clientX: e.clientX,
            clientY: e.clientY,
            canvasX: e.global.x,
            canvasY: e.global.y,
          });
        });
        this.layers.organizations.addChild(view);
      }
      return;
    }

    const insetX = (config.cellWidth - theme.person.width) / 2;
    const insetY = (config.cellHeight - theme.person.height) / 2;

    // T78-C2: same member AABB path as staff — button-group needs boxes.
    const { inputs: contourInputs, memberBoxesByDept } = contourSceneInputs(
      matrixNodeBoxes(data.positions, {
        cellWidth: config.cellWidth,
        cellHeight: config.cellHeight,
        cardWidth: theme.person.width,
        cardHeight: theme.person.height,
      }),
      new Map(data.positions.map((p) => [p.id, p])),
    );

    await this.paintContours(contourInputs, data, theme, config, {
      ...options,
      contourMemberBoxesByDept: memberBoxesByDept,
    });

    this.dragGrid = {
      pitchX: config.cellWidth,
      pitchY: config.cellHeight,
      originX: 0,
      originY: 0,
      insetX,
      insetY,
    };

    const personById = new Map(data.persons.map((p) => [p.id, p]));
    for (const position of data.positions) {
      if (!position.gridCell) continue;
      const person = position.personId ? personById.get(position.personId) : undefined;
      const node = PersonNodeView.create(person, position, theme.person, options.lod ?? 'near', {
        loadTexture: options.loadTexture,
        onContextMenu: options.onPersonContextMenu
          ? (pointer) =>
              options.onPersonContextMenu!(position.personId ?? '', position.id, {
                ...pointer,
                canvasX: 0,
                canvasY: 0,
              })
          : undefined,
      });
      const x = position.gridCell.col * config.cellWidth + insetX;
      const y = position.gridCell.row * config.cellHeight + insetY;
      node.position.set(x, y);
      this.bindPersonInteractions(
        node,
        position.personId,
        position.id,
        {
          id: position.id,
          kind: 'position',
          x,
          y,
          width: theme.person.width,
          height: theme.person.height,
        },
        config,
        options,
        position.gridCell,
      );
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
  ): Promise<void> {
    const layout = await computeOrgLayout(
      data.organizations,
      data.orgLinks ?? [],
      options.orgLayout,
    );
    if (!this.isRenderCurrent(epoch)) return;

    const edgesView = OrgEdgesView.fromEdges(layout.edges, {
      color: resolvedTheme === 'dark' ? 0x64748b : 0x94a3b8,
      ...theme.edge,
    });
    this.layers.edges.addChild(edgesView);

    if (config.orgSiblingGroupChrome) {
      const orgById = new Map(data.organizations.map((o) => [o.id, o]));
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

    const orgById = new Map(data.organizations.map((o) => [o.id, o]));
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
        this.orgTreeOptions(org, data, options, config),
      );
      node.position.set(ln.x, ln.y);
      this.rememberBox({
        id: org.id,
        kind: 'organization',
        x: ln.x,
        y: ln.y,
        width: ln.width,
        height: ln.height,
      });
      node.on('pointertap', (e) => {
        if (!isPrimaryPointerTap(e)) return;
        if (node.activateChromePointer(e)) {
          this.nodeDoubleTap.reset();
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
        const mods = readSelectionPointerMods(e);
        if (isSelectionToggleModifier(mods)) {
          this.nodeDoubleTap.reset();
          options.onOrgClick?.(org.id, mods);
          return;
        }
        const kind = this.nodeDoubleTap.tap(`org:${org.id}`);
        if (kind === 'double') {
          options.onOrgDoubleClick?.(org.id);
          return;
        }
        options.onOrgClick?.(org.id, mods);
      });
      node.on('pointerdown', (e) => {
        if (node.isChromePointer(e)) {
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
      });
      node.on('rightclick', (e) => {
        e.stopPropagation();
        e.preventDefault?.();
        options.onOrgContextMenu?.(org.id, {
          clientX: e.clientX,
          clientY: e.clientY,
          canvasX: e.global.x,
          canvasY: e.global.y,
        });
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
      const card = DepartmentCardView.fromMembers(dept, members, style, {
        minMembers,
      });
      if (card) this.layers.departments.addChild(card);
    }
  }

  private orgTreeOptions(
    org: DiagramOrganization,
    data: DiagramData,
    options: RenderOptions,
    config: RenderConfig = defaultRenderConfig,
  ): import('./OrganizationNode.js').OrganizationNodeOptions {
    const base: import('./OrganizationNode.js').OrganizationNodeOptions = {
      loadTexture: options.loadTexture,
      prefetchInactiveSymbol: config.prefetchInactiveOrgSymbol === true,
    };
    if (
      !options.onOrgContextMenu &&
      !options.onOrgExpand &&
      !options.onOrgCollapse
    ) {
      return base;
    }
    const hasChildren = orgHasChildren(data.organizations, org.id);
    const openMenu = (pointer: { clientX: number; clientY: number }) => {
      options.onOrgContextMenu?.(org.id, {
        clientX: pointer.clientX,
        clientY: pointer.clientY,
        canvasX: 0,
        canvasY: 0,
      });
    };
    return {
      ...base,
      onContextMenu: options.onOrgContextMenu ? openMenu : undefined,
      chrome:
        hasChildren && (options.onOrgExpand || options.onOrgCollapse)
          ? {
              kind: 'tree',
              collapsed: isOrgCollapsed(org),
              hasChildren,
              onExpand: () => options.onOrgExpand?.(org.id),
              onCollapse: () => options.onOrgCollapse?.(org.id),
            }
          : undefined,
    };
  }

  private orgStaffCardOptions(
    org: DiagramOrganization,
    card: { expanded?: boolean },
    options: RenderOptions,
    config: RenderConfig = defaultRenderConfig,
  ): import('./OrganizationNode.js').OrganizationNodeOptions {
    const openMenu = (pointer: { clientX: number; clientY: number }) => {
      options.onOrgContextMenu?.(org.id, {
        clientX: pointer.clientX,
        clientY: pointer.clientY,
        canvasX: 0,
        canvasY: 0,
      });
    };
    return {
      loadTexture: options.loadTexture,
      onContextMenu: options.onOrgContextMenu ? openMenu : undefined,
      prefetchInactiveSymbol: config.prefetchInactiveOrgSymbol === true,
      chrome:
        options.onStaffOrgExpandToggle
          ? {
              kind: 'staff-expand',
              expanded: card.expanded ?? false,
              onToggle: () => options.onStaffOrgExpandToggle!(org.id),
            }
          : undefined,
    };
  }
}

/**
 * How far a department wrapper reaches past its seats: the magnetic wash margin
 * for contours, or the card padding plus its label row for `departmentStyle:
 * 'card'`. Applied on every side — a per-side inset would only matter for the
 * card's label row, and over-padding the org block is the safe direction.
 */
function departmentWrapperPadding(theme: NodeTheme, config: RenderConfig): number {
  const style = config.departmentStyle ?? defaultRenderConfig.departmentStyle ?? 'blob';
  if (style === 'card') {
    const card = theme.departmentCard;
    const padding = card?.padding ?? 8;
    return padding + (card?.labelRow ? (card.labelFontSize ?? 12) + 6 : 0);
  }
  return contourButtonGroupMargin(config.paddingCells ?? 0, theme.department.strokeWidth);
}

/** Flood runs per org block — `gridCell` is local to one block. */
function groupInputsByOrg(
  inputs: readonly ContourPositionInput[],
  orgByPosition: ReadonlyMap<string, string>,
): Map<string, ContourPositionInput[]> {
  const byOrg = new Map<string, ContourPositionInput[]>();
  for (const input of inputs) {
    const orgId = orgByPosition.get(input.id) ?? '';
    const list = byOrg.get(orgId) ?? [];
    list.push(input);
    byOrg.set(orgId, list);
  }
  return byOrg;
}

function countPositionsByDept(positions: DiagramData['positions']): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of positions) {
    if (!p.departmentId) continue;
    map.set(p.departmentId, (map.get(p.departmentId) ?? 0) + 1);
  }
  return map;
}

function resolveStaffZoneStyle(
  theme: NodeTheme,
  mode: 'light' | 'dark',
): StaffZoneStyle {
  if (theme.staffZone) return theme.staffZone;
  if (mode === 'dark') {
    return {
      fill: 0x191f26,
      fillAlpha: 0.95,
      stroke: 0x3d5067,
      strokeWidth: 1,
      borderRadius: 12,
      labelColor: 0xf1f5f9,
      labelFontSize: 14,
      labelAlign: 'right',
    };
  }
  return {
    fill: 0xf1f5f9,
    fillAlpha: 0.95,
    stroke: 0xcbd5e1,
    strokeWidth: 1,
    borderRadius: 12,
    labelColor: 0x0f172a,
    labelFontSize: 14,
    labelAlign: 'right',
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
