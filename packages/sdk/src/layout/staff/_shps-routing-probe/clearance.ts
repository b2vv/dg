/**
 * ⚠️ THROWAWAY probe scaffold — вимір кліренсу (plan `work/reports/shps-routing/`).
 *
 * Два критерії приймання (req §5.1, §10.4, §3.2):
 *  - 8px-кліренс: жоден сегмент ребра не ближче 8px до чужої картки (крім власних from/to).
 *  - крізь-третю-рамку: міждепарт. ребро не входить у рамку департаменту, що не джерело й не ціль.
 *
 * Кліренс рахуємо ТОЧНОЮ відстанню сегмент↔прямокутник (не семплінгом), бо це вимірювальний
 * інструмент — семпл `segmentHitsBoxInterior` міг би проґавити дотик на довгому сегменті.
 */

import type { ProbeBox, ProbePoint, RouteEdge, RouteOutput } from './probeTypes.js';

export const MIN_CLEARANCE_PX = 8;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function pointSegDist(p: ProbePoint, a: ProbePoint, b: ProbePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function orient(o: ProbePoint, a: ProbePoint, b: ProbePoint): number {
  const v = (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  return v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0;
}

function onSeg(p: ProbePoint, a: ProbePoint, b: ProbePoint): boolean {
  return (
    Math.min(a.x, b.x) - 1e-9 <= p.x &&
    p.x <= Math.max(a.x, b.x) + 1e-9 &&
    Math.min(a.y, b.y) - 1e-9 <= p.y &&
    p.y <= Math.max(a.y, b.y) + 1e-9
  );
}

/** true, якщо сегменти перетинаються (транзверсально, колінеарно чи дотиком). */
function segSegIntersect(a1: ProbePoint, a2: ProbePoint, b1: ProbePoint, b2: ProbePoint): boolean {
  const o1 = orient(a1, a2, b1);
  const o2 = orient(a1, a2, b2);
  const o3 = orient(b1, b2, a1);
  const o4 = orient(b1, b2, a2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSeg(b1, a1, a2)) return true;
  if (o2 === 0 && onSeg(b2, a1, a2)) return true;
  if (o3 === 0 && onSeg(a1, b1, b2)) return true;
  if (o4 === 0 && onSeg(a2, b1, b2)) return true;
  return false;
}

function segSegDist(a1: ProbePoint, a2: ProbePoint, b1: ProbePoint, b2: ProbePoint): number {
  if (segSegIntersect(a1, a2, b1, b2)) return 0;
  return Math.min(
    pointSegDist(a1, b1, b2),
    pointSegDist(a2, b1, b2),
    pointSegDist(b1, a1, a2),
    pointSegDist(b2, a1, a2),
  );
}

function pointInRect(p: ProbePoint, r: ProbeBox): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

/** Точна відстань сегмента до прямокутника (0 якщо перетинає). */
export function segRectDistance(a: ProbePoint, b: ProbePoint, r: ProbeBox): number {
  if (pointInRect(a, r) || pointInRect(b, r)) return 0;
  const corners: ProbePoint[] = [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ];
  let min = Infinity;
  for (let i = 0; i < 4; i++) {
    const c = corners[i]!;
    const d = corners[(i + 1) % 4]!;
    min = Math.min(min, segSegDist(a, b, c, d));
  }
  return min;
}

export interface ClearanceReport {
  /** Мінімальний кліренс ребро↔чужа-картка по всій схемі. */
  minClearance: number;
  /** Скільки сегмент-картка пар порушують 8px. */
  violations: number;
}

/** Мін. кліренс до будь-якої картки, що не є from/to даного ребра. */
export function cardClearance(output: RouteOutput): ClearanceReport {
  const nodeById = new Map(output.nodes.map((n) => [n.id, n]));
  let minClearance = Infinity;
  let violations = 0;
  for (const edge of output.edges) {
    for (const node of output.nodes) {
      if (node.id === edge.fromId || node.id === edge.toId) continue;
      for (let i = 0; i + 1 < edge.points.length; i++) {
        const d = segRectDistance(edge.points[i]!, edge.points[i + 1]!, node);
        if (d < minClearance) minClearance = d;
        if (d < MIN_CLEARANCE_PX) violations++;
      }
    }
  }
  void nodeById;
  return { minClearance: minClearance === Infinity ? MIN_CLEARANCE_PX : minClearance, violations };
}

/** Ребра (inter-dept), що входять у рамку департаменту, який не джерело й не ціль (req §3.2). */
export function throughThirdFrame(
  output: RouteOutput,
  deptOfNode: (nodeId: string) => string | null,
): number {
  let count = 0;
  for (const edge of output.edges) {
    const srcDept = deptOfNode(edge.fromId);
    const dstDept = deptOfNode(edge.toId);
    for (const frame of output.deptFrames) {
      if (frame.id === srcDept || frame.id === dstDept) continue;
      for (let i = 0; i + 1 < edge.points.length; i++) {
        if (segRectDistance(edge.points[i]!, edge.points[i + 1]!, frame) === 0) {
          count++;
          break;
        }
      }
    }
  }
  return count;
}

/** SVG-серіалізовність: полілінія з ≥2 точок → валідний path-рядок. */
export function svgSerializable(edges: readonly RouteEdge[]): boolean {
  return edges.every((e) => {
    if (e.points.length < 2) return false;
    const path = e.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');
    return /^M[-\d.]+,[-\d.]+( L[-\d.]+,[-\d.]+)+$/.test(path);
  });
}
