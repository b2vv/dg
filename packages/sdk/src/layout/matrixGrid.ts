import type { DiagramOrganization } from '../data/types.js';
import type { MatrixShape, OrgLayoutOptions } from './types.js';

export interface MatrixDimensions {
  rows: number;
  cols: number;
  bounded: boolean;
}

export interface MatrixCellAssignment {
  row: number;
  col: number;
  inMatrix: boolean;
}

type MatrixGridOptions = Pick<OrgLayoutOptions, 'matrixShape' | 'matrixRows' | 'matrixColumns'>;

export function resolveMatrixDimensions(
  orgCount: number,
  options: Required<MatrixGridOptions>,
): MatrixDimensions {
  const shape: MatrixShape = options.matrixShape ?? 'auto';

  if (shape === 'auto') {
    const cols =
      options.matrixColumns > 0 ? options.matrixColumns : Math.max(1, Math.ceil(Math.sqrt(orgCount)));
    return {
      rows: Math.max(1, Math.ceil(orgCount / cols)),
      cols,
      bounded: false,
    };
  }

  if (shape === 'square') {
    const side = Math.max(
      1,
      options.matrixRows || options.matrixColumns || Math.ceil(Math.sqrt(Math.max(1, orgCount))),
    );
    return { rows: side, cols: side, bounded: true };
  }

  const cols =
    options.matrixColumns > 0 ? options.matrixColumns : Math.max(1, Math.ceil(Math.sqrt(orgCount)));
  const rows =
    options.matrixRows > 0 ? options.matrixRows : Math.max(1, Math.ceil(orgCount / cols));
  return { rows, cols, bounded: true };
}

function sortOrgs(organizations: DiagramOrganization[]): DiagramOrganization[] {
  return [...organizations].sort(
    (a, b) => (a.matrixOrder ?? 0) - (b.matrixOrder ?? 0) || a.id.localeCompare(b.id),
  );
}

function isInsideGrid(row: number, col: number, dims: MatrixDimensions): boolean {
  // Guard against fractional coords (A8: matrixRow/Col from external data may be float).
  const r = Math.floor(row);
  const c = Math.floor(col);
  return r >= 0 && r < dims.rows && c >= 0 && c < dims.cols;
}

/** Normalize row/col to integers (A8). */
function normalizeCell(row: number, col: number): { row: number; col: number } {
  return { row: Math.floor(row), col: Math.floor(col) };
}

function firstEmptyCell(grid: (string | null)[][], dims: MatrixDimensions): { row: number; col: number } | null {
  for (let row = 0; row < dims.rows; row++) {
    for (let col = 0; col < dims.cols; col++) {
      if (!grid[row]![col]) {
        return { row, col };
      }
    }
  }
  return null;
}

function ejectFromCell(
  grid: (string | null)[][],
  assignments: Map<string, MatrixCellAssignment>,
  occupantId: string,
): void {
  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === occupantId) {
        row[colIndex] = null;
      }
    });
  });
  assignments.delete(occupantId);
}

function assignOverflow(
  assignments: Map<string, MatrixCellAssignment>,
  overflowIds: string[],
  dims: MatrixDimensions,
): void {
  let overflowRow = 0;
  for (const orgId of overflowIds) {
    if (assignments.has(orgId)) continue;
    assignments.set(orgId, {
      row: overflowRow,
      col: dims.cols,
      inMatrix: false,
    });
    overflowRow++;
  }
}

