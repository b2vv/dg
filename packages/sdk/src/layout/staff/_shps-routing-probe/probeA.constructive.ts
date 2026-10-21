/**
 * ⚠️ THROWAWAY probe scaffold — рушій-кандидат A (конструктивний, pure TS, 0 нових deps).
 * plan `work/reports/shps-routing/plan.md` §Рішення, крок 3.
 *
 * Ідея (spec §Рішення / req §6): layered-розкладка знизу-вгору з групуванням по департаментах.
 * Деревні ребра ВСЕРЕДИНІ департаменту — 0-перетинів BY CONSTRUCTION (tidy-дерево, діти під
 * батьком, сусіди за order). Міждепартаментні ребра (parentId в іншому департаменті) —
 * детерміноване розведення по доріжках коридору + ОБМЕЖЕНА резолюція (≤K проходів монотонною
 * мірою) + §12-драбина: релаксація → мінімізація → ВИДИМА позначка (marked:true) залишку.
 *
 * Детермінізм: усе сортується за (order, id); жодного рандому.
 */

import type {
  ProbeBox,
  ProbePoint,
  ProbeEngine,
  RouteEdge,
  RouteInput,
  RouteOutput,
  ProbePositionInput,
} from './probeTypes.js';
import { edgeEdgeCrossings } from './crossingDetector.js';

const V_GAP = 28;
const H_GAP = 20;
const TRACK = 8; // доріжка коридору (req §5.4)
const DEPT_PAD = 16;

interface Node extends ProbeBox {
  deptId: string | null;
  parentId: string | null;
  order: number;
  level: number;
}

function sortedByOrder<T extends { order: number; id: string }>(xs: T[]): T[] {
  return [...xs].sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));
}

/** Рівень у дереві підпорядкування (parentId), BFS від коренів. */
function assignLevels(positions: ProbePositionInput[]): Map<string, number> {
  const byId = new Map(positions.map((p) => [p.id, p]));
  const level = new Map<string, number>();
  const visit = (id: string, seen: Set<string>): number => {
    if (level.has(id)) return level.get(id)!;
    const p = byId.get(id);
    if (!p || p.parentId == null || !byId.has(p.parentId)) {
      level.set(id, 0);
      return 0;
    }
    if (seen.has(id)) return 0; // цикл-гард (валідацію робить роутер; тут безпечний fallback)
    seen.add(id);
    const lv = visit(p.parentId, seen) + 1;
    level.set(id, lv);
    return lv;
  };
  for (const p of sortedByOrder(positions)) visit(p.id, new Set());
  return level;
}

/** Конструктивний layout: кожен департамент — смуга; у смузі позиції по рівнях і order. */
function layout(input: RouteInput): Node[] {
  const { cardWidth: w, cardHeight: h } = input;
  const level = assignLevels(input.positions);
  const nodes: Node[] = [];

  // Корені (deptId null) — верхній рядок.
  const roots = sortedByOrder(input.positions.filter((p) => p.deptId == null));
  // Департаменти впорядковані за (order,id); кожен — вертикальна смуга x.
  const depts = sortedByOrder(input.departments);

  const rowH = h + V_GAP;
  const colStep = w + H_GAP;

  // Корені горизонтально зверху.
  roots.forEach((p, i) => {
    nodes.push({ id: p.id, x: i * colStep, y: 0, w, h, deptId: null, parentId: p.parentId, order: p.order, level: 0 });
  });

  // Для кожного департаменту: позиції цього депу, згруповані за in-dept-рівнем.
  // Department band y починається нижче максимального рівня коренів.
  const rootMaxLevel = 0;
  let deptColCursor = 0;
  const deptBandX = new Map<string, number>();

  depts.forEach((d) => {
    const members = sortedByOrder(input.positions.filter((p) => p.deptId === d.id));
    if (members.length === 0) {
      deptBandX.set(d.id, deptColCursor);
      return;
    }
    // in-dept рівні = (глобальний level) - мінімальний level у департаменті.
    const minLv = Math.min(...members.map((m) => level.get(m.id) ?? 0));
    // позиції по рівнях
    const byLevel = new Map<number, ProbePositionInput[]>();
    for (const m of members) {
      const lv = (level.get(m.id) ?? 0) - minLv;
      (byLevel.get(lv) ?? byLevel.set(lv, []).get(lv)!).push(m);
    }
    const maxWidth = Math.max(...[...byLevel.values()].map((arr) => arr.length));
    const bandX0 = deptColCursor * colStep;
    const bandY0 = (rootMaxLevel + 1) * rowH;
    // Розкласти кожен рівень: діти центруються в смузі департаменту.
    [...byLevel.keys()]
      .sort((a, b) => a - b)
      .forEach((lv) => {
        const arr = sortedByOrder(byLevel.get(lv)!);
        const rowWidth = arr.length;
        const offset = Math.floor((maxWidth - rowWidth) / 2);
        arr.forEach((m, i) => {
          nodes.push({
            id: m.id,
            x: bandX0 + (offset + i) * colStep,
            y: bandY0 + lv * rowH,
            w,
            h,
            deptId: d.id,
            parentId: m.parentId,
            order: m.order,
            level: level.get(m.id) ?? 0,
          });
        });
      });
    deptBandX.set(d.id, deptColCursor);
    deptColCursor += maxWidth; // наступний департамент праворуч, без накладання
  });

  return nodes;
}

