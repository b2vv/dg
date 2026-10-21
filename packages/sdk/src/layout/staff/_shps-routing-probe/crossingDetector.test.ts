import { describe, expect, it } from '@rstest/core';
import {
  edgeEdgeCrossings,
  segmentsCollinearOverlap,
  segmentsProperlyCross,
} from './crossingDetector.js';
import type { RouteEdge } from './probeTypes.js';

const P = (x: number, y: number) => ({ x, y });
function edge(id: string, points: { x: number; y: number }[]): RouteEdge {
  return { fromId: id + ':from', toId: id + ':to', kind: 'admin', points };
}

describe('crossingDetector — вимірювальний інструмент (контрольні проби)', () => {
  // КОНТРОЛЬНА ПРОБА (MUST register): дві лінії навхрест → перетин є.
  it('control: transversal X crosses', () => {
    expect(segmentsProperlyCross(P(0, 0), P(10, 10), P(0, 10), P(10, 0))).toBe(true);
  });

  // КОНТРОЛЬНА ПРОБА (MUST NOT register): паралельні → перетину нема.
  it('control: parallel segments do not cross', () => {
    expect(segmentsProperlyCross(P(0, 0), P(10, 0), P(0, 5), P(10, 5))).toBe(false);
  });

  // Дотик у спільному кінці (вузол дерева) — НЕ транзверсальний перетин (req §5.3.1).
  it('shared endpoint (tree node) is not a crossing', () => {
    expect(segmentsProperlyCross(P(0, 0), P(10, 0), P(10, 0), P(10, 10))).toBe(false);
  });

  // T-стик: кінець одного лежить на сегменті іншого — не транзверсальний (improper).
  it('T-junction (endpoint on segment interior) is not a proper crossing', () => {
    expect(segmentsProperlyCross(P(0, 0), P(10, 0), P(5, 0), P(5, 10))).toBe(false);
  });

  it('collinear overlap detected (different managers share a segment — req §5.3.3)', () => {
    expect(segmentsCollinearOverlap(P(0, 0), P(10, 0), P(5, 0), P(15, 0))).toBe(true);
  });

  it('collinear touch at single point is NOT overlap', () => {
    expect(segmentsCollinearOverlap(P(0, 0), P(10, 0), P(10, 0), P(20, 0))).toBe(false);
  });

  // Орто L-шляхи двох РІЗНИХ ребер, що перетинаються.
  it('edgeEdgeCrossings: two orthogonal L-paths crossing → 1', () => {
    const a = edge('a', [P(0, 0), P(0, 10), P(20, 10)]); // вниз, тоді вправо на y=10
    const b = edge('b', [P(-10, 5), P(30, 5)]); // горизонталь на y=5 через вертикаль a
    const r = edgeEdgeCrossings([a, b]);
    expect(r.properCrossings).toBe(1);
    expect(r.points).toHaveLength(1);
  });

  // Завідомо ЧИСТИЙ вхід → 0 (інакше інструмент дає хибний червоний).
  it('edgeEdgeCrossings: disjoint parallel edges → 0', () => {
    const a = edge('a', [P(0, 0), P(0, 10)]);
    const b = edge('b', [P(50, 0), P(50, 10)]);
    const r = edgeEdgeCrossings([a, b]);
    expect(r.properCrossings).toBe(0);
    expect(r.collinearOverlaps).toBe(0);
  });

  // Спільний стовбур одного керівника: дві гілки колінеарні на стовбурі → не перетин,
  // і overlap не рахується, бо sharedSource каже «той самий керівник».
  it('edgeEdgeCrossings: shared trunk of same manager is not counted', () => {
    const a = edge('mgr', [P(0, 0), P(0, 10), P(-10, 10)]); // стовбур вниз, гілка вліво
    const b = edge('mgr', [P(0, 0), P(0, 10), P(10, 10)]); // той самий стовбур, гілка вправо
    const sameManager = () => true;
    const r = edgeEdgeCrossings([a, b], sameManager);
    expect(r.properCrossings).toBe(0);
    expect(r.collinearOverlaps).toBe(0);
  });

  // Той самий стовбур, але БЕЗ предиката sharedSource → overlap фіксується (різні керівники).
  it('edgeEdgeCrossings: identical trunk of DIFFERENT managers → collinear overlap flagged', () => {
    const a = edge('a', [P(0, 0), P(0, 10), P(-10, 10)]);
    const b = edge('b', [P(0, 0), P(0, 10), P(10, 10)]);
    const r = edgeEdgeCrossings([a, b]);
    expect(r.properCrossings).toBe(0);
    expect(r.collinearOverlaps).toBeGreaterThan(0);
  });
});
