import { Container, Graphics } from 'pixi.js';
import { LayerManager } from './LayerManager.js';
import { SceneRegistry, type NodeWorldBox } from './SceneRegistry.js';
import { ContourPainter } from './ContourPainter.js';
import {
  type ContourMagnetConfig,
  type ContourPositionInput,
  type DeptContourResult,
} from '../contour/bridge.js';
import { contourSceneInputs, matrixNodeBoxes } from './contourInputs.js';
import { contourButtonGroupMargin } from './contourButtonGroup.js';
import { layoutStaffCanvas } from '../layout/staff/canvasLayout.js';
import type { StaffCanvasResult } from '../layout/staff/types.js';
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
import { DepartmentCardView } from './DepartmentCardView.js';
import { paintDashedFrame } from './dashedStroke.js';
import { StaffZonesView } from './StaffZonesView.js';
import { enrichStaffTierBands, unionBoxes } from './staffZoneBounds.js';
import { OrgEdgesView } from './OrgEdgesView.js';
import { StaffEdgesView } from './StaffEdgesView.js';
import { PersonNodeView } from './PersonNode.js';
import { OrganizationNodeView } from './OrganizationNode.js';
import type {
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
import { inferStaffCurrentOrgId } from './inferStaffCurrentOrgId.js';

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

const DEFAULT_MORPH_MS = 160;

export class DiagramRenderer {
  readonly layers = new LayerManager();
  private destroyed = false;
  /** Bumped at each render entry; stale async passes bail after await (T75 D2). */
  private renderEpoch = 0;
  /** Boxes, views and promote state for what the last render put on screen. */
  private readonly scene = new SceneRegistry();
  private lastDiagnostics: string[] = [];
  /** Contour cell-space → staff world (pitch + origin). */
  private contourWorld: ContourWorldTransform | null = null;
  /** Department contours: session, engine choice and drag morphs. */
  private readonly contours = new ContourPainter({
    layers: this.layers,
    isDestroyed: () => this.destroyed,
    worldTransform: () => this.contourWorld,
    cardInset: () => ({ x: this.dragGrid?.insetX ?? 0, y: this.dragGrid?.insetY ?? 0 }),
    reportDiagnostic: (message) => this.reportContourDiagnostic(message),
  });
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
  }

  getPromotedNodeIds(): readonly string[] {
    return this.scene.listPromotedIds();
  }

  private registerView(kind: NodeWorldBox['kind'], id: string, view: Container): void {
    this.scene.registerView(kind, id, view);
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
    return this.scene.contentBounds();
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
    this.contours.reset();
    this.contourWorld = null;
    this.dragGrid = null;
    this.layers.clear();
    this.scene.clear();
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
    this.scene.applyPromoteVisibility();
  }

  /**
   * An empty contour layer with a silent console is the kind of quiet lie this
   * repo bans — every reason the flood produced nothing goes to
   * `getLayoutDiagnostics()`, which the host receives after each render.
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

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.renderEpoch += 1;
    this.contours.reset();
    this.layers.clear();
    this.layers.root.destroy({ children: true });
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
    this.scene.rememberBox(box);
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
      this.contours.previewDrag(positionId, snap.col, snap.row);
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
        this.contours.restoreAfterFailedDrag();
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
    const ctx: StaffSceneContext = { data, theme, resolvedTheme, config, options, epoch };
    const currentOrgId = options.staff?.currentOrgId ?? inferStaffCurrentOrgId(data);
    if (currentOrgId && data.organizations.some((o) => o.id === currentOrgId)) {
      await this.renderStaffCanvas(ctx, currentOrgId);
      return;
    }
    // No focus org: seats fall back to the bare cell grid (mockups, tests).
    await this.renderPositionGrid(ctx);
  }

  /** SPEC §2.2 three-tier canvas: zones, contours, edges, seats, org cards. */
  private async renderStaffCanvas(ctx: StaffSceneContext, currentOrgId: string): Promise<void> {
    const { data, theme, config, options, epoch } = ctx;
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

    const staffMerged = { ...DEFAULT_STAFF_LAYOUT_OPTIONS, ...staffOpts };
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

    if (config.staffZoneChrome) this.paintStaffZones(ctx, canvas, geom);
    await this.paintStaffDepartments(ctx, canvas, geom);
    if (!this.isRenderCurrent(epoch)) return;
    this.paintStaffFrameAndEdges(ctx, canvas, geom);
    this.addStaffPersonCards(ctx, canvas, geom);
    this.addStaffOrgCards(ctx, canvas);
  }

  private paintStaffZones(
    ctx: StaffSceneContext,
    canvas: StaffCanvasResult,
    geom: StaffSceneGeometry,
  ): void {
    const { theme, resolvedTheme, config, data } = ctx;
    // The org block wraps the department wrappers, not the bare seats.
    const contentPadding = departmentWrapperPadding(theme, config);
    const tiers = enrichStaffTierBands(
      canvas.tiers,
      canvas.positionNodes,
      canvas.orgCards,
      data.organizations,
      { margin: geom.margin, canvasWidth: canvas.width, contentPadding },
    );
    this.layers.zones.addChild(
      StaffZonesView.fromCanvas({
        tiers,
        positionNodes: canvas.positionNodes,
        orgCards: canvas.orgCards,
        style: resolveStaffZoneStyle(theme, resolvedTheme),
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

  private paintStaffFrameAndEdges(
    ctx: StaffSceneContext,
    canvas: StaffCanvasResult,
    geom: StaffSceneGeometry,
  ): void {
    const { theme, resolvedTheme, config, options } = ctx;
    if (config.dashedGridFrame) {
      const frame = unionBoxes(
        canvas.positionNodes.map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height })),
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

    const edgeBoxes = mapStaffEdgeBoxesForLod(
      mapPositionNodesToStaffEdgeBoxes(canvas.positionNodes, geom.positionById, theme.person),
      canvas.orgCards.map((c) => ({
        id: c.orgId,
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
      })),
      options.lod ?? 'near',
    );
    this.layers.edges.addChild(
      StaffEdgesView.fromLayout(canvas.edges, edgeBoxes, {
        theme: resolvedTheme,
        edge: theme.edge,
      }),
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
      const position = geom.positionById.get(n.id);
      if (!position) continue;
      const person = position.personId ? personById.get(position.personId) : undefined;
      const kids = childrenFor(position.organizationId).get(position.id) ?? [];
      const showExpand = collapsePositions && kids.length > 0 && !!options.onPositionExpandToggle;
      const node = PersonNodeView.create(
        person,
        position,
        { ...theme.person, width: n.width, height: n.height },
        lod,
        {
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
        },
      );
      node.position.set(n.x, n.y);
      this.bindPersonInteractions(
        node,
        position.personId,
        position.id,
        { id: position.id, kind: 'position', x: n.x, y: n.y, width: n.width, height: n.height },
        config,
        options,
        position.gridCell,
      );
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
      this.bindStaffOrgCardInteractions(view, card.orgId, options);
      this.layers.organizations.addChild(view);
    }
  }

  private bindStaffOrgCardInteractions(
    view: OrganizationNodeView,
    orgId: string,
    options: RenderOptions,
  ): void {
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
        options.onOrgClick?.(orgId, mods);
        return;
      }
      if (this.nodeDoubleTap.tap(`org:${orgId}`) === 'double') {
        options.onOrgDoubleClick?.(orgId);
        return;
      }
      if (options.onStaffOrgExpandToggle) {
        options.onStaffOrgExpandToggle(orgId);
      } else {
        options.onStaffOrgDrill?.(orgId);
      }
      options.onOrgClick?.(orgId, mods);
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
      options.onOrgContextMenu?.(orgId, {
        clientX: e.clientX,
        clientY: e.clientY,
        canvasX: e.global.x,
        canvasY: e.global.y,
      });
    });
  }

  /** Seats on the bare cell grid — no tiers, no org cards (mockups, tests). */
  private async renderPositionGrid(ctx: StaffSceneContext): Promise<void> {
    const { data, theme, config, options } = ctx;
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

    await this.contours.paint({
      inputs: contourInputs,
      data,
      theme,
      config,
      lod: options.lod ?? 'near',
      morphMs: options.contourMorphMs,
      memberBoxesByDept,
    });

    this.dragGrid = { pitchX: config.cellWidth, pitchY: config.cellHeight, originX: 0, originY: 0, insetX, insetY };

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
