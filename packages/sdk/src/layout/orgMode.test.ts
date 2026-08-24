import { describe, expect, it } from 'vitest';
import {
  detectOrgMode,
  collapseAllOrgs,
  expandOrg,
  findExpandedRootIds,
  isOrgCollapsed,
} from './orgMode.js';
import type { DiagramOrganization } from '../data/types.js';

function org(id: string, collapsed?: boolean, parent?: string): DiagramOrganization {
  return { id, name: id, groupIds: [], parentOrgId: parent, collapsed };
}

describe('detectOrgMode', () => {
  it('success: all collapsed → matrix', () => {
    const orgs = [org('a', true), org('b', true)];
    expect(detectOrgMode(orgs)).toBe('matrix');
  });

  it('success: one expanded → row-tree', () => {
    const orgs = [org('a', false), org('b', true)];
    expect(detectOrgMode(orgs)).toBe('row-tree');
  });

  it('success: undefined collapsed treated as collapsed', () => {
    expect(detectOrgMode([org('a')])).toBe('matrix');
  });
});

describe('isOrgCollapsed', () => {
  it('success: undefined and true are collapsed; false is expanded', () => {
    expect(isOrgCollapsed(org('a'))).toBe(true);
    expect(isOrgCollapsed(org('a', true))).toBe(true);
    expect(isOrgCollapsed(org('a', false))).toBe(false);
  });
});

describe('findExpandedRootIds (T78-L3)', () => {
  it('success: two expanded top-level roots both returned', () => {
    const orgs = [org('a', false), org('b', false)];
    expect(findExpandedRootIds(orgs)).toEqual(['a', 'b']);
  });

  it('success: expanded child under collapsed parent is hidden, not a second root', () => {
    const orgs = [org('a', true), org('b', false, 'a')];
    expect(findExpandedRootIds(orgs)).toEqual([]);
  });

  it('failure: expanded child under expanded parent is not a second root', () => {
    const orgs = [org('a', false), org('b', false, 'a')];
    expect(findExpandedRootIds(orgs)).toEqual(['a']);
  });
});

describe('org state helpers', () => {
  it('success: collapseAllOrgs sets collapsed true', () => {
    const orgs = [org('a', false), org('b', false)];
    const next = collapseAllOrgs(orgs);
    expect(next.every(isOrgCollapsed)).toBe(true);
  });

  it('success: expandOrg expands target only', () => {
    const orgs = [org('a', true), org('b', true)];
    const next = expandOrg(orgs, 'b');
    expect(next.find((o) => o.id === 'b')?.collapsed).toBe(false);
    expect(next.find((o) => o.id === 'a')?.collapsed).toBe(true);
  });
});
