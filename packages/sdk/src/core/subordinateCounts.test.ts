import { describe, expect, it } from '@rstest/core';
import type { DiagramPosition, DiagramReportLine } from '../data/types.js';
import { computeSubordinateCounts } from './subordinateCounts.js';

function position(id: string): DiagramPosition {
  return {
    id,
    title: id,
    organizationId: 'org',
    groupIds: [],
    status: 'vacant',
    isTemporary: false,
  };
}
function admin(fromId: string, toId: string): DiagramReportLine {
  return { fromId, toId, kind: 'admin' };
}

describe('computeSubordinateCounts', () => {
  it('success: matches known host counts across head and detached trees, omitting leaves', () => {
    const positions = ['head', 'a', 'b', 'c', 'detached', 'd'].map((id) => position(id));
    const reports = [
      admin('head', 'a'),
      admin('head', 'b'),
      admin('a', 'c'),
      admin('detached', 'd'),
    ];
    expect(computeSubordinateCounts(positions, reports)).toEqual(
      new Map([
        ['head', { childrenCount: 2, allDescendantCount: 3 }],
        ['a', { childrenCount: 1, allDescendantCount: 1 }],
        ['detached', { childrenCount: 1, allDescendantCount: 1 }],
      ]),
    );
  });
  it('failure: cycles and duplicate edges terminate; duplicate child counts once', () => {
    // Duplicate a→b must not make childrenCount(2) exceed allDescendantCount(1):
    // distinct children, matching host node.children (a set).
    expect(
      computeSubordinateCounts(['a', 'b'].map((id) => position(id)), [
        admin('a', 'b'),
        admin('a', 'b'),
        admin('b', 'a'),
      ]),
    ).toEqual(
      new Map([
        ['a', { childrenCount: 1, allDescendantCount: 1 }],
        ['b', { childrenCount: 1, allDescendantCount: 1 }],
      ]),
    );
  });
  it('failure: missing endpoints, self loops and non-admin edges contribute nothing', () => {
    expect(
      computeSubordinateCounts(
        [position('a')],
        [
          admin('a', 'missing'),
          admin('missing', 'a'),
          admin('a', 'a'),
          { fromId: 'a', toId: 'a', kind: 'matrix' },
        ],
      ),
    ).toEqual(new Map());
    expect(computeSubordinateCounts([], [])).toEqual(new Map());
  });
});
