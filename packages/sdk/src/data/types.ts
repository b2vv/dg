/**
 * Візуальний тип вузла на діаграмі.
 * @deprecated T77-M09: no readers inside the repo. Use `NodeRef['kind']` instead.
 */
export type NodeVisualKind = 'organization' | 'department' | 'person' | 'position';

export type PositionStatus = 'filled' | 'vacant' | 'acting';

/** Theme-keyed media URLs (T74). Host supplies URLs; SDK loads textures. */
export interface ThemedMedia {
  fallback?: string;
  byTheme?: Record<string, string>;
  revision?: string | number;
}

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
  /** Official / long name when symbol missing (E3) or captions need it. */
  fullName?: string;
  /** When false, hide short name beside symbol (E1). Default: show name. */
  showShortName?: boolean;
  /** Structural / unit code caption (E6). */
  unitCode?: string;
  /** Temporary structure marker on org card (E4). */
  isTemporary?: boolean;
  /** Badge N in `N [M]` (E5) — filled / occupied; confirm with BE. */
  filledCount?: number;
  /** Badge M in `N [M]` (E5) — vacant seats. */
  vacantCount?: number;
  /** GoJS tree badge N — direct child org count. */
  childrenCount?: number;
  /** GoJS tree badge M — all descendant org count. */
  allDescendantCount?: number;
  /** Org validity / subordination window start (ISO date). */
  periodStart?: string;
  /** End date; `null` = open-ended («по т.ч.»). */
  periodEnd?: string | null;
  /** Preformatted period line from host (wins over SDK formatting). */
  periodLabel?: string;
  /** Canonical themed symbol URLs (T74). Wins over legacy symbolUrl* when set. */
  media?: ThemedMedia;
  /** Host taxonomy: org subtype (e.g. military | civilian | group) — placeholder key (T74). */
  entityType?: string;
  symbolUrl?: string;
  symbolUrlLight?: string;
  symbolUrlDark?: string;
  parentOrgId?: string;
  groupIds: string[];
  collapsed?: boolean;
  /** Порядок у matrix mode (D&D reorder) */
  matrixOrder?: number;
  /** false — org поза фіксованою матрицею (може виштовхувати інші) */
  inMatrix?: boolean;
  /** Явна позиція у matrix grid (row/col) */
  matrixRow?: number;
  matrixCol?: number;
  /** Stable e2e / automation id (DOM: data-testid="node-<testId>"). Default: id. */
  testId?: string;
}

export interface DiagramGroup {
  id: string;
  name: string;
  /** @deprecated Q29 — put media on org with entityType `group`. Caption-only record. */
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
  media?: ThemedMedia;
  entityType?: string;
  testId?: string;
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
  /** Керівна посада org (staff root); рівно одна на org */
  isHead?: boolean;
  /**
   * Host hint: seat has no admin manager (T65 / B9).
   * Layout also **infers** detached when the seat is in-org, not `isHead`,
   * and has no admin parent in `reportLines` — flag is optional additive.
   */
  detached?: boolean;
  /** Розмір картки (staff layout AABB) */
  width?: number;
  height?: number;
  /** Примітивні координати (після drag) — локальні px org */
  layoutX?: number;
  layoutY?: number;
  /** Альтернатива layoutX/Y */
  layoutCoords?: Point2D;
  /** Grid slot для matrix / contour */
  gridCell?: GridCell;
  /** Staff hierarchy band (block shift) */
  hierarchyLevel?: number;
  /**
   * When true and `collapseUnexpandedPositions` is on, admin-report children are laid out.
   * Default omitted/false — only honored when collapse mode is enabled (T66).
   */
  expanded?: boolean;
  /** Assignment / acting window on the seat (E7 chip). */
  periodStart?: string;
  periodEnd?: string | null;
  periodLabel?: string;
  /** GoJS row 2 — direct report count badge. */
  childrenCount?: number;
  /** GoJS row 2 — all descendant count badge. */
  allDescendantCount?: number;
  /** Key position — brand stroke + name color (GoJS). */
  isKeyPosition?: boolean;
  /** Pending assignment — hourglass marker (GoJS, distinct from isTemporary). */
  pending?: boolean;
  media?: ThemedMedia;
  entityType?: string;
  testId?: string;
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