export function assignMatrixCells(
  organizations: DiagramOrganization[],
  dims: MatrixDimensions,
): Map<string, MatrixCellAssignment> {
  const sorted = sortOrgs(organizations);
  const assignments = new Map<string, MatrixCellAssignment>();

  if (!dims.bounded) {
    sorted.forEach((org, index) => {
      assignments.set(org.id, {
        row: Math.floor(index / dims.cols),  // already integer by construction
        col: index % dims.cols,
        inMatrix: true,
      });
    });
    return assignments;
  }

  const grid: (string | null)[][] = Array.from({ length: dims.rows }, () =>
    Array.from({ length: dims.cols }, () => null),
  );
  const overflowQueue: string[] = [];
  const ejectedIds = new Set<string>();

  const placeInGrid = (orgId: string, row: number, col: number, inMatrix: boolean) => {
    grid[row]![col] = orgId;
    assignments.set(orgId, { row, col, inMatrix });
  };

  // 1. Matrix members without explicit cell → row-major fill
  for (const org of sorted) {
    if (org.inMatrix === false) continue;
    if (
      org.matrixRow !== undefined &&
      org.matrixCol !== undefined &&
      isInsideGrid(org.matrixRow, org.matrixCol, dims)
    ) {
      continue;
    }
    const slot = firstEmptyCell(grid, dims);
    if (!slot) {
      overflowQueue.push(org.id);
      continue;
    }
    placeInGrid(org.id, slot.row, slot.col, true);
  }

  // 2. Matrix members with explicit cell
  for (const org of sorted) {
    if (org.inMatrix === false) continue;
    if (org.matrixRow === undefined || org.matrixCol === undefined) continue;
    const { row: mr, col: mc } = normalizeCell(org.matrixRow, org.matrixCol);
    if (!isInsideGrid(mr, mc, dims)) continue;
    if (assignments.has(org.id)) continue;

    const occupant = grid[mr]![mc];
    if (occupant && occupant !== org.id) {
      ejectFromCell(grid, assignments, occupant);
      ejectedIds.add(occupant);
      overflowQueue.push(occupant);
    }
    placeInGrid(org.id, mr, mc, true);
  }

  // 3. Foreign orgs with explicit cell → eject occupant
  for (const org of sorted) {
    if (org.inMatrix !== false) continue;
    if (org.matrixRow === undefined || org.matrixCol === undefined) {
      overflowQueue.push(org.id);
      continue;
    }
    const { row: mr, col: mc } = normalizeCell(org.matrixRow, org.matrixCol);
    if (!isInsideGrid(mr, mc, dims)) {
      overflowQueue.push(org.id);
      continue;
    }

    const occupant = grid[mr]![mc];
    if (occupant && occupant !== org.id) {
      ejectFromCell(grid, assignments, occupant);
      ejectedIds.add(occupant);
      overflowQueue.push(occupant);
    }
    placeInGrid(org.id, mr, mc, false);
  }

  // 4. Remaining orgs → overflow
  for (const org of sorted) {
    if (assignments.has(org.id)) continue;
    overflowQueue.push(org.id);
  }

  assignOverflow(assignments, overflowQueue, dims);
  return assignments;
}

/** Which org currently sits at `cell`, ignoring `exceptOrgId`. */
export function occupantAtCell(
  organizations: DiagramOrganization[],
  cell: { row: number; col: number },
  dims: Pick<MatrixDimensions, 'rows' | 'cols'>,
  exceptOrgId: string,
): string | undefined {
  const assignment = assignMatrixCells(organizations, { ...dims, bounded: true });
  for (const [id, at] of assignment) {
    if (id !== exceptOrgId && at.row === cell.row && at.col === cell.col) return id;
  }
  return undefined;
}

/** Placement result: the new list, plus whoever was pushed out of the cell. */
export interface MatrixPlacement {
  organizations: DiagramOrganization[];
  /** Undefined when the cell was free, or when nothing moved. */
  ejectedOrgId?: string;
}

/**
 * Move an org to (row,col), ejecting the current occupant from the matrix.
 *
 * Returns the ejected id too, because the host has to be told who moved — and
 * finding it out afterwards would mean a second `assignMatrixCells` pass over
 * every organization. {@link placeOrgAtMatrixCell} is the list-only form.
 */
export function applyMatrixPlacement(
  organizations: DiagramOrganization[],
  orgId: string,
  cell: { row: number; col: number },
  dims: Pick<MatrixDimensions, 'rows' | 'cols'>,
): MatrixPlacement {
  const { row, col } = cell;
  const target = organizations.find((o) => o.id === orgId);
  if (!target) return { organizations };

  // Persist integers so later assignMatrixCells occupant checks (cell.row === row) match.
  const { row: targetRow, col: targetCol } = normalizeCell(row, col);
  const boundedDims: MatrixDimensions = { ...dims, bounded: true };
  if (!isInsideGrid(targetRow, targetCol, boundedDims)) {
    return { organizations };
  }

  // Already persisted at this cell — no-op (do not rewrite inMatrix / eject).
  if (target.matrixRow === targetRow && target.matrixCol === targetCol) {
    return { organizations };
  }

  const occupantId = occupantAtCell(
    organizations,
    { row: targetRow, col: targetCol },
    boundedDims,
    orgId,
  );

  const placed = organizations.map((org) => {
    if (org.id === orgId) {
      // Keep inMatrix as authored. `?? false` would mark default members foreign (T78-L7).
      return {
        ...org,
        matrixRow: targetRow,
        matrixCol: targetCol,
      };
    }
    if (occupantId && org.id === occupantId) {
      const { matrixRow: _r, matrixCol: _c, ...rest } = org;
      return { ...rest, inMatrix: false };
    }
    return org;
  });

  return { organizations: placed, ejectedOrgId: occupantId };
}

/**
 * List-only placement (public API). Returns the input array unchanged when the
 * move is a no-op, which callers use as an «did anything move» check.
 */
export function placeOrgAtMatrixCell(
  organizations: DiagramOrganization[],
  orgId: string,
  row: number,
  col: number,
  dims: Pick<MatrixDimensions, 'rows' | 'cols'>,
): DiagramOrganization[] {
  return applyMatrixPlacement(organizations, orgId, { row, col }, dims).organizations;
}
