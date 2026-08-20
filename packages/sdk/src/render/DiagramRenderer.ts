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
import type { NodeTheme, RenderConfig } from './types.js';
import { defaultRenderConfig } from './types.js';
import type { DiagramData } from '../data/types.js';

export type ContourComputer = (
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
) => Promise<DeptContourResult[]>;

export interface RenderOptions {
  computeContours?: ContourComputer;
  orgLayout?: OrgLayoutOptions;
  onOrgClick?: (orgId: string) => void;
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

export class DiagramRenderer {
  readonly layers = new LayerManager();
  private destroyed = false;
  private nodeBoxes = new Map<string, NodeWorldBox>();
  private drag: {
    positionId: string;
    node: PersonNodeView;
    originX: number;
    originY: number;
    pointerId: number;
    moved: boolean;
  } | null = null;

  mount(stage: Container): void {
    stage.addChild(this.layers.root);
  }

  getNodeBox(id: string): NodeWorldBox | undefined {
    return this.nodeBoxes.get(id);
  }

  async render(
    data: DiagramData,
    theme: NodeTheme,
    resolvedTheme: 'light' | 'dark',
    config: RenderConfig = defaultRenderConfig,
    options: RenderOptions = {},
  ): Promise<void> {
    if (this.destroyed) return;
    this.layers.clear();
    this.nodeBoxes.clear();
    this.drag = null;

    this.layers.root.eventMode = 'static';
    this.layers.root.removeAllListeners('pointertap');
    this.layers.root.on('pointertap', () => options.onCanvasClick?.());

    const hasStaff = data.positions.length > 0;
    if (hasStaff) {
      await this.renderStaff(data, theme, resolvedTheme, config, options);
    } else if (data.organizations.length > 0) {
      await this.renderOrganizations(data, theme, resolvedTheme, options);
    }

    this.drawSelection(options.selected ?? null);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.layers.clear();
    this.layers.root.destroy({ children: true });
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
        options.staff?.layout,
      );

      const personById = new Map(data.persons.map((p) => [p.id, p]));
      const positionById = new Map(data.positions.map((p) => [p.id, p]));

      const contourInputs: ContourPositionInput[] = canvas.positionNodes
        .filter((n) => positionById.get(n.id)?.departmentId)
        .map((n) => {
          const p = positionById.get(n.id)!;
          return {
            id: n.id,
            departmentId: p.departmentId!,
            col: Math.round(n.x / config.cellWidth),
            row: Math.round(n.y / config.cellHeight),
          };
        });

      const computeContours = options.computeContours ?? computeAllContours;
      const contours = await computeContours(contourInputs, {
        paddingCells: config.paddingCells,
        cellWidth: config.cellWidth,
        cellHeight: config.cellHeight,
        smoothIterations: config.smoothIterations,
        magnetRadius: config.magnetRadius,
      });

      const deptById = new Map(data.departments.map((d) => [d.id, d]));
      for (const contour of contours) {
        const dept = deptById.get(contour.departmentId);
        const blob = DepartmentBlobView.fromPath(
          contour.path,
          dept?.name ?? contour.departmentId,
          theme.department,
        );
        this.layers.departments.addChild(blob);
      }

      this.layers.edges.addChild(StaffEdgesView.fromLayout(canvas.edges, canvas.positionNodes));

      for (const n of canvas.positionNodes) {
        const position = positionById.get(n.id);
        if (!position) continue;
        const person = position.personId ? personById.get(position.personId) : undefined;
        const node = PersonNodeView.create(person, position, theme.person);
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
      }

      for (const card of canvas.orgCards) {
        const org = data.organizations.find((o) => o.id === card.orgId);
        if (!org) continue;
        const view = OrganizationNodeView.create(
          org,
          undefined,
          resolvedTheme,
          theme.organization,
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
        view.on('pointertap', (e) => {
          e.stopPropagation();
          options.onStaffOrgDrill?.(card.orgId);
          options.onOrgClick?.(card.orgId);
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
    const computeContours = options.computeContours ?? computeAllContours;
    const deptById = new Map(data.departments.map((d) => [d.id, d]));
    const personById = new Map(data.persons.map((p) => [p.id, p]));
    const contours = await computeContours(contourInputs, {
      paddingCells: config.paddingCells,
      cellWidth: config.cellWidth,
      cellHeight: config.cellHeight,
      smoothIterations: config.smoothIterations,
      magnetRadius: config.magnetRadius,
    });
    for (const contour of contours) {
      const dept = deptById.get(contour.departmentId);
      const blob = DepartmentBlobView.fromPath(
        contour.path,
        dept?.name ?? contour.departmentId,
        theme.department,
      );
      this.layers.departments.addChild(blob);
    }
    for (const position of data.positions) {
      if (!position.gridCell) continue;
      const person = position.personId ? personById.get(position.personId) : undefined;
      const node = PersonNodeView.create(person, position, theme.person);
      const x = position.gridCell.col * config.cellWidth + 10;
      const y = position.gridCell.row * config.cellHeight + 10;
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

    const edgesView = OrgEdgesView.fromEdges(layout.edges);
    this.layers.edges.addChild(edgesView);

    const orgById = new Map(data.organizations.map((o) => [o.id, o]));
    const groupById = new Map(data.groups.map((g) => [g.id, g]));

    for (const ln of layout.nodes) {
      const org = orgById.get(ln.orgId);
      if (!org) continue;
      const primaryGroupId = org.groupIds[0];
      const group = primaryGroupId ? groupById.get(primaryGroupId) : undefined;
      const node = OrganizationNodeView.create(org, group, resolvedTheme, theme.organization);
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
