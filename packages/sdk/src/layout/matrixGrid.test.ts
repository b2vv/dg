import { describe, expect, it } from 'vitest';
import type { DiagramOrganization } from '../data/types.js';
import {
  assignMatrixCells,
  placeOrgAtMatrixCell,
  resolveMatrixDimensions,
} from './matrixGrid.js';

function org(
  id: string,
  order?: number,
  extra: Partial<DiagramOrganization> = {},
): DiagramOrganization {
  return { id, name: id, groupIds: [], matrixOrder: order, ...extra };
}

describe('resolveMatrixDimensions', () => {
  it('success: auto shape expands with org count', () => {
    const dims = resolveMatrixDimensions(10, { matrixShape: 'auto', matrixRows: 0, matrixColumns: 0 });
    expect(dims.bounded).toBe(false);
    expect(dims.cols).toBe(4);
    expect(dims.rows).toBe(3);
  });

  it('success: square shape is bounded N×N', () => {
    const dims = resolveMatrixDimensions(10, {
      matrixShape: 'square',
      matrixRows: 0,
      matrixColumns: 3,
    });
    expect(dims.bounded).toBe(true);
    expect(dims.rows).toBe(3);
    expect(dims.cols).toBe(3);
  });

  it('failure: rectangle without columns falls back to sqrt', () => {
    const dims = resolveMatrixDimensions(0, {
      matrixShape: 'rectangle',
      matrixRows: 2,
      matrixColumns: 0,
    });
    expect(dims.rows).toBe(2);
    expect(dims.cols).toBeGreaterThan(0);
  });
});

describe('assignMatrixCells', () => {
  it('success: square 2×2 holds 4 in-matrix, rest overflow', () => {
    const orgs = [
      org('a', 0),
      org('b', 1),
      org('c', 2),
      org('d', 3),
      org('e', 4),
    ];
    const assignments = assignMatrixCells(orgs, { rows: 2, cols: 2, bounded: true });
    expect(assignments.get('a')).toEqual({ row: 0, col: 0, inMatrix: true });
    expect(assignments.get('d')).toEqual({ row: 1, col: 1, inMatrix: true });
    expect(assignments.get('e')?.inMatrix).toBe(false);
    expect(assignments.get('e')?.col).toBe(2);
  });

  it('success: foreign org at occupied cell ejects occupant to overflow', () => {
    const orgs = [
      org('a', 0),
      org('b', 1),
      org('c', 2),
      org('foreign', 3, { inMatrix: false, matrixRow: 0, matrixCol: 0 }),
    ];
    const assignments = assignMatrixCells(orgs, { rows: 2, cols: 2, bounded: true });
    expect(assignments.get('foreign')).toEqual({ row: 0, col: 0, inMatrix: false });
    expect(assignments.get('a')?.inMatrix).toBe(false);
    expect(assignments.get('a')?.col).toBe(2);
    expect(assignments.get('b')?.inMatrix).toBe(true);
  });

  it('failure: explicit cell outside bounds is ignored', () => {
    const orgs = [org('a', 0, { matrixRow: 5, matrixCol: 5 })];
    const assignments = assignMatrixCells(orgs, { rows: 2, cols: 2, bounded: true });
    expect(assignments.get('a')).toEqual({ row: 0, col: 0, inMatrix: true });
  });
});

describe('placeOrgAtMatrixCell', () => {
  it('success: placing foreign org ejects occupant and updates data', () => {
    const orgs = [org('a', 0), org('b', 1), org('foreign', 2, { inMatrix: false })];
    const next = placeOrgAtMatrixCell(orgs, 'foreign', 0, 1, { rows: 2, cols: 2 });
    expect(next.find((o) => o.id === 'foreign')).toMatchObject({
      matrixRow: 0,
      matrixCol: 1,
      inMatrix: false,
    });
    expect(next.find((o) => o.id === 'b')?.inMatrix).toBe(false);
    expect(next.find((o) => o.id === 'b')?.matrixRow).toBeUndefined();
  });

  it('failure: unknown org id returns unchanged list', () => {
    const orgs = [org('a', 0)];
    const next = placeOrgAtMatrixCell(orgs, 'missing', 0, 0, { rows: 2, cols: 2 });
    expect(next).toBe(orgs);
  });

  it('success: fractional row/col are floored and persisted (A8/N1)', () => {
    // row-major 2×2: a → (0,0), b → (0,1). Floor(0.9, 1.2) = (0,1) ejects b.
    const orgs = [org('a', 0), org('b', 1)];
    const next = placeOrgAtMatrixCell(orgs, 'a', 0.9, 1.2, { rows: 2, cols: 2 });
    expect(next.find((o) => o.id === 'a')).toMatchObject({
      matrixRow: 0,
      matrixCol: 1,
    });
    expect(next.find((o) => o.id === 'b')?.inMatrix).toBe(false);
    expect(next.find((o) => o.id === 'b')?.matrixRow).toBeUndefined();
  });

  it('success: default member (undefined inMatrix) is not coerced to foreign (T78-L7)', () => {
    const orgs = [org('a', 0), org('b', 1)];
    const next = placeOrgAtMatrixCell(orgs, 'a', 0, 1, { rows: 2, cols: 2 });
    expect(next.find((o) => o.id === 'a')?.inMatrix).not.toBe(false);
    expect(next.find((o) => o.id === 'a')).toMatchObject({ matrixRow: 0, matrixCol: 1 });
  });

  it('failure: already at target cell is a same-reference no-op (T78-L7)', () => {
    const orgs = [org('a', 0, { matrixRow: 0, matrixCol: 1 }), org('b', 1)];
    const next = placeOrgAtMatrixCell(orgs, 'a', 0, 1, { rows: 2, cols: 2 });
    expect(next).toBe(orgs);
  });

  it('failure: out-of-bounds cell is a same-reference no-op (T78-L7)', () => {
    const orgs = [org('a', 0)];
    expect(placeOrgAtMatrixCell(orgs, 'a', 9, 9, { rows: 2, cols: 2 })).toBe(orgs);
  });
});