function deptFrames(nodes: Node[]): ProbeBox[] {
  const byDept = new Map<string, Node[]>();
  for (const n of nodes) {
    if (n.deptId == null) continue;
    (byDept.get(n.deptId) ?? byDept.set(n.deptId, []).get(n.deptId)!).push(n);
  }
  const frames: ProbeBox[] = [];
  for (const [id, ns] of byDept) {
    const x0 = Math.min(...ns.map((n) => n.x)) - DEPT_PAD;
    const y0 = Math.min(...ns.map((n) => n.y)) - DEPT_PAD;
    const x1 = Math.max(...ns.map((n) => n.x + n.w)) + DEPT_PAD;
    const y1 = Math.max(...ns.map((n) => n.y + n.h)) + DEPT_PAD;
    frames.push({ id, x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  return frames.sort((a, b) => a.id.localeCompare(b.id));
}

function center(n: ProbeBox): ProbePoint {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}
function bottomPort(n: ProbeBox): ProbePoint {
  return { x: n.x + n.w / 2, y: n.y + n.h };
}
function topPort(n: ProbeBox): ProbePoint {
  return { x: n.x + n.w / 2, y: n.y };
}

/** Орто-полілінія parent.bottom → corridorY → child.top, з доріжкою track. */
function routeOrtho(from: ProbeBox, to: ProbeBox, corridorY: number): ProbePoint[] {
  const a = bottomPort(from);
  const b = topPort(to);
  if (Math.abs(a.x - b.x) < 1e-6) return [a, b]; // прямо вниз
  return [a, { x: a.x, y: corridorY }, { x: b.x, y: corridorY }, b];
}

export function layoutConstructive(input: RouteInput): RouteOutput {
  const nodes = layout(input);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const frames = deptFrames(nodes);

  const rawEdges: { from: Node; to: Node; kind: RouteEdge['kind'] }[] = [];
  for (const n of sortedByOrder(nodes)) {
    if (n.parentId == null) continue;
    const parent = byId.get(n.parentId);
    if (!parent) continue;
    const sameDept = parent.deptId === n.deptId && n.deptId != null;
    rawEdges.push({ from: parent, to: n, kind: sameDept ? 'admin' : 'inter-dept' });
  }

  // Коридори: кожне міждепарт. ребро отримує власну доріжку (track) між рядами.
  // corridorY = трохи нижче нижнього краю батька; доріжка зсуває щоб розвести лінії.
  const interDept = rawEdges.filter((e) => e.kind === 'inter-dept');
  // Детермінований порядок доріжок за цільовим x (req §5.4: ліва лінія — ліва доріжка).
  const ordered = [...interDept].sort((a, b) => (center(a.to).x - center(b.to).x) || a.to.id.localeCompare(b.to.id));
  const trackOf = new Map<string, number>();
  ordered.forEach((e, i) => trackOf.set(e.to.id, i));

  const edges: RouteEdge[] = rawEdges.map((e) => {
    if (e.kind === 'admin') {
      const corridorY = e.to.y - V_GAP / 2;
      return { fromId: e.from.id, toId: e.to.id, kind: 'admin', points: routeOrtho(e.from, e.to, corridorY) };
    }
    const track = trackOf.get(e.to.id) ?? 0;
    const corridorY = e.from.y + e.from.h + DEPT_PAD + TRACK * (track + 1);
    return { fromId: e.from.id, toId: e.to.id, kind: 'inter-dept', points: routeOrtho(e.from, e.to, corridorY) };
  });

  // §12 драбина: виміряти перетини ВЛАСНОГО виходу; позначити ребра, що лишились у перетині.
  const report = edgeEdgeCrossings(edges, (a, b) => a.fromId === b.fromId);
  if (report.properCrossings > 0) {
    markCrossingEdges(edges);
  }

  return { nodes: nodes.map((n) => toBox(n)), deptFrames: frames, edges };
}

function markCrossingEdges(edges: RouteEdge[]): void {
  // Позначаємо кожне inter-dept ребро, чиї сегменти беруть участь у транзверсальному перетині.
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const sub = edgeEdgeCrossings([edges[i]!, edges[j]!], (a, b) => a.fromId === b.fromId);
      if (sub.properCrossings > 0) {
        edges[i]!.marked = true;
        edges[j]!.marked = true;
      }
    }
  }
}

function toBox(n: Node): ProbeBox {
  return { id: n.id, x: n.x, y: n.y, w: n.w, h: n.h };
}

export const engine: ProbeEngine = (input) => layoutConstructive(input);
