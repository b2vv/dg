import { Container, Graphics } from 'pixi.js';
import {
  type ContourMagnetConfig,
  type ContourPositionInput,
  type DeptContourResult,
} from '../contour/bridge.js';
import { diagramPositionsToContourInputs } from '../contour/config.js';
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
import { clusterPositionsByDepartment } from './contourCluster.js';
import { memberBoxesForCluster } from './contourButtonGroup.js';
import { polishContourRing } from './contourPolish.js';
import { shouldPaintDeptContour } from './contourPaintFilter.js';

export type ContourComputer = (
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
) => Promise<DeptContourResult[]>;

export interface RenderOptions {
  /**
   * @deprecated T77-M01 Option B — canvas paints TS button-group rings only.
   * Rust/worker contour compute is no longer invoked from DiagramRenderer.
   */
  computeContours?: ContourComputer;
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
  onPersonClick?: (personId: string, positionId: string, mods?: SelectionPointerMods) => void;
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
  memberBoxesByDept: Map<string, ContourMemberBox[]>;
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
    memberBoxesByDept?: Map<string, ContourMemberBox[]>;
  }): ContourSession {
    this.cancelContourMorphs();
    const cloned = args.inputs.map((p) => ({ ...p }));
    this.contourSession = {
      ...args,
      memberBoxesByDept: args.memberBoxesByDept ?? new Map(),
      baseInputs: cloned.map((p) => ({ ...p })),
      inputs: cloned,
      blobsByDept: new Map(),
      morphHandles: new Map(),
      previewGen: 0,
    };
    return this.contourSession;
  }

  /** Paint rings from magnetic clusters — no Rust L/C geometry. */
  private buildPaintRingsByDept(): Map<string, { x: number; y: number }[][]> {
    const session = this.contourSession;
    if (!session) return new Map();

    const radius = session.magnet.magnetRadius ?? 1.5;
    const deptIds = [...new Set(session.inputs.map((p) => p.departmentId))].sort();
    const out = new Map<string, { x: number; y: number }[][]>();

    for (const deptId of deptIds) {
      if (!shouldPaintDeptContour(session.personCounts.get(deptId), session.minContourMembers)) {
        continue;
      }
      const members = session.memberBoxesByDept.get(deptId) ?? [];
      const clusters = clusterPositionsByDepartment(session.inputs, deptId, radius);
      const rings: { x: number; y: number }[][] = [];
      for (const clusterIds of clusters) {
        const boxes = memberBoxesForCluster(clusterIds, members);
        const ring = polishContourRing(
          boxes,
          session.style.strokeWidth,
          session.paintPaddingCells,
          session.paintSmoothIterations,
        );
        if (ring.length >= 2) rings.push(ring);
      }
      if (rings.length > 0) out.set(deptId, rings);
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
    // T77-M01 Option B: paint TS button-group rings only — do not await Rust/worker.
    void options.computeContours;
    const magnet: ContourMagnetConfig = {
      paddingCells: 0,
      cellWidth: config.cellWidth,
      cellHeight: config.cellHeight,
      smoothIterations: 0,
      magnetRadius: config.magnetRadius,
    };
    const lod = options.lod ?? 'near';
    const deptNames = new Map(data.departments.map((d) => [d.id, d.name]));
    const personCounts = countPositionsByDept(data.positions);
    this.beginContourSession({
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
      memberBoxesByDept: options.contourMemberBoxesByDept,
    });
    if (this.destroyed || !this.contourSession) return;
    this.refreshContourPaint(false);
  }

  private async restoreContoursAfterFailedDrag(): Promise<void> {
    const session = this.contourSession;
    if (!session) return;
    session.inputs = session.baseInputs.map((p) => ({ ...p }));
    session.previewGen += 1;
    this.refreshContourPaint(true);
  }

  private async previewDragContours(positionId: string, col: number, row: number): Promise<void> {
    const session = this.contourSession;
    if (!session || col < 0 || row < 0) return;
    session.inputs = session.inputs.map((p) => (p.id === positionId ? { ...p, col, row } : p));
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
      if (!personId) return;
      const mods = readSelectionPointerMods(e);
      // Modifier+click toggles set membership — do not feed double-tap expand (T69).
      if (isSelectionToggleModifier(mods)) {
        this.nodeDoubleTap.reset();
        options.onPersonClick?.(personId, positionId, mods);
        return;
      }
      const kind = this.nodeDoubleTap.tap(`person:${personId}:${positionId}`);
      if (kind === 'double') {
        options.onPersonDoubleClick?.(personId, positionId);
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
    const grid = this.dragGrid;
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
        const tiers = enrichStaffTierBands(
          canvas.tiers,
          canvas.positionNodes,
          canvas.orgCards,
          data.organizations,
          { margin: staffMerged.margin, canvasWidth: canvas.width },
        );
        this.layers.zones.addChild(
          StaffZonesView.fromCanvas({
            tiers,
            positionNodes: canvas.positionNodes,
            orgCards: canvas.orgCards,
            style: resolveStaffZoneStyle(theme, resolvedTheme),
            margin: staffMerged.margin,
            canvasWidth: canvas.width,
          }),
        );
      }

      // Contours only for authored grid cells — remapping tree/hybrid world
      // coords into the cell grid produces crooked “macaroni” blobs.
      const contourInputs: ContourPositionInput[] = canvas.positionNodes
        .map((n) => positionById.get(n.id))
        .filter(
          (p): p is NonNullable<typeof p> & { departmentId: string; gridCell: { col: number; row: number } } =>
            !!p?.departmentId && !!p.gridCell,
        )
        .map((p) => ({
          id: p.id,
          departmentId: p.departmentId,
          col: p.gridCell.col,
          row: p.gridCell.row,
        }));

      const memberBoxesByDept = new Map<string, ContourMemberBox[]>();
      for (const n of canvas.positionNodes) {
        const pos = positionById.get(n.id);
        if (!pos?.departmentId) continue;
        const list = memberBoxesByDept.get(pos.departmentId) ?? [];
        list.push({
          positionId: n.id,
          x: n.x,
          y: n.y,
          width: n.width,
          height: n.height,
        });
        memberBoxesByDept.set(pos.departmentId, list);
      }

      const deptStyle = config.departmentStyle ?? defaultRenderConfig.departmentStyle ?? 'blob';
      if (deptStyle === 'card') {
        this.paintDepartmentCards(data, theme, config, memberBoxesByDept);
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
          paintDashedFrame(this.layers.zones, frame, resolveStaffZoneStyle(theme, resolvedTheme).stroke);
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
        StaffEdgesView.fromLayout(canvas.edges, edgeBoxes, resolvedTheme),
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

    const contourInputs = diagramPositionsToContourInputs(data.positions);
    await this.paintContours(contourInputs, data, theme, config, options);

    const insetX = (config.cellWidth - theme.person.width) / 2;
    const insetY = (config.cellHeight - theme.person.height) / 2;
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

    const edgesView = OrgEdgesView.fromEdges(
      layout.edges,
      resolvedTheme === 'dark' ? 0x64748b : 0x94a3b8,
    );
    this.layers.edges.addChild(edgesView);

    if (config.orgSiblingGroupChrome) {
      const orgById = new Map(data.organizations.map((o) => [o.id, o]));
      const collapsedOnly = theme.organization.orgCardLayout === 'gojs-vertical';
      const groups = siblingOrgGroupBounds(layout.nodes, 14, {
        collapsedMatrixOnly: collapsedOnly,
        orgById,
      });
      const stroke = resolvedTheme === 'dark' ? 0x64748b : 0x94a3b8;
      for (const g of groups) {
        paintDashedFrame(this.layers.zones, g.bounds, stroke, 1);
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
        padding: 8,
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

function inferStaffCurrentOrgId(data: DiagramData): string | undefined {
  const orgIds = [...new Set(data.positions.map((p) => p.organizationId))];
  if (orgIds.length === 1) return orgIds[0];
  if (data.organizations.length === 1) return data.organizations[0]!.id;
  const withHead = data.positions.filter((p) => p.isHead).map((p) => p.organizationId);
  if (withHead.length === 1) return withHead[0];
  return orgIds[0];
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
