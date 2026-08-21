import { describe, expect, it } from 'vitest';
import { collapseAllOrgs, detectOrgMode } from '@org-hierarchy/sdk';
import {
  SCALE_ORG_TOTAL,
  buildScaleOrgsWindow,
  buildScaleParentIndex,
  parseScaleOrgQuery,
  resolveScaleWindowStart,
} from './scaleOrgs.js';

describe('scaleOrgs', () => {
  it('success: parent index length matches total and root has no parent', () => {
    const parents = buildScaleParentIndex(1_000);
    expect(parents.length).toBe(1_000);
    expect(parents[0]).toBe(-1);
    expect(parents[1]).toBe(0);
  });

  it('success: window materializes ≤ windowSize orgs (not 100k objects)', () => {
    const win = buildScaleOrgsWindow({
      total: SCALE_ORG_TOTAL,
      windowSize: 400,
      focusIndex: 50_000,
    });
    expect(win.data.organizations.length).toBe(400);
    expect(win.total).toBe(SCALE_ORG_TOTAL);
    expect(win.focusIndex).toBe(50_000);
    expect(win.data.organizations.some((o) => o.id === 'org-50000')).toBe(true);
  });

  it('success: default expands focus path → row-tree mode', () => {
    const win = buildScaleOrgsWindow({ total: 10_000, windowSize: 200, focusIndex: 5_000 });
    expect(detectOrgMode(win.data.organizations)).toBe('row-tree');
    const focus = win.data.organizations.find((o) => o.id === 'org-5000');
    expect(focus?.collapsed).toBe(false);
  });

  it('success: all collapsed (or collapseAll) → matrix', () => {
    const win = buildScaleOrgsWindow({
      total: 10_000,
      windowSize: 200,
      focusIndex: 5_000,
      expandFocusPath: false,
    });
    expect(detectOrgMode(win.data.organizations)).toBe('matrix');
    const tree = buildScaleOrgsWindow({ total: 10_000, windowSize: 200, focusIndex: 5_000 });
    expect(detectOrgMode(collapseAllOrgs(tree.data.organizations))).toBe('matrix');
  });

  it('success: parents of window nodes resolve inside the window', () => {
    const win = buildScaleOrgsWindow({ total: 10_000, windowSize: 200, focusIndex: 5_000 });
    const ids = new Set(win.data.organizations.map((o) => o.id));
    for (const o of win.data.organizations) {
      if (o.parentOrgId) expect(ids.has(o.parentOrgId)).toBe(true);
    }
  });

  it('success: resolveScaleWindowStart clamps near ends', () => {
    expect(resolveScaleWindowStart(0, 400, 100_000)).toBe(0);
    expect(resolveScaleWindowStart(99_999, 400, 100_000)).toBe(100_000 - 400);
  });

  it('success: parseScaleOrgQuery accepts org-N and bare N', () => {
    expect(parseScaleOrgQuery('org-42', 100)).toBe(42);
    expect(parseScaleOrgQuery('42', 100)).toBe(42);
  });

  it('failure: parseScaleOrgQuery out of range → null', () => {
    expect(parseScaleOrgQuery('org-999', 100)).toBeNull();
    expect(parseScaleOrgQuery('alice', 100)).toBeNull();
  });
});
