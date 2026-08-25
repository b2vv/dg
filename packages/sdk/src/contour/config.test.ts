import { describe, expect, it } from 'vitest';
import { diagramPositionsToContourInputs, MAX_SMOOTH_ITERATIONS, toRustConfig } from './config.js';
import { NO_DEPARTMENT_ID } from '../data/types.js';

describe('toRustConfig', () => {
  it('success: smoothIterations above cap clamp to MAX_SMOOTH_ITERATIONS (A9)', () => {
    expect(toRustConfig({ smoothIterations: 20 }).smooth_iterations).toBe(MAX_SMOOTH_ITERATIONS);
    expect(toRustConfig({ smoothIterations: 8 }).smooth_iterations).toBe(8);
    expect(toRustConfig({}).smooth_iterations).toBe(2);
  });
});

describe('diagramPositionsToContourInputs', () => {
  it('success: keeps every seat with coords, department or not', () => {
    const inputs = diagramPositionsToContourInputs([
      { id: 'a', departmentId: 'IT', gridCell: { col: 0, row: 0 } },
      { id: 'b', gridCell: { col: 1, row: 0 } },
      { id: 'c', departmentId: '', gridCell: { col: 2, row: 0 } },
    ]);
    expect(inputs).toEqual([
      { id: 'a', departmentId: 'IT', col: 0, row: 0 },
      { id: 'b', departmentId: NO_DEPARTMENT_ID, col: 1, row: 0 },
      { id: 'c', departmentId: NO_DEPARTMENT_ID, col: 2, row: 0 },
    ]);
  });

  it('failure: a seat without coords cannot join a cell grid', () => {
    expect(diagramPositionsToContourInputs([{ id: 'a', departmentId: 'IT' }])).toEqual([]);
  });
});
