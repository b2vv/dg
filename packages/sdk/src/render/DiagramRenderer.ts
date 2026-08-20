import { Container } from 'pixi.js';
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
import { DepartmentBlobView } from './DepartmentBlob.js';
import { OrgEdgesView } from './OrgEdgesView.js';
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
  /** Tier-3 org card drill in staff canvas */
  onStaffOrgDrill?: (orgId: string) => void;
  /** Staff 3-tier focus; if omitted and positions exist, uses sole org or first with positions */
  staff?: {
    currentOrgId?: string;
    layout?: StaffLayoutOptions;
  };
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

  mount(stage: Container): void {
    stage.addChild(this.layers.root);
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

    const hasStaff = data.positions.length > 0;
    if (hasStaff) {
      await this.renderStaff(data, theme, resolvedTheme, config, options);
    } else if (data.organizations.length > 0) {
      await this.renderOrganizations(data, theme, resolvedTheme, options);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.layers.clear();
    this.layers.root.destroy({ children: true });
  }

  private async renderStaff(
    data: DiagramData,
    theme: NodeTheme,
    resolvedTheme: 'light' | 'dark',
    config: RenderConfig,
    options: RenderOptions,
  ): Promise<void> {
    const currentOrgId =
      options.staff?.currentOrgId ??
      inferStaffCurrentOrgId(data);

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

      for (const n of canvas.positionNodes) {
        const position = positionById.get(n.id);
        if (!position) continue;
        const person = position.personId ? personById.get(position.personId) : undefined;
        const node = PersonNodeView.create(person, position, theme.person);
        node.position.set(n.x, n.y);
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
        view.on('pointertap', () => {
          options.onStaffOrgDrill?.(card.orgId);
          options.onOrgClick?.(card.orgId);
        });
        this.layers.organizations.addChild(view);
      }
      return;
    }

    // Legacy: raw gridCell placement without org focus
    const contourInputs = diagramPositionsToContourInputs(data.positions);
    const computeContours = options.computeContours ?? computeAllContours;
    const deptById = new Map(data.departments.map((d) => [d.id, d]));
    const personById = new Map(data.persons.map((p) => [p.id, p]));
    const contours = await computeContours(contourInputs, {
      paddingCells: config.paddingCells,
      cellWidth: config.cellWidth,
      cellHeight: config.cellHeight,
      smoothIterations: config.smoothIterations,
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
      node.position.set(
        position.gridCell.col * config.cellWidth + 10,
        position.gridCell.row * config.cellHeight + 10,
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
      if (options.onOrgClick) {
        node.on('pointertap', () => options.onOrgClick!(org.id));
      }
      this.layers.organizations.addChild(node);
    }
  }
}

function inferStaffCurrentOrgId(data: DiagramData): string | undefined {
  const orgIds = [...new Set(data.positions.map((p) => p.organizationId))];
  if (orgIds.length === 1) return orgIds[0];
  if (data.organizations.length === 1) return data.organizations[0]!.id;
  // Prefer org that has isHead position and is not only a parent of others
  const withHead = data.positions.filter((p) => p.isHead).map((p) => p.organizationId);
  if (withHead.length === 1) return withHead[0];
  return orgIds[0];
}
