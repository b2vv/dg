/**
 * ⚠️ THROWAWAY probe scaffold — вимірювальний інструмент (plan `work/reports/shps-routing/`).
 *
 * Детектор перетину ребро↔ребро. У кодбазі такого НЕ було (лише сегмент↔картка
 * `staffEdgeGeometry.polylineHitsBoxInterior`). Це ядро рішення рушія — покрите контрольними
 * пробами в `crossingDetector.test.ts` (RED-first), бо сліпий детектор зробив би рішення недійсним.
 *
 * Визначення (req §5.3.1): перетин = транзверсальне (строге) перетинання сегмента однієї лінії
 * сегментом ІНШОЇ в точці, що не є спільною вузловою точкою. Спільний стовбур/шина одного керівника
 * (колінеарний overlap у точці розгалуження) — НЕ перетин (req §5.3.2, branch). Колінеарний overlap
 * ребер РІЗНИХ керівників — окреме порушення (req §5.3.3), рахуємо окремо.
 */

import type { ProbePoint, RouteEdge } from './probeTypes.js';

const EPS = 1e-9;

interface Seg {
  a: ProbePoint;
  b: ProbePoint;
  edgeIndex: number;
}

function cross(o: ProbePoint, a: ProbePoint, b: ProbePoint): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function sign(v: number): number {
  if (v > EPS) return 1;
  if (v < -EPS) return -1;
  return 0;
}

/** Строге транзверсальне перетинання двох сегментів у внутрішній точці обох. */
export function segmentsProperlyCross(p1: ProbePoint, p2: ProbePoint, p3: ProbePoint, p4: ProbePoint): boolean {
  const d1 = sign(cross(p3, p4, p1));
  const d2 = sign(cross(p3, p4, p2));
  const d3 = sign(cross(p1, p2, p3));
  const d4 = sign(cross(p1, p2, p4));
  // Обидва кінці кожного сегмента — по різні боки прямої іншого (жоден не колінеарний).
  return d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0 && d1 !== d2 && d3 !== d4;
}

function onSegment(p: ProbePoint, a: ProbePoint, b: ProbePoint): boolean {
  return (
    Math.min(a.x, b.x) - EPS <= p.x &&
    p.x <= Math.max(a.x, b.x) + EPS &&
    Math.min(a.y, b.y) - EPS <= p.y &&
    p.y <= Math.max(a.y, b.y) + EPS
  );
}

/** Колінеарний overlap двох сегментів ненульової довжини (НЕ лише дотик у точці). */
export function segmentsCollinearOverlap(p1: ProbePoint, p2: ProbePoint, p3: ProbePoint, p4: ProbePoint): boolean {
  if (sign(cross(p1, p2, p3)) !== 0 || sign(cross(p1, p2, p4)) !== 0) return false; // не колінеарні
  // Проекція на головну вісь сегмента; overlap ненульової довжини.
  const horizontal = Math.abs(p2.x - p1.x) >= Math.abs(p2.y - p1.y);
  const key = (p: ProbePoint) => (horizontal ? p.x : p.y);
  const lo1 = Math.min(key(p1), key(p2));
  const hi1 = Math.max(key(p1), key(p2));
  const lo2 = Math.min(key(p3), key(p4));
  const hi2 = Math.max(key(p3), key(p4));
  const overlap = Math.min(hi1, hi2) - Math.max(lo1, lo2);
  return overlap > EPS;
}

function segments(edge: RouteEdge, edgeIndex: number): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i + 1 < edge.points.length; i++) {
    const a = edge.points[i]!;
    const b = edge.points[i + 1]!;
    if (Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS) continue; // нульовий
    out.push({ a, b, edgeIndex });
  }
  return out;
}

export interface CrossingReport {
  /** Транзверсальні перетини (req §5.3.1) — головна метрика. */
  properCrossings: number;
  /** Колінеарні overlap-и ребер різних керівників (req §5.3.3). */
  collinearOverlaps: number;
  /** Точки перетинів для діагностики/візуальної позначки. */
  points: ProbePoint[];
}

/**
 * Рахує перетини між РІЗНИМИ ребрами. Сегменти одного ребра між собою не рахуються
 * (орто-полілінія не самоперетинається за побудовою). `sharedSource` — опційний предикат:
 * повертає true, якщо два ребра належать одному керівнику (спільний стовбур → не перетин навіть
 * якщо дотик); за замовчуванням транзверсальність сама це відсікає (стовбур колінеарний).
 */
export function edgeEdgeCrossings(
  edges: readonly RouteEdge[],
  sharedSource?: (a: RouteEdge, b: RouteEdge) => boolean,
): CrossingReport {
  const all: Seg[] = [];
  edges.forEach((e, i) => all.push(...segments(e, i)));
  let properCrossings = 0;
  let collinearOverlaps = 0;
  const points: ProbePoint[] = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const s = all[i]!;
      const t = all[j]!;
      if (s.edgeIndex === t.edgeIndex) continue; // одне ребро
      const sameManager = sharedSource?.(edges[s.edgeIndex]!, edges[t.edgeIndex]!) ?? false;
      if (segmentsProperlyCross(s.a, s.b, t.a, t.b)) {
        properCrossings++;
        points.push(intersectionPoint(s.a, s.b, t.a, t.b));
      } else if (!sameManager && segmentsCollinearOverlap(s.a, s.b, t.a, t.b)) {
        collinearOverlaps++;
      }
    }
  }
  return { properCrossings, collinearOverlaps, points };
}

function intersectionPoint(p1: ProbePoint, p2: ProbePoint, p3: ProbePoint, p4: ProbePoint): ProbePoint {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < EPS) return { x: p1.x, y: p1.y };
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

export { onSegment };
