/**
 * ⚠️ THROWAWAY probe scaffold — рушій-кандидат B (ELK.js). plan `work/reports/shps-routing/`.
 *
 * ELK робить layout+ORTHOGONAL-routing. Департаменти = ієрархічні контейнери (щоб члени депу
 * трималися разом — та сама dept-constraint, що й у probe A, інакше порівняння нечесне).
 *
 * ⚠️ Координати ELK: секції ребра відносні до LCA його кінців. Для нашої ієрархії
 * (root → root-позиції + dept-контейнери → члени) LCA = департамент, якщо обидва кінці в ньому,
 * інакше root. Тому абсолют = зсув на абс. позицію департаменту, коли source й target в одному
 * депі; інакше секції вже root-absolute. Перевірено емпірично (e1 cross-hier=absolute,
 * e2 in-dept=dept-relative). Див. probeB.manual.md.
 *
 * ELK async-only → `engine` (sync контракт) кидає; харнес викликає `layoutElk` (async).
 */

import ELK from 'elkjs/lib/elk.bundled.js';
import type { ProbeBox, ProbeEngine, ProbePoint, RouteEdge, RouteInput, RouteOutput } from './probeTypes.js';
import { edgeEdgeCrossings } from './crossingDetector.js';

interface ElkNode {
  id: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  layoutOptions?: Record<string, string>;
  children?: ElkNode[];
  edges?: ElkEdge[];
}
interface ElkSection {
  startPoint: ProbePoint;
  endPoint: ProbePoint;
  bendPoints?: ProbePoint[];
}
interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
  sections?: ElkSection[];
}

function sortRows<T extends { order: number; id: string }>(xs: readonly T[]): T[] {
  return [...xs].sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));
}

export async function layoutElk(input: RouteInput): Promise<RouteOutput> {
  const elk = new ELK();
  const { cardWidth: w, cardHeight: h } = input;
  const deptOf = new Map(input.positions.map((p) => [p.id, p.deptId]));

  // root-позиції (deptId null) — прямі діти root; департаменти — контейнери.
  const rootPositions = sortRows(input.positions.filter((p) => p.deptId == null));
  const depts = sortRows(input.departments);

  const children: ElkNode[] = [];
  for (const p of rootPositions) children.push({ id: p.id, width: w, height: h });
  for (const d of depts) {
    const members = sortRows(input.positions.filter((p) => p.deptId === d.id));
    children.push({
      id: d.id,
      layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN' },
      children: members.map((m) => ({ id: m.id, width: w, height: h })),
    });
  }

  const elkEdges: ElkEdge[] = sortRows(input.positions)
    .filter((p) => p.parentId != null)
    .map((p) => ({ id: `e_${p.parentId}_${p.id}`, sources: [p.parentId!], targets: [p.id] }));

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.randomSeed': '1',
    },
    children,
    edges: elkEdges,
  };

  const res = (await elk.layout(graph as never)) as unknown as ElkNode;

  // Абсолютні позиції вузлів + рамки департаментів.
  const nodeAbs = new Map<string, ProbeBox>();
  const deptAbs = new Map<string, ProbePoint>();
  const deptFrames: ProbeBox[] = [];
  for (const c of res.children ?? []) {
    const cx = c.x ?? 0;
    const cy = c.y ?? 0;
    if (c.children && c.children.length > 0) {
      // департамент-контейнер
      deptAbs.set(c.id, { x: cx, y: cy });
      deptFrames.push({ id: c.id, x: cx, y: cy, w: c.width ?? 0, h: c.height ?? 0 });
      for (const m of c.children) {
        nodeAbs.set(m.id, { id: m.id, x: cx + (m.x ?? 0), y: cy + (m.y ?? 0), w: m.width ?? w, h: m.height ?? h });
      }
    } else {
      nodeAbs.set(c.id, { id: c.id, x: cx, y: cy, w: c.width ?? w, h: c.height ?? h });
    }
  }

  // Ребра: зсув секцій на LCA (той самий департамент → deptAbs; інакше root=0).
  const edges: RouteEdge[] = [];
  for (const e of res.edges ?? []) {
    const src = e.sources[0]!;
    const dst = e.targets[0]!;
    const sd = deptOf.get(src) ?? null;
    const dd = deptOf.get(dst) ?? null;
    const sameDept = sd != null && sd === dd;
    const off = sameDept ? (deptAbs.get(sd) ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
    const sec = e.sections?.[0];
    let points: ProbePoint[];
    if (sec) {
      points = [sec.startPoint, ...(sec.bendPoints ?? []), sec.endPoint].map((p) => ({ x: p.x + off.x, y: p.y + off.y }));
    } else {
      // фолбек: пряма між центрами портів
      const a = nodeAbs.get(src);
      const b = nodeAbs.get(dst);
      points = a && b ? [{ x: a.x + a.w / 2, y: a.y + a.h }, { x: b.x + b.w / 2, y: b.y }] : [];
    }
    edges.push({ fromId: src, toId: dst, kind: sameDept ? 'admin' : 'inter-dept', points });
  }

  // §12 драбина: позначити ребра, що лишились у перетині (marked:true).
  const report = edgeEdgeCrossings(edges, (a, b) => a.fromId === b.fromId);
  if (report.properCrossings > 0) {
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

  const nodes: ProbeBox[] = input.positions
    .map((p) => nodeAbs.get(p.id))
    .filter((n): n is ProbeBox => n != null);

  return { nodes, deptFrames: deptFrames.sort((a, b) => a.id.localeCompare(b.id)), edges };
}

/** ELK async-only — харнес викликає layoutElk напряму. */
export const engine: ProbeEngine = () => {
  throw new Error('probe B (ELK) is async — use layoutElk()');
};
