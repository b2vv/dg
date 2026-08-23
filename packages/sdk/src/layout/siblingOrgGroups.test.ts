import { describe, expect, it } from 'vitest';
import { siblingOrgGroupBounds } from './siblingOrgGroups.js';
import type { OrgLayoutNode } from './types.js';

function node(
  id: string,
  parentId: string | undefined,
  x: number,
  y: number,
): OrgLayoutNode {
  return {
    id,
    orgId: id,
    x,
    y,
    width: 100,
    height: 80,
    depth: parentId ? 1 : 0,
    parentId,
  };
}

describe('siblingOrgGroupBounds', () => {
  it('success: frames 3+ siblings under one parent', () => {
    const nodes = [
      node('p', undefined, 200, 0),
      node('a', 'p', 0, 120),
      node('b', 'p', 120, 120),
      node('c', 'p', 240, 120),
    ];
    const groups = siblingOrgGroupBounds(nodes, 10);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.parentId).toBe('p');
    expect(groups[0]!.bounds.x).toBe(-10);
    expect(groups[0]!.bounds.width).toBe(360);
  });

  it('failure: single child → no group frame', () => {
    const nodes = [node('p', undefined, 0, 0), node('a', 'p', 0, 100)];
    expect(siblingOrgGroupBounds(nodes)).toEqual([]);
  });
});
