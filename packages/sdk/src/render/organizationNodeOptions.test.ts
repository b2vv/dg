import { describe, expect, it, rstest } from '@rstest/core';
import type { DiagramData, DiagramOrganization } from '../data/types.js';
import { defaultRenderConfig } from './types.js';
import { orgStaffCardOptions, orgTreeOptions } from './organizationNodeOptions.js';

const org: DiagramOrganization = {
  id: 'root',
  name: 'Root organization',
  groupIds: [],
};

const dataWithoutChildren: DiagramData = {
  organizations: [org],
  groups: [],
  departments: [],
  persons: [],
  positions: [],
  reportLines: [],
};

const dataWithChildren: DiagramData = {
  ...dataWithoutChildren,
  organizations: [
    org,
    { id: 'child', name: 'Child organization', parentOrgId: org.id, groupIds: [] },
  ],
};

describe('orgTreeOptions', () => {
  it('failure: returns only the base options when no organization handlers are supplied', () => {
    expect(orgTreeOptions(org, dataWithoutChildren, {})).toEqual({
      loadTexture: undefined,
      prefetchInactiveSymbol: false,
    });
  });

  it('failure: omits tree chrome when the organization has no children', () => {
    expect(orgTreeOptions(org, dataWithoutChildren, { onOrgExpand: () => {} }).chrome).toBeUndefined();
  });

  it('success: describes collapsed chrome and forwards expand and collapse', () => {
    const onOrgExpand = rstest.fn();
    const onOrgCollapse = rstest.fn();
    const chrome = orgTreeOptions(org, dataWithChildren, { onOrgExpand, onOrgCollapse }).chrome;

    expect(chrome).toMatchObject({ kind: 'tree', collapsed: true, hasChildren: true });
    if (chrome?.kind !== 'tree') throw new Error('Expected tree chrome');
    chrome.onExpand();
    chrome.onCollapse();
    expect(onOrgExpand).toHaveBeenCalledWith('root');
    expect(onOrgCollapse).toHaveBeenCalledWith('root');
  });

  it('success: describes expanded tree chrome when collapsed is false', () => {
    const expandedOrg = { ...org, collapsed: false };
    const chrome = orgTreeOptions(expandedOrg, dataWithChildren, { onOrgExpand: () => {} }).chrome;

    expect(chrome).toMatchObject({ kind: 'tree', collapsed: false, hasChildren: true });
  });

  it('success: forwards context-menu coordinates with zero canvas coordinates', () => {
    const onOrgContextMenu = rstest.fn();
    const onContextMenu = orgTreeOptions(org, dataWithoutChildren, { onOrgContextMenu }).onContextMenu;

    onContextMenu?.({ clientX: 12, clientY: 34 });
    expect(onOrgContextMenu).toHaveBeenCalledWith('root', {
      clientX: 12,
      clientY: 34,
      canvasX: 0,
      canvasY: 0,
    });
  });

  it('success: prefetches the inactive symbol only when explicitly enabled', () => {
    expect(orgTreeOptions(org, dataWithoutChildren, {}).prefetchInactiveSymbol).toBe(false);
    expect(
      orgTreeOptions(org, dataWithoutChildren, {}, {
        ...defaultRenderConfig,
        prefetchInactiveOrgSymbol: true,
      }).prefetchInactiveSymbol,
    ).toBe(true);
    expect(
      orgTreeOptions(org, dataWithoutChildren, {}, {
        ...defaultRenderConfig,
        prefetchInactiveOrgSymbol: false,
      }).prefetchInactiveSymbol,
    ).toBe(false);
  });
});

describe('orgStaffCardOptions', () => {
  it('failure: omits staff chrome without an expand-toggle handler', () => {
    expect(orgStaffCardOptions(org, {}, {}).chrome).toBeUndefined();
  });

  it('success: defaults expanded to false, reports staff, and forwards toggle', () => {
    const onStaffOrgExpandToggle = rstest.fn();
    const chrome = orgStaffCardOptions(
      org,
      { positionCount: 1 },
      { onStaffOrgExpandToggle },
    ).chrome;

    expect(chrome).toMatchObject({ kind: 'staff-expand', expanded: false, hasStaff: true });
    if (chrome?.kind !== 'staff-expand') throw new Error('Expected staff-expand chrome');
    chrome.onToggle();
    expect(onStaffOrgExpandToggle).toHaveBeenCalledWith('root');
  });

  it('failure: reports no staff when positionCount is zero', () => {
    const chrome = orgStaffCardOptions(
      org,
      { expanded: true, positionCount: 0 },
      { onStaffOrgExpandToggle: () => {} },
    ).chrome;

    expect(chrome).toMatchObject({ kind: 'staff-expand', expanded: true, hasStaff: false });
  });

  it('failure: reports no staff when positionCount is undefined', () => {
    const chrome = orgStaffCardOptions(org, {}, { onStaffOrgExpandToggle: () => {} }).chrome;

    expect(chrome).toMatchObject({ kind: 'staff-expand', expanded: false, hasStaff: false });
  });

  it('success: forwards context-menu coordinates with zero canvas coordinates', () => {
    const onOrgContextMenu = rstest.fn();
    const onContextMenu = orgStaffCardOptions(org, {}, { onOrgContextMenu }).onContextMenu;

    onContextMenu?.({ clientX: 56, clientY: 78 });
    expect(onOrgContextMenu).toHaveBeenCalledWith('root', {
      clientX: 56,
      clientY: 78,
      canvasX: 0,
      canvasY: 0,
    });
  });

  it('success: prefetches the inactive symbol only when explicitly enabled', () => {
    expect(orgStaffCardOptions(org, {}, {}).prefetchInactiveSymbol).toBe(false);
    expect(
      orgStaffCardOptions(org, {}, {}, {
        ...defaultRenderConfig,
        prefetchInactiveOrgSymbol: true,
      }).prefetchInactiveSymbol,
    ).toBe(true);
    expect(
      orgStaffCardOptions(org, {}, {}, {
        ...defaultRenderConfig,
        prefetchInactiveOrgSymbol: false,
      }).prefetchInactiveSymbol,
    ).toBe(false);
  });
});
