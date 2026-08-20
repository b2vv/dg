/** Візуальний тип вузла на діаграмі */
export type NodeVisualKind = 'organization' | 'department' | 'person' | 'position';

export type PositionStatus = 'filled' | 'vacant' | 'acting';

/** Канонічна модель — те, з чим працює layout і render */
export interface DiagramData {
  organizations: DiagramOrganization[];
  groups: DiagramGroup[];
  departments: DiagramDepartment[];
  persons: DiagramPerson[];
  positions: DiagramPosition[];
  reportLines: DiagramReportLine[];
  /** Опційні matrix-зв'язки між org (sparse) */
  orgLinks?: DiagramOrgLink[];
}

export interface DiagramOrganization {
  id: string;
  name: string;
  symbolUrl?: string;
  symbolUrlLight?: string;
  symbolUrlDark?: string;
  parentOrgId?: string;
  groupIds: string[];
  collapsed?: boolean;
}

export interface DiagramGroup {
  id: string;
  name: string;
  emblemUrl?: string;
}

export interface DiagramDepartment {
  id: string;
  name: string;
  organizationId: string;
  /** Grid cells для tetris pack (заповнює layout) */
  layoutCells?: GridCell[];
  /** Плавний органічний контур (заповнює WASM після pack) */
  contour?: Point2D[];
}

export interface DiagramPerson {
  id: string;
  fullName: string;
  photoUrl?: string;
}

export interface DiagramPosition {
  id: string;
  title: string;
  organizationId: string;
  departmentId?: string;
  groupIds: string[];
  personId?: string;
  status: PositionStatus;
  isTemporary: boolean;
  /** Примітивні координати (після drag) */
  layoutX?: number;
  layoutY?: number;
  /** Grid slot для tetris pack */
  gridCell?: GridCell;
}

export interface DiagramReportLine {
  fromId: string;
  toId: string;
  kind: 'admin' | 'matrix' | 'dotted';
}

export interface DiagramOrgLink {
  fromOrgId: string;
  toOrgId: string;
  kind: 'administrative' | 'functional' | 'service';
}

export interface GridCell {
  col: number;
  row: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/** Порожній шаблон */
export function emptyDiagramData(): DiagramData {
  return {
    organizations: [],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [],
  };
}

/** Статистика після мапінгу */
export interface DiagramDataStats {
  organizations: number;
  groups: number;
  departments: number;
  persons: number;
  positions: number;
  reportLines: number;
  durationMs: number;
}

export function computeStats(data: DiagramData): Omit<DiagramDataStats, 'durationMs'> {
  return {
    organizations: data.organizations.length,
    groups: data.groups.length,
    departments: data.departments.length,
    persons: data.persons.length,
    positions: data.positions.length,
    reportLines: data.reportLines.length,
  };
}
