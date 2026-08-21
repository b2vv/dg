import { Container, Graphics } from 'pixi.js';
import {
  computeAllContours,
  type ContourMagnetConfig,
  type ContourPositionInput,
  type DeptContourResult,
} from '../contour/bridge.js';
import { diagramPositionsToContourInputs } from '../contour/config.js';
import { layoutStaffCanvas } from '../layout/staff/canvasLayout.js';
import type { StaffLayoutOptions } from '../layout/staff/types.js';
import { computeOrgLayout } from '../layout/rowTreeLayout.js';
import type { OrgLayoutOptions } from '../layout/types.js';
import { snapToGrid } from '../interaction/positionMove.js';
import type { NodeRef } from '../interaction/types.js';
import { DepartmentBlobView } from './DepartmentBlob.js';
import { OrgEdgesView } from './OrgEdgesView.js';
import { StaffEdgesView } from './StaffEdgesView.js';
import { PersonNodeView } from './PersonNode.js';
import { OrganizationNodeView } from './OrganizationNode.js';
import { parseSvgPath } from './svgPath.js';
import { runPointMorph, type PointMorphHandle } from './contourMorph.js';
import type { DepartmentBlobStyle, NodeTheme, RenderConfig } from './types.js';
import { defaultRenderConfig } from './types.js';
import type { DiagramData } from '../data/types.js';
import type { LodLevel } from './lod.js';

export type ContourComputer = (
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
) => Promise<DeptContourResult[]>;

export interface RenderOptions {
  computeContours?: ContourComputer;
  orgLayout?: OrgLayoutOptions;
  lod?: LodLevel;
  /** Contour morph duration during drag (ms). `0` = snap. Default 160. */
  contourMorphMs?: number;
  onOrgClick?: (orgId: string) => void;
  /** Tier-3 card click: toggle expand-in-place (preferred). */
  onStaffOrgExpandToggle?: (orgId: string) => void;
  /** Explicit drill (change focus); used when expand toggle is not provided. */
  onStaffOrgDrill?: (orgId: string) => void;
  onPersonClick?: (personId: string, positionId: string) => void;
  onPersonContextMenu?: (
    personId: string,
    positionId: string,
    pointer: { clientX: number; clientY: number; canvasX: number; canvasY: number },
  ) => void;
  onOrgContextMenu?: (
    orgId: string,
    pointer: { clientX: number; clientY: number; canvasX: number; canvasY: number },
  ) => void;
  onPersonDragEnd?: (positionId: string, col: number, row: number) => void;
  onCanvasClick?: () => void;
  selected?: NodeRef | null;
  staff?: {
    currentOrgId?: string;
    layout?: StaffLayoutOptions;
    /** Tier-3 orgs expanded in place under their cards. */
    expandedOrgIds?: readonly string[];
  };
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
  compute: ContourComputer;
  magnet: ContourMagnetConfig;
  style: DepartmentBlobStyle;
  lod: LodLevel;
  morphMs: number;
  deptNames: Map<string, string>;
  personCounts: Map<string, number>;
  blobsByDept: Map<string, DepartmentBlobView[]>;
  morphHandles: Map<DepartmentBlobView, PointMorphHandle>;
  previewGen: number;
}

export class LayerManager {
  readonly root = new Container();
  readonly departments = new Container();
  readonly edges = new Container();
  readonly organizations = new Container();
  readonly persons = new Container();
  readonly overlay = new Container();

  constructor() {
    this.root.addChild(
      this.departments,
      this.edges,
      this.organizations,
      this.persons,
      this.overlay,
    );
  }

  clear(): void {
    this.departments.removeChildren();
    this.edges.removeChildren();
    this.organizations.removeChildren();
    this.persons.removeChildren();
    this.overlay.removeChildren();
  }
}

const DEFAULT_MORPH_MS = 160;

export class DiagramRenderer {
  readonly layers = new LayerManager();
  private destroyed = false;
  private nodeBoxes = new Map<string, NodeWorldBox>();
  /** Pixi views keyed by node/position/org id — for promote hide/show. */
  private nodeViews = new Map<string, Container>();
  private promotedIds = new Set<string>();
  private contourSession: ContourSession | null = null;
  private lastDiagnostics: string[] = [];
  /** Translate contour grid paths into staff world space (tier margin / cursorY). */
  private contourWorldOffset = { x: 0, y: 0 };
  private drag: {
    positionId: string;
    node: PersonNodeView;
    originX: number;
    originY: number;
    pointerId: number;
    moved: boolean;
    previewCol: number | null;
    previewRow: number | null;
  } | null = null;

