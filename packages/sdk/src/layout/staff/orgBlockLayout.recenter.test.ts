import { describe, it, expect } from '@rstest/core';
import { layoutStaffOrgBlock } from './orgBlockLayout.js';
import { classifyStaffEdgeRoute, type StaffEdgeBox } from '../staffEdgeGeometry.js';
import type { DiagramPosition, DiagramReportLine } from '../../data/types.js';

// Асиметричне дерево: Director → depA (3 листки) + depB (1 листок). WASM layered-tidy
// ставить корінь у midpoint першої/останньої дитини → він зсунутий у бік важчої гілки.
// Вимога мокапа — корінь над ПОВНИМ прольотом піддерева («над стрічкою депів»).
function pos(id: string, isHead = false): DiagramPosition {
  return { id, title: id, organizationId: 'org', isHead } as DiagramPosition;
}
const positions: DiagramPosition[] = [
  pos('dir', true),
  pos('depA'), pos('a1'), pos('a2'), pos('a3'),
  pos('depB'), pos('b1'),
];
const reports: DiagramReportLine[] = [
  { fromId: 'dir', toId: 'depA', kind: 'admin' },
  { fromId: 'dir', toId: 'depB', kind: 'admin' },
  { fromId: 'depA', toId: 'a1', kind: 'admin' },
  { fromId: 'depA', toId: 'a2', kind: 'admin' },
  { fromId: 'depA', toId: 'a3', kind: 'admin' },
  { fromId: 'depB', toId: 'b1', kind: 'admin' },
];

describe('root recentring over the full subtree span', () => {
  it('centres the root on the content bbox and leaves no edge forced', async () => {
    const block = await layoutStaffOrgBlock(positions, reports, 'org', {
      collapseUnexpandedPositions: false,
    });
    const root = block.nodes.find((n) => n.id === 'dir')!;
    const minX = Math.min(...block.nodes.map((n) => n.x));
    const maxX = Math.max(...block.nodes.map((n) => n.x + n.width));
    const contentCenter = (minX + maxX) / 2;
    const rootCenter = root.x + root.width / 2;

    // Корінь центрований над прольотом (а не в midpoint першої/останньої дитини —
    // без recentring тут був би помітний офсет у бік гілки depA).
    expect(Math.abs(rootCenter - contentCenter)).toBeLessThan(1);

    // Рух кореня не змушує жодне ребро йти forced-маршрутом (ребра деривуються з боксів).
    const boxes: StaffEdgeBox[] = block.nodes.map((n) => ({
      id: n.id, x: n.x, y: n.y, width: n.width, height: n.height,
    }));
    const byId = new Map(boxes.map((b) => [b.id, b]));
    const forced = block.edges.filter((e) => {
      const r = classifyStaffEdgeRoute(byId.get(e.fromId)!, byId.get(e.toId)!, 'admin', boxes, []);
      return r.via === 'forced';
    });
    expect(forced).toHaveLength(0);
  });
});
