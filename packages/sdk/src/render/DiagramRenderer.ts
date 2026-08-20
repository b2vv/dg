import { Container } from 'pixi.js';
import type { DiagramData, DiagramDepartment } from '../data/types.js';
import {
  computeAllContours,
  type ContourMagnetConfig,
  type ContourPositionInput,
  type DeptContourResult,
} from '../contour/bridge.js';
import { diagramPositionsToContourInputs } from '../contour/config.js';
import { DepartmentBlobView } from './DepartmentBlob.js';
import { PersonNodeView } from './PersonNode.js';
import { OrganizationNodeView } from './OrganizationNode.js';
import type { NodeTheme, RenderConfig } from './types.js';
import { defaultRenderConfig } from './types.js';

export type ContourComputer = (
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
) => Promise<DeptContourResult[]>;

export interface RenderOptions {
  computeContours?: ContourComputer;
}

export class LayerManager {
  readonly root = new Container();
  readonly departments = new Container();
  readonly organizations = new Container();
  readonly persons = new Container();
  readonly overlay = new Container();

  constructor() {
    this.root.addChild(this.departments, this.organizations, this.persons, this.overlay);
  }

  clear(): void {
    this.departments.removeChildren();
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

    const hasStaffGrid = data.positions.some((p) => p.gridCell);
    if (hasStaffGrid) {
      await this.renderStaff(data, theme, config, options);
    }

    if (data.organizations.length > 0 && !hasStaffGrid) {
      this.renderOrganizations(data, theme, resolvedTheme);
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
    config: RenderConfig,
    options: RenderOptions,
  ): Promise<void> {
    const contourInputs = diagramPositionsToContourInputs(data.positions);
    const computeContours = options.computeContours ?? computeAllContours;

    const deptById = new Map(data.departments.map((d) => [d.id, d]));
    const personById = new Map(data.persons.map((p) => [p.id, p]));

    const contourConfig: ContourMagnetConfig = {
      paddingCells: config.paddingCells,
      cellWidth: config.cellWidth,
      cellHeight: config.cellHeight,
      smoothIterations: config.smoothIterations,
    };

    const contours = await computeContours(contourInputs, contourConfig);

    for (const contour of contours) {
      const dept = deptById.get(contour.departmentId);
      const label = dept?.name ?? contour.departmentId;
      const blob = DepartmentBlobView.fromPath(contour.path, label, theme.department);
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

  private renderOrganizations(
    data: DiagramData,
    theme: NodeTheme,
    resolvedTheme: 'light' | 'dark',
  ): void {
    const groupById = new Map(data.groups.map((g) => [g.id, g]));
    data.organizations.forEach((org, index) => {
      const primaryGroupId = org.groupIds[0];
      const group = primaryGroupId ? groupById.get(primaryGroupId) : undefined;
      const node = OrganizationNodeView.create(org, group, resolvedTheme, theme.organization);
      node.position.set(20, 20 + index * (theme.organization.height + 16));
      this.layers.organizations.addChild(node);
    });
  }
}
