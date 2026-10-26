import { describe, expect, it } from '@rstest/core';
import { validateRouteInput } from './validateRouteInput.js';

describe('validateRouteInput', () => {
  it('accepts empty and single-position forests', () => {
    expect(validateRouteInput([], []).ok).toBe(true);
    expect(validateRouteInput([{ id: 'a', parentId: null }], []).ok).toBe(true);
  });
  it('rejects dangling, self-parent and cyclic parent links with structured errors', () => {
    for (const [positions, code] of [
      [[{ id: 'a', parentId: 'missing' }], 'dangling-parent'],
      [[{ id: 'a', parentId: 'a' }], 'self-parent'],
      [[{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }], 'cycle'],
    ] as const) {
      expect(validateRouteInput(positions, [])).toMatchObject({ ok: false, error: { code } });
    }
  });
  it('normalizes unknown departments and hides collapsed or hidden department members', () => {
    const result = validateRouteInput([
      { id: 'a', deptId: 'unknown' }, { id: 'b', deptId: 'closed' }, { id: 'c', deptId: 'hidden' },
    ], [{ id: 'closed', collapsed: true }, { id: 'hidden', hidden: true }]);
    expect(result).toMatchObject({ ok: true, positions: [{ id: 'a', deptId: null }] });
    if (result.ok) expect(result.diagnostics).toEqual(['unknown-department:a:unknown']);
  });
  it('sorts by parentId, order, id independent of input order', () => {
    const result = validateRouteInput([
      { id: 'z', parentId: 'root', order: 0 }, { id: 'root' },
      { id: 'a', parentId: 'root', order: 0 }, { id: 'b', parentId: 'root', order: -1 },
    ], []);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.positions.map((p) => p.id)).toEqual(['root', 'b', 'a', 'z']);
  });
});