  mount(stage: Container): void {
    stage.addChild(this.layers.root);
  }

  getNodeBox(id: string): NodeWorldBox | undefined {
    return this.nodeBoxes.get(id);
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

  private registerView(id: string, view: Container): void {
    this.nodeViews.set(id, view);
    view.visible = !this.promotedIds.has(id);
  }

  private applyPromoteVisibility(): void {
    for (const [id, view] of this.nodeViews) {
      view.visible = !this.promotedIds.has(id);
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
    this.cancelContourMorphs();
    this.contourSession = null;
    this.contourWorldOffset = { x: 0, y: 0 };
    this.layers.clear();
    this.nodeBoxes.clear();
    this.nodeViews.clear();
    this.lastDiagnostics = [];
    this.drag = null;

    this.layers.root.eventMode = 'static';
    this.layers.root.removeAllListeners('pointertap');
    this.layers.root.on('pointertap', () => options.onCanvasClick?.());

    const lod = options.lod ?? 'near';
    const hasStaff = data.positions.length > 0;
    if (hasStaff) {
      await this.renderStaff(data, theme, resolvedTheme, config, { ...options, lod });
    } else if (data.organizations.length > 0) {
      await this.renderOrganizations(data, theme, resolvedTheme, { ...options, lod });
    }

    this.drawSelection(options.selected ?? null);
    this.applyPromoteVisibility();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
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

  private drawSelection(selected: NodeRef | null): void {
    if (!selected) return;
    const box =
      this.nodeBoxes.get(selected.id) ??
      (selected.positionId ? this.nodeBoxes.get(selected.positionId) : undefined) ??
      (selected.personId ? this.nodeBoxes.get(selected.personId) : undefined);
    if (!box) return;
    const g = new Graphics();
    g.rect(box.x - 3, box.y - 3, box.width + 6, box.height + 6);
    g.stroke({ color: 0x2563eb, width: 2 });
    this.layers.overlay.addChild(g);
  }

  private rememberBox(box: NodeWorldBox): void {
    this.nodeBoxes.set(box.id, box);
  }

  private beginContourSession(args: {
    inputs: ContourPositionInput[];
    compute: ContourComputer;
    magnet: ContourMagnetConfig;
    style: DepartmentBlobStyle;
    lod: LodLevel;
    morphMs: number;
    deptNames: Map<string, string>;
    personCounts: Map<string, number>;
  }): ContourSession {
    this.cancelContourMorphs();
    const cloned = args.inputs.map((p) => ({ ...p }));
    this.contourSession = {
      ...args,
      baseInputs: cloned.map((p) => ({ ...p })),
      inputs: cloned,
      blobsByDept: new Map(),
      morphHandles: new Map(),
      previewGen: 0,
    };
    return this.contourSession;
  }

  private contourPoints(result: DeptContourResult): { x: number; y: number }[] {
    const ox = this.contourWorldOffset.x;
    const oy = this.contourWorldOffset.y;
    const raw =
      result.points.length >= 2
        ? result.points.map((p) => ({ x: p.x, y: p.y }))
        : (parseSvgPath(result.path)?.points.map((p) => ({ x: p.x, y: p.y })) ?? []);
    if (ox === 0 && oy === 0) return raw;
    return raw.map((p) => ({ x: p.x + ox, y: p.y + oy }));
  }

  private applyContourResults(results: DeptContourResult[], morph: boolean): void {
    const session = this.contourSession;
    if (!session) return;

    const byDept = new Map<string, DeptContourResult[]>();
    for (const r of results) {
      const list = byDept.get(r.departmentId) ?? [];
      list.push(r);
      byDept.set(r.departmentId, list);
    }

    for (const [deptId, blobs] of [...session.blobsByDept.entries()]) {
      if (byDept.has(deptId)) continue;
      for (const blob of blobs) {
        session.morphHandles.get(blob)?.cancel();
        session.morphHandles.delete(blob);
        this.layers.departments.removeChild(blob);
        blob.destroy();
      }
      session.blobsByDept.delete(deptId);
    }

    for (const [deptId, contours] of byDept) {
      let blobs = session.blobsByDept.get(deptId);
      if (!blobs) {
        blobs = [];
        session.blobsByDept.set(deptId, blobs);
      }

      const label = session.deptNames.get(deptId) ?? deptId;
      const count = session.personCounts.get(deptId);

      if (blobs.length !== contours.length) {
        for (const blob of blobs) {
          session.morphHandles.get(blob)?.cancel();
          session.morphHandles.delete(blob);
          this.layers.departments.removeChild(blob);
          blob.destroy();
        }
        blobs.length = 0;
        for (const contour of contours) {
          const blob = DepartmentBlobView.fromPoints(
            this.contourPoints(contour),
            label,
            session.style,
            session.lod,
            count,
          );
          blobs.push(blob);
          this.layers.departments.addChild(blob);
        }
        continue;
      }

      for (let i = 0; i < contours.length; i += 1) {
        const blob = blobs[i]!;
        const to = this.contourPoints(contours[i]!);
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
    const compute = options.computeContours ?? computeAllContours;
    const magnet: ContourMagnetConfig = {
      paddingCells: config.paddingCells,
      cellWidth: config.cellWidth,
      cellHeight: config.cellHeight,
      smoothIterations: config.smoothIterations,
      magnetRadius: config.magnetRadius,
    };
    const lod = options.lod ?? 'near';
    const deptNames = new Map(data.departments.map((d) => [d.id, d.name]));
    const personCounts = countPositionsByDept(data.positions);
    this.beginContourSession({
      inputs,
      compute,
      magnet,
      style: theme.department,
      lod,
      morphMs: options.contourMorphMs ?? DEFAULT_MORPH_MS,
      deptNames,
      personCounts,
    });
    const contours = await compute(inputs, magnet);
    if (this.destroyed || !this.contourSession) return;
    this.applyContourResults(contours, false);
  }

  private async restoreContoursAfterFailedDrag(): Promise<void> {
    const session = this.contourSession;
    if (!session) return;
    session.inputs = session.baseInputs.map((p) => ({ ...p }));
    const gen = ++session.previewGen;
    const results = await session.compute(session.inputs, session.magnet);
    if (this.destroyed || !this.contourSession || gen !== this.contourSession.previewGen) return;
    this.applyContourResults(results, true);
  }

  private async previewDragContours(positionId: string, col: number, row: number): Promise<void> {
    const session = this.contourSession;
    if (!session || col < 0 || row < 0) return;
    const inputs = session.inputs.map((p) => (p.id === positionId ? { ...p, col, row } : p));
    const gen = ++session.previewGen;
    const results = await session.compute(inputs, session.magnet);
    if (this.destroyed || !this.contourSession || gen !== this.contourSession.previewGen) return;
    this.contourSession.inputs = inputs;
    this.applyContourResults(results, true);
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
    if (personId) {
      this.rememberBox({ ...box, id: personId, kind: 'person' });
    }

    node.on('pointertap', (e) => {
      if (this.drag?.moved) return;
      e.stopPropagation();
      if (personId) options.onPersonClick?.(personId, positionId);
    });

    node.on('rightclick', (e) => {
      e.stopPropagation();
      e.preventDefault?.();
      if (personId) {
        options.onPersonContextMenu?.(personId, positionId, {
          clientX: e.clientX,
          clientY: e.clientY,
          canvasX: e.global.x,
          canvasY: e.global.y,
        });
      }
    });

    node.on('pointerdown', (e) => {
      this.drag = {
        positionId,
        node,
        originX: node.x,
        originY: node.y,
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
      const nx = local.x - box.width / 2;
      const ny = local.y - box.height / 2;
      if (Math.hypot(nx - this.drag.originX, ny - this.drag.originY) > 4) {
        this.drag.moved = true;
      }
      node.position.set(nx, ny);
      if (!this.drag.moved) return;
      const snap = snapToGrid(nx, ny, config.cellWidth, config.cellHeight);
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
      const snap = snapToGrid(node.x, node.y, config.cellWidth, config.cellHeight);
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

  private async renderStaff(
    data: DiagramData,
    theme: NodeTheme,
    resolvedTheme: 'light' | 'dark',
    config: RenderConfig,
    options: RenderOptions,
  ): Promise<void> {
    const currentOrgId = options.staff?.currentOrgId ?? inferStaffCurrentOrgId(data);

    if (currentOrgId && data.organizations.some((o) => o.id === currentOrgId)) {
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
        {
          // Keep staff boxes on the same pitch as contour cells.
          nodeWidth: theme.person.width,
          nodeHeight: theme.person.height,
          refCellWidth: config.cellWidth,
          refCellHeight: config.cellHeight,
          ...options.staff?.layout,
          expandedOrgIds: options.staff?.expandedOrgIds ?? options.staff?.layout?.expandedOrgIds,
        },
      );

      this.lastDiagnostics = [...canvas.diagnostics];

      const personById = new Map(data.persons.map((p) => [p.id, p]));
      const positionById = new Map(data.positions.map((p) => [p.id, p]));

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

      if (contourInputs.length > 0) {
        this.contourWorldOffset = resolveContourWorldOffset(
          canvas.positionNodes,
          positionById,
          config,
        );
        await this.paintContours(contourInputs, data, theme, config, options);
      }

      this.layers.edges.addChild(
        StaffEdgesView.fromLayout(canvas.edges, canvas.positionNodes, resolvedTheme),
      );

      const lod = options.lod ?? 'near';
      for (const n of canvas.positionNodes) {
        const position = positionById.get(n.id);
        if (!position) continue;
        const person = position.personId ? personById.get(position.personId) : undefined;
        const personStyle = {
          ...theme.person,
          width: n.width,
          height: n.height,
        };
        const node = PersonNodeView.create(person, position, personStyle, lod);
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
        this.registerView(position.id, node);
        if (position.personId) this.registerView(position.personId, node);
      }

      for (const card of canvas.orgCards) {
        const org = data.organizations.find((o) => o.id === card.orgId);
        if (!org) continue;
        const orgStyle = {
          ...theme.organization,
          width: card.width,
          height: card.height,
        };
        const view = OrganizationNodeView.create(
          org,
          undefined,
          resolvedTheme,
          orgStyle,
          lod,
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
        this.registerView(card.orgId, view);
        view.on('pointertap', (e) => {
          e.stopPropagation();
          if (options.onStaffOrgExpandToggle) {
            options.onStaffOrgExpandToggle(card.orgId);
          } else {
            options.onStaffOrgDrill?.(card.orgId);
          }
          options.onOrgClick?.(card.orgId);
        });
        view.on('pointerdown', (e) => {
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

    const personById = new Map(data.persons.map((p) => [p.id, p]));
    for (const position of data.positions) {
      if (!position.gridCell) continue;
      const person = position.personId ? personById.get(position.personId) : undefined;
      const node = PersonNodeView.create(person, position, theme.person, options.lod ?? 'near');
      const insetX = (config.cellWidth - theme.person.width) / 2;
      const insetY = (config.cellHeight - theme.person.height) / 2;
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
      this.registerView(position.id, node);
      if (position.personId) this.registerView(position.personId, node);
    }
  }

  private async renderOrganizations(
    data: DiagramData,
    theme: NodeTheme,
    resolvedTheme: 'light' | 'dark',
    options: RenderOptions,
  ): Promise<void> {
    const layout = await computeOrgLayout(
      data.organizations,
      data.orgLinks ?? [],
      options.orgLayout,
    );

    const edgesView = OrgEdgesView.fromEdges(
      layout.edges,
      resolvedTheme === 'dark' ? 0x64748b : 0x94a3b8,
    );
    this.layers.edges.addChild(edgesView);

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
        e.stopPropagation();
        options.onOrgClick?.(org.id);
      });
      node.on('pointerdown', (e) => {
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
      this.registerView(org.id, node);
    }
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

/** Map contour grid origin onto staff layout world (tier margin / cursorY). */
function resolveContourWorldOffset(
  nodes: Array<{ id: string; x: number; y: number; width: number; height: number }>,
  positionById: Map<string, { gridCell?: { col: number; row: number } }>,
  config: RenderConfig,
): { x: number; y: number } {
  for (const n of nodes) {
    const p = positionById.get(n.id);
    if (!p?.gridCell) continue;
    const insetX = (config.cellWidth - n.width) / 2;
    const insetY = (config.cellHeight - n.height) / 2;
    return {
      x: n.x - (p.gridCell.col * config.cellWidth + insetX),
      y: n.y - (p.gridCell.row * config.cellHeight + insetY),
    };
  }
  return { x: 0, y: 0 };
}
