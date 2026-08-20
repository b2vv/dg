import { describe, expect, it, vi } from 'vitest';
import type { ContourPositionInput, DeptContourResult } from './bridge.js';
import { createIncrementalContourComputer } from './incremental.js';

function pos(id: string, dept: string, col: number, row: number): ContourPositionInput {
  return { id, departmentId: dept, col, row };
}

function fakeResult(dept: string, tag: string): DeptContourResult {
  return {
    departmentId: dept,
    points: [],
    path: `M 0 0 Z /*${tag}*/`,
    cornerCount: 4,
  };
}

describe('createIncrementalContourComputer', () => {
  it('success: second identical call recomputes nothing', async () => {
    const computeAll = vi.fn(async (positions: ContourPositionInput[]) => {
      const depts = [...new Set(positions.map((p) => p.departmentId))];
      return depts.map((d) => fakeResult(d, 'all'));
    });
    const computeDept = vi.fn(async (id: string) => [fakeResult(id, 'dept')]);
    const computer = createIncrementalContourComputer(computeAll, computeDept);

    const positions = [
      pos('P1', 'IT', 0, 0),
      pos('P2', 'IT', 1, 0),
      pos('P4', 'CEO', 0, 1),
    ];

    const first = await computer(positions, { magnetRadius: 8 });
    expect(computeAll).toHaveBeenCalledTimes(1);
    expect(first.map((r) => r.departmentId).sort()).toEqual(['CEO', 'IT']);

    const second = await computer(positions, { magnetRadius: 8 });
    expect(computeAll).toHaveBeenCalledTimes(1);
    expect(computeDept).not.toHaveBeenCalled();
    expect(computer.lastDirtyDepartmentIds()).toEqual([]);
    expect(second).toEqual(first);
  });

  it('success: moving one dept only recomputes that dept', async () => {
    const computeAll = vi.fn(async (positions: ContourPositionInput[]) => {
      const depts = [...new Set(positions.map((p) => p.departmentId))];
      return depts.map((d) => fakeResult(d, 'all'));
    });
    const computeDept = vi.fn(async (id: string) => [fakeResult(id, `dept-${id}`)]);
    const computer = createIncrementalContourComputer(computeAll, computeDept);

    const base = [
      pos('P1', 'IT', 0, 0),
      pos('P2', 'IT', 1, 0),
      pos('P4', 'CEO', 0, 1),
    ];
    await computer(base, { magnetRadius: 8 });

    const moved = [
      pos('P1', 'IT', 2, 0),
      pos('P2', 'IT', 1, 0),
      pos('P4', 'CEO', 0, 1),
    ];
    const next = await computer(moved, { magnetRadius: 8 });
    expect(computeDept).toHaveBeenCalledTimes(1);
    expect(computeDept.mock.calls[0]?.[0]).toBe('IT');
    expect(computer.lastDirtyDepartmentIds()).toEqual(['IT']);
    expect(next.find((r) => r.departmentId === 'IT')?.path).toContain('dept-IT');
    expect(next.find((r) => r.departmentId === 'CEO')?.path).toContain('all');
  });

  it('failure: config change invalidates cache (full recompute)', async () => {
    const computeAll = vi.fn(async () => [fakeResult('IT', 'all')]);
    const computeDept = vi.fn(async (id: string) => [fakeResult(id, 'dept')]);
    const computer = createIncrementalContourComputer(computeAll, computeDept);
    const positions = [pos('P1', 'IT', 0, 0)];

    await computer(positions, { magnetRadius: 1.5 });
    await computer(positions, { magnetRadius: 8 });
    expect(computeAll).toHaveBeenCalledTimes(2);
    expect(computeDept).not.toHaveBeenCalled();
  });
});
