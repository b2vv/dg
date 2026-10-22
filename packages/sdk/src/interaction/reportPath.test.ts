import { describe, expect, it } from '@rstest/core';
import type { DiagramReportLine } from '../data/types.js';
import { reportPath } from './reportPath.js';

const admin = (fromId: string, toId: string): DiagramReportLine => ({ fromId, toId, kind: 'admin' });
describe('reportPath', () => {
  it('success: ancestors and only direct children use raw edge keys', () => {
    const path = reportPath('b', [admin('r', 'a'), admin('a', 'b'), admin('b', 'c'), admin('b', 'd'), admin('c', 'e')]);
    expect(path.nodeKeys).toEqual(new Set(['r', 'a', 'b', 'c', 'd']));
    expect(path.edgeKeys).toEqual(new Set(['r\u0000a', 'a\u0000b', 'b\u0000c', 'b\u0000d']));
  });
  it('success: root includes its direct children', () => {
    expect(reportPath('r', [admin('r', 'a')]).edgeKeys).toEqual(new Set(['r\u0000a']));
  });
  it('success: empty or non-admin lines leave the root alone', () => {
    expect(reportPath('r', []).nodeKeys).toEqual(new Set(['r']));
    expect(reportPath('r', [{ fromId: 'r', toId: 'a', kind: 'matrix' }, { fromId: 'r', toId: 'b', kind: 'dotted' }])).toEqual({ nodeKeys: new Set(['r']), edgeKeys: new Set() });
  });
  it('failure: missing ids produce no path', () => {
    expect(reportPath('missing', [admin('r', 'a')]).nodeKeys.size).toBe(0);
    expect(reportPath('', []).nodeKeys.size).toBe(0);
  });
  it('failure: cycles and self-links terminate', () => {
    expect(reportPath('a', [admin('a', 'b'), admin('b', 'a')]).nodeKeys).toEqual(new Set(['a', 'b']));
    expect(reportPath('a', [admin('a', 'a')]).nodeKeys).toEqual(new Set(['a']));
  });
});
