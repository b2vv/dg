/**
 * ⚠️ THROWAWAY probe scaffold — фікстури схем приймання §10.1 (req
 * `4311-shps-line-routing-requirements.md`). Вхід для ОБОХ рушіїв (symmetric).
 *
 * Моделюємо топологію, не pixel-pack: card розмір фіксований (dg default 136×156).
 * `parentId` — звʼязок підпорядкування (admin reportLine: керівник→підлеглий);
 * `deptId` — належність до департаменту; `parentPositionId` департаменту — керівна посада (§2).
 */

import type { RouteInput, ProbePositionInput, ProbeDepartmentInput } from './probeTypes.js';

const CARD_W = 136;
const CARD_H = 156;

function pos(id: string, parentId: string | null, deptId: string | null, order = 0): ProbePositionInput {
  return { id, parentId, deptId, order };
}
function dept(id: string, parentPositionId: string | null, order = 0): ProbeDepartmentInput {
  return { id, parentPositionId, order };
}
function input(positions: ProbePositionInput[], departments: ProbeDepartmentInput[]): RouteInput {
  return { positions, departments, cardWidth: CARD_W, cardHeight: CARD_H };
}

/** §10.1 сх.2 — три департаменти на одному рівні під одним керівником (поточний макет). */
export function scheme2(): RouteInput {
  const positions: ProbePositionInput[] = [pos('H', null, null, 0)];
  const departments: ProbeDepartmentInput[] = [];
  ['D1', 'D2', 'D3'].forEach((d, di) => {
    departments.push(dept(d, 'H', di));
    const lead = `${d}-lead`;
    positions.push(pos(lead, 'H', d, di), pos(`${d}-a`, lead, d, 0), pos(`${d}-b`, lead, d, 1));
  });
  return input(positions, departments);
}

/**
 * §10.1.4 (сх.4) — КЛЮЧОВА feasibility: два керівники РІЗНИХ департаментів (A, B) мають підлеглих
 * у СПІЛЬНОМУ департаменті C. Лінії aLead→c1 і bLead→c2 входять у C з різних боків → коридор/
 * доріжки; саме тут 0-перетинів може бути математично недосяжним (req §12).
 */
export function scheme4(): RouteInput {
  const positions: ProbePositionInput[] = [
    pos('H', null, null, 0),
    pos('A-lead', 'H', 'A', 0),
    pos('B-lead', 'H', 'B', 1),
    // підлеглі у спільному C, але підпорядковані керівникам різних департаментів:
    pos('C-1', 'A-lead', 'C', 0),
    pos('C-2', 'B-lead', 'C', 1),
    pos('C-3', 'A-lead', 'C', 2),
    pos('C-4', 'B-lead', 'C', 3),
  ];
  const departments: ProbeDepartmentInput[] = [
    dept('A', 'H', 0),
    dept('B', 'H', 1),
    dept('C', 'H', 2),
  ];
  return input(positions, departments);
}

/**
 * §10.1 сх.5 — звʼязок через рівень: ціль на 2 рівні нижче, між джерелом і ціллю інший
 * департамент (B). Лінія aLead→cTarget мусить обійти рамку B.
 */
export function scheme5(): RouteInput {
  const positions: ProbePositionInput[] = [
    pos('H', null, null, 0),
    pos('A-lead', 'H', 'A', 0),
    pos('B-lead', 'H', 'B', 1),
    pos('B-a', 'B-lead', 'B', 0),
    pos('B-b', 'B-lead', 'B', 1),
    pos('C-lead', 'H', 'C', 2),
    // ціль у C на 2 рівні нижче A-lead, з B посередині:
    pos('C-target', 'A-lead', 'C', 0),
  ];
  const departments: ProbeDepartmentInput[] = [
    dept('A', 'H', 0),
    dept('B', 'H', 1),
    dept('C', 'H', 2),
  ];
  return input(positions, departments);
}

/** Синтетична схема ~N посад для перф-гейту (≤50мс/500, req §8.4). Збалансоване дерево по депах. */
export function perfScheme(target = 500): RouteInput {
  const positions: ProbePositionInput[] = [pos('H', null, null, 0)];
  const departments: ProbeDepartmentInput[] = [];
  const deptCount = 10;
  let made = 1;
  for (let d = 0; d < deptCount && made < target; d++) {
    const dId = `D${d}`;
    departments.push(dept(dId, 'H', d));
    const lead = `${dId}-lead`;
    positions.push(pos(lead, 'H', dId, d));
    made++;
    // два рівні підлеглих
    let level1 = 0;
    while (made < target && level1 < 7) {
      const l1 = `${dId}-l1-${level1}`;
      positions.push(pos(l1, lead, dId, level1));
      made++;
      let level2 = 0;
      while (made < target && level2 < 6) {
        positions.push(pos(`${dId}-l2-${level1}-${level2}`, l1, dId, level2));
        made++;
        level2++;
      }
      level1++;
    }
  }
  return input(positions, departments);
}

/** Мапа id → deptId для throughThirdFrame. */
export function deptOfNodeFromInput(inp: RouteInput): (id: string) => string | null {
  const m = new Map(inp.positions.map((p) => [p.id, p.deptId]));
  return (id: string) => m.get(id) ?? null;
}

/** true, якщо два ребра виходять з одного керівника (спільний стовбур → не перетин). */
export function sharedSourceFromInput(): (a: { fromId: string }, b: { fromId: string }) => boolean {
  return (a, b) => a.fromId === b.fromId;
}
