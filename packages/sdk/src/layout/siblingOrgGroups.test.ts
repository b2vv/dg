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

const org = (id: string, collapsed?: boolean) => ({
  id,
  name: id,
  groupIds: [] as string[],
  collapsed,
});

describe('siblingOrgGroupBounds', () => {
  it('success: frames 3+ collapsed siblings under one parent', () => {
    const nodes = [
      node('p', undefined, 200, 0),
      node('a', 'p', 0, 120),
      node('b', 'p', 120, 120),
      node('c', 'p', 240, 120),
    ];
    const orgs = ['p', 'a', 'b', 'c'].map((id) => org(id, true));
    const groups = siblingOrgGroupBounds(nodes, orgs, 10);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.parentId).toBe('p');
    expect(groups[0]!.bounds.x).toBe(-10);
    expect(groups[0]!.bounds.width).toBe(360);
  });

  it('failure: expanded sibling → no dashed matrix frame', () => {
    const nodes = [
      node('p', undefined, 200, 0),
      node('a', 'p', 0, 120),
      node('b', 'p', 120, 120),
    ];
    const orgs = [org('p', true), org('a', false), org('b', true)];
    expect(siblingOrgGroupBounds(nodes, orgs)).toEqual([]);
  });

  it('failure: single child → no group frame', () => {
    const nodes = [node('p', undefined, 0, 0), node('a', 'p', 0, 100)];
    expect(siblingOrgGroupBounds(nodes, [org('p'), org('a')])).toEqual([]);
  });
});
