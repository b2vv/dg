import { describe, expect, it } from '@rstest/core';
import type { DiagramPosition, DiagramReportLine } from '../../data/types.js';
import { resolveDeptHeads } from './resolveDeptHeads.js';

function pos(id: string, departmentId?: string): DiagramPosition {
  return {
    id,
    title: id,
    organizationId: 'org1',
    departmentId,
    groupIds: [],
    status: 'filled',
    isTemporary: false,
  };
}

const admin = (fromId: string, toId: string): DiagramReportLine => ({ fromId, toId, kind: 'admin' });

describe('resolveDeptHeads', () => {
  it('head = the member whose admin parent is outside the department', () => {
    // org head `ceo` (no dept) manages `d1-head` (dept D1); `d1-head` manages `d1-sub`.
    const positions = [pos('ceo'), pos('d1-head', 'D1'), pos('d1-sub', 'D1')];
    const reports = [admin('ceo', 'd1-head'), admin('d1-head', 'd1-sub')];
    const heads = resolveDeptHeads(positions, reports);
    expect(heads.get('D1')).toBe('d1-head');
  });

  it('a member whose admin parent is inside the same department is not the head', () => {
    const positions = [pos('ceo'), pos('d1-head', 'D1'), pos('d1-sub', 'D1')];
    const reports = [admin('ceo', 'd1-head'), admin('d1-head', 'd1-sub')];
    const heads = resolveDeptHeads(positions, reports);
    expect(heads.get('D1')).not.toBe('d1-sub');
  });

  it('multi-root department picks a deterministic head by positionId (H6), not input order', () => {
    // Two detached roots in D1; both reach in from outside. Order flipped on input.
    const forward = [pos('ceo'), pos('d1-a', 'D1'), pos('d1-b', 'D1')];
    const flipped = [pos('ceo'), pos('d1-b', 'D1'), pos('d1-a', 'D1')];
    const reports = [admin('ceo', 'd1-a'), admin('ceo', 'd1-b')];
    expect(resolveDeptHeads(forward, reports).get('D1')).toBe('d1-a');
    expect(resolveDeptHeads(flipped, reports).get('D1')).toBe('d1-a');
  });

  it('positions with no department are ignored', () => {
    const heads = resolveDeptHeads([pos('ceo'), pos('solo')], []);
    expect(heads.size).toBe(0);
  });

  it('graceful: a department with no outside-rooted member yields no head (no crash)', () => {
    // Closed cycle inside the dept: every member has a parent inside the dept.
    const positions = [pos('a', 'D1'), pos('b', 'D1')];
    const reports = [admin('a', 'b'), admin('b', 'a')];
    const heads = resolveDeptHeads(positions, reports);
    expect(heads.has('D1')).toBe(false);
  });
});
