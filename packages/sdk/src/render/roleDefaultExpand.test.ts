import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import type { DiagramData, DiagramPosition } from '../data/types.js';

// #96 multi-org fixture (SPEC §2.2): leading org `lead` (parent of `cur`), current
// org `cur`, subordinate org `sub` (child of `cur`). Each org is a small admin tree
// so the role-based default can be observed through the seeded expand set:
//   lead (tier 1) → head-only, cur (tier 2) → all, sub (tier 3) → head-only.
function pos(id: string, organizationId: string, extra: Partial<DiagramPosition> = {}): DiagramPosition {
  return { id, title: id, organizationId, groupIds: [], status: 'filled', isTemporary: false, ...extra };
}

function multiOrgData(): DiagramData {
  return {
    organizations: [
      { id: 'lead', name: 'Leading', groupIds: [], role: 'leading' },
      { id: 'cur', name: 'Current', parentOrgId: 'lead', groupIds: [], role: 'current' },
      { id: 'sub', name: 'Subordinate', parentOrgId: 'cur', groupIds: [] },
    ],
    groups: [],
    departments: [],
    persons: [],
    positions: [
      // leading org: lh → l2 (lh has a child, so it is "expandable")
      pos('lh', 'lead', { isHead: true }),
      pos('l2', 'lead'),
      // current org: ch → c2 → c3 (ch, c2 are expandable; c3 is a leaf)
      pos('ch', 'cur', { isHead: true }),
      pos('c2', 'cur'),
      pos('c3', 'cur'),
      // subordinate org: sh → s2 (sh expandable)
      pos('sh', 'sub', { isHead: true }),
      pos('s2', 'sub'),
    ],
    reportLines: [
      { fromId: 'lh', toId: 'l2', kind: 'admin' },
      { fromId: 'ch', toId: 'c2', kind: 'admin' },
      { fromId: 'c2', toId: 'c3', kind: 'admin' },
      { fromId: 'sh', toId: 's2', kind: 'admin' },
    ],
  };
}

async function mount(data: DiagramData) {
  const container = document.createElement('div');
  container.style.width = '900px';
  container.style.height = '700px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data,
    staffCurrentOrgId: 'cur',
    useWorker: false,
    staffLayout: { staffCoordMode: 'tree' },
  });
  return { container, diagram };
}

describe('#96 role-based default expand (SPEC §2.2)', () => {
  it('AC3: current org expands, leading/subordinate stay head-only', async () => {
    const { container, diagram } = await mount(multiOrgData());
    // Only the current org's expandable positions are seeded; lead/sub (tiers 1/3)
    // default to head-only, so none of their ids appear.
    expect(diagram.getStaffExpandedPositionIds().sort()).toEqual(['c2', 'ch']);
    diagram.destroy();
    container.remove();
  });

  it('respects an explicit position.expanded tri-state', async () => {
    const data = multiOrgData();
    // Explicitly collapse a current-org branch, explicitly expand a leading head.
    data.positions = data.positions.map((p) => {
      if (p.id === 'ch') return { ...p, expanded: false }; // current → opt out of default-expand
      if (p.id === 'lh') return { ...p, expanded: true }; // leading → opt in
      return p;
    });
    const { container, diagram } = await mount(data);
    const ids = diagram.getStaffExpandedPositionIds().sort();
    expect(ids).toContain('lh'); // explicit expand honored in tier 1
    expect(ids).not.toContain('ch'); // explicit collapse honored in tier 2
    expect(ids).toContain('c2'); // sibling current-org branch keeps the default
    diagram.destroy();
    container.remove();
  });

  it('MERGE: a new current-org position arrives expanded, a manual collapse survives setData', async () => {
    const { container, diagram } = await mount(multiOrgData());
    // Manually collapse c2.
    expect(await diagram.togglePositionExpand('c2')).toBe(false);
    expect(diagram.getStaffExpandedPositionIds().sort()).toEqual(['ch']);

    // Host resends data: c2 carries its collapse (expanded:false), a brand-new
    // current-org branch c4→c5 arrives with no flag.
    const next = multiOrgData();
    next.positions = next.positions.map((p) => (p.id === 'c2' ? { ...p, expanded: false } : p));
    next.positions.push(pos('c4', 'cur'), pos('c5', 'cur'));
    next.reportLines.push(
      { fromId: 'ch', toId: 'c4', kind: 'admin' },
      { fromId: 'c4', toId: 'c5', kind: 'admin' },
    );
    await diagram.setData(next);

    const ids = diagram.getStaffExpandedPositionIds().sort();
    expect(ids).toContain('c4'); // new expandable current-org position → expanded
    expect(ids).toContain('ch'); // default-expanded head kept
    expect(ids).not.toContain('c2'); // manual collapse survived the update
    diagram.destroy();
    container.remove();
  });
});
