import { describe, it, expect } from '@rstest/core';
import { computeOrgRowTreeLayoutWasm } from './layoutBridge.js';
import type { OrgFlatInput } from './layoutBridge.js';

/**
 * Інваріанти Reingold–Tilford для живого WASM-шару (`ploeg-layered-tidy`).
 *
 * Джерело правил — чотири естетики R-T (Reingold & Tilford, «Tidier Drawings of
 * Trees», 1981), узагальнені Walker II (1990) на n-арні дерева й доведені до O(n)
 * Buchheim–Jünger–Leipert (2002). Переказ і цитати — `docs/diagrams/reingold-tilford-layout.md`.
 * Канон: «a father should be centered over its sons» = X батька по СЕРЕДИНІ центрів
 * ПЕРШОЇ й ОСТАННЬОЇ ПРЯМОЇ дитини (`x_mid = (first_child + last_child) / 2`), а НЕ по
 * центру bbox усього піддерева — цю різницю при асиметрії пінимо тестом нижче.
 *
 * Тестуємо саме bridge (`computeOrgRowTreeLayoutWasm`) — артефакт, який споживає ШПС,
 * — ДО будь-якого хост-постпроцесингу (recenter у orgBlockLayout тут навмисно оминаємо,
 * бо він рухає корінь із midpoint і зламав би естетику 3; це окреме рішення власника).
 *
 * Координати WASM — верхній-лівий кут; центр = `x + width / 2`.
 */

const OPTS = {
  direction: 'vertical',
  nodeWidth: 200,
  nodeHeight: 72,
  horizontalGap: 40,
  verticalGap: 60,
  margin: 24,
} as const;

const LEVEL_STEP = OPTS.nodeHeight + OPTS.verticalGap; // 132: крок між рівнями
const EPS = 0.5; // px

/** Рядки `[id, parentId]`; порядок у масиві = порядок сиблінгів (build_from_flat). */
function tree(rows: Array<[string, string | null]>): OrgFlatInput[] {
  return rows.map(([id, parentOrgId]) => ({ id, parentOrgId, name: id }));
}

async function layout(rows: Array<[string, string | null]>, rootId: string) {
  const res = await computeOrgRowTreeLayoutWasm(tree(rows), rootId, OPTS);
  const byId = new Map(res.nodes.map((n) => [n.id, n]));
  const cx = (id: string) => {
    const n = byId.get(id);
    if (!n) throw new Error(`no node ${id}`);
    return n.x + n.width / 2;
  };
  const cy = (id: string) => {
    const n = byId.get(id);
    if (!n) throw new Error(`no node ${id}`);
    return n.y + n.height / 2;
  };
  return { res, byId, cx, cy };
}

/** Як `tree`, але з опційним per-node w×h: `[id, parentId, width?, height?]`. */
function treeSized(
  rows: Array<[string, string | null, number?, number?]>,
): OrgFlatInput[] {
  return rows.map(([id, parentOrgId, width, height]) => ({
    id,
    parentOrgId,
    name: id,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  }));
}

async function layoutSized(
  rows: Array<[string, string | null, number?, number?]>,
  rootId: string,
) {
  const res = await computeOrgRowTreeLayoutWasm(treeSized(rows), rootId, OPTS);
  const byId = new Map(res.nodes.map((n) => [n.id, n]));
  const cx = (id: string) => {
    const n = byId.get(id);
    if (!n) throw new Error(`no node ${id}`);
    return n.x + n.width / 2;
  };
  return { res, byId, cx };
}

describe('Reingold–Tilford invariants (ploeg-layered-tidy WASM)', () => {
  it('живий шар = layered-tidy (пінимо алгоритм)', async () => {
    const { res } = await layout([['r', null], ['a', 'r']], 'r');
    expect(res.algorithm).toBe('ploeg-layered-tidy');
  });

  // ─── Естетика 1: вузли одного рівня — на одній прямій; рівні паралельні ───
  it('естетика 1 — один рівень → одна y; рівні рівновіддалені', async () => {
    const { byId, cy } = await layout(
      [
        ['r', null],
        ['a', 'r'], ['b', 'r'],
        ['a1', 'a'], ['a2', 'a'], ['b1', 'b'],
      ],
      'r',
    );
    // рівень → спільна глибина
    expect(byId.get('a')!.depth).toBe(1);
    expect(byId.get('b')!.depth).toBe(1);
    expect(byId.get('a1')!.depth).toBe(2);
    // один рівень → одна y-координата (пряма)
    expect(Math.abs(cy('a') - cy('b'))).toBeLessThan(EPS);
    expect(Math.abs(cy('a1') - cy('a2'))).toBeLessThan(EPS);
    expect(Math.abs(cy('a1') - cy('b1'))).toBeLessThan(EPS);
    // рівні паралельні й рівновіддалені: Δy між сусідніми рівнями = nodeHeight + vGap
    expect(Math.abs((cy('a') - cy('r')) - LEVEL_STEP)).toBeLessThan(EPS);
    expect(Math.abs((cy('a1') - cy('a')) - LEVEL_STEP)).toBeLessThan(EPS);
  });

  // ─── Естетика 2: лівий син лівіше батька, правий — правіше; порядок даних ───
  // Регрес gap#6: `extract_subtree` дзеркалив рівні (вхід [c1,c2,c3] → L→R [c3,c2,c1]),
  // виправлено `.rev()` в обході (org_tree.rs) — порядок даних тепер збережено.
  it('естетика 2 — порядок сиблінгів = порядок даних (без дзеркала)', async () => {
    const { cx } = await layout(
      [['r', null], ['c1', 'r'], ['c2', 'r'], ['c3', 'r']],
      'r',
    );
    expect(cx('c1')).toBeLessThan(cx('c2'));
    expect(cx('c2')).toBeLessThan(cx('c3'));
    // лівий син лівіше батька, правий — правіше
    expect(cx('c1')).toBeLessThan(cx('r'));
    expect(cx('c3')).toBeGreaterThan(cx('r'));
  });

  // ─── Естетика 3a: батько по центру — СИМЕТРИЧНИЙ випадок (midpoint = центр) ───
  it('естетика 3 — симетрія: батько над середнім сином; лоне дитя під собою', async () => {
    const sym = await layout(
      [['r', null], ['c1', 'r'], ['c2', 'r'], ['c3', 'r']],
      'r',
    );
    // 3 рівні листи → midpoint(c1,c3) = c2
    expect(Math.abs(sym.cx('r') - sym.cx('c2'))).toBeLessThan(EPS);
    expect(Math.abs(sym.cx('r') - (sym.cx('c1') + sym.cx('c3')) / 2)).toBeLessThan(EPS);

    // лоне дитя: батько точно над ним (midpoint однієї дитини = вона сама)
    const lone = await layout([['r', null], ['a', 'r'], ['b', 'a']], 'r');
    expect(Math.abs(lone.cx('a') - lone.cx('r'))).toBeLessThan(EPS);
    expect(Math.abs(lone.cx('b') - lone.cx('a'))).toBeLessThan(EPS);
  });

  // ─── Естетика 3b: АСИМЕТРІЯ — midpoint прямих дітей, а НЕ bbox-центр піддерева ──
  it('естетика 3 — асиметрія: X батька = midpoint(перша, остання ПРЯМА дитина), не bbox-центр', async () => {
    // L — широке піддерево (3 листи); R — вузьке (лист). Класичний асиметричний кейс.
    const { res, cx } = await layout(
      [
        ['root', null],
        ['L', 'root'], ['R', 'root'],
        ['L1', 'L'], ['L2', 'L'], ['L3', 'L'],
      ],
      'root',
    );
    const parentCenter = cx('root');
    const midpointOfChildren = (cx('L') + cx('R')) / 2;
    // КАНОН: батько по midpoint ПРЯМИХ дітей (L, R) — виконується точно
    expect(Math.abs(parentCenter - midpointOfChildren)).toBeLessThan(EPS);

    // КОНТРПРОБА: той самий батько НЕ стоїть у центрі bbox усього піддерева —
    // інакше правило неможливо було б відрізнити від bbox-центрування.
    const minX = Math.min(...res.nodes.map((n) => n.x));
    const maxX = Math.max(...res.nodes.map((n) => n.x + n.width));
    const bboxCenter = (minX + maxX) / 2;
    expect(Math.abs(parentCenter - bboxCenter)).toBeGreaterThan(1);
  });

  // ─── Естетика 4a: ізоморфні піддерева малюються конгруентно ───
  it('естетика 4 — ізоморфні піддерева → ідентична форма незалежно від місця', async () => {
    const { cx, cy } = await layout(
      [
        ['root', null],
        ['P', 'root'], ['Q', 'root'],
        ['P1', 'P'], ['P2', 'P'],
        ['Q1', 'Q'], ['Q2', 'Q'],
      ],
      'root',
    );
    // відносні зсуви дітей усередині кожного (ізоморфного) піддерева збігаються
    expect(Math.abs((cx('P1') - cx('P')) - (cx('Q1') - cx('Q')))).toBeLessThan(EPS);
    expect(Math.abs((cx('P2') - cx('P')) - (cx('Q2') - cx('Q')))).toBeLessThan(EPS);
    // та сама глибина → та сама y
    expect(Math.abs(cy('P1') - cy('Q1'))).toBeLessThan(EPS);
  });

  // ─── Естетика 4b: дерево та його дзеркало → дзеркальні рисунки ───
  it('естетика 4 — дзеркало дерева дає горизонтально відбитий рисунок', async () => {
    // T: root → [A(→A1,A2), B];  дзеркало T': reverse на кожному вузлі → [B, A(→A2,A1)]
    const t = await layout(
      [
        ['root', null],
        ['A', 'root'], ['B', 'root'],
        ['A1', 'A'], ['A2', 'A'],
      ],
      'root',
    );
    const tm = await layout(
      [
        ['root', null],
        ['B', 'root'], ['A', 'root'],
        ['A2', 'A'], ['A1', 'A'],
      ],
      'root',
    );
    const offsets = (L: typeof t) =>
      L.res.nodes.map((n) => n.x + n.width / 2 - L.cx('root')).sort((p, q) => p - q);
    const direct = offsets(t);
    const mirrored = offsets(tm).map((v) => -v).sort((p, q) => p - q);
    expect(direct.length).toBe(mirrored.length);
    for (let i = 0; i < direct.length; i++) {
      expect(Math.abs(direct[i]! - mirrored[i]!)).toBeLessThan(EPS);
    }
  });

  // ─── Per-node w×h: розкладка розводить за РЕАЛЬНИМИ розмірами карток (4311) ──
  // tidy add_node отримує node.width.unwrap_or(node_width) (ploeg_layout.rs:43),
  // тож ширша картка займає ширший слот, а центри сусідів зсуваються на дельту
  // півширин. Без розмірів fallback на OPTS.nodeWidth → колишня uniform-поведінка.
  it('per-node — ширший сиблінг розсуває центр-до-центру на дельту півширин (+ контрпроба uniform)', async () => {
    const WIDE = 400;
    const { byId, cx } = await layoutSized(
      [['r', null], ['c1', 'r', WIDE], ['c2', 'r']],
      'r',
    );
    // emit-шлях: вихідна ширина відбиває вхідну (не підмінена на node_width)
    expect(Math.abs(byId.get('c1')!.width - WIDE)).toBeLessThan(EPS);
    expect(Math.abs(byId.get('c2')!.width - OPTS.nodeWidth)).toBeLessThan(EPS);

    // center-to-center = w1/2 + w2/2 + gap (edge-to-edge лишається horizontalGap)
    const expectedCC = WIDE / 2 + OPTS.nodeWidth / 2 + OPTS.horizontalGap; // 340
    expect(Math.abs(Math.abs(cx('c2') - cx('c1')) - expectedCC)).toBeLessThan(EPS);

    // КОНТРПРОБА: за uniform node_width було б nodeWidth+gap = 240. Якби ширина НЕ
    // доходила до розкладки, асерт вище дав би 240 ≠ 340 і впав — дельта реальна.
    const uniformCC = OPTS.nodeWidth + OPTS.horizontalGap; // 240
    expect(expectedCC - uniformCC).toBeGreaterThan(90); // = (WIDE - nodeWidth)/2 = 100

    // без накладань з урахуванням реальних ширин
    const c1 = byId.get('c1')!;
    const c2 = byId.get('c2')!;
    const [left, right] = c1.x <= c2.x ? [c1, c2] : [c2, c1];
    expect(left.x + left.width).toBeLessThanOrEqual(right.x + EPS);
  });

  it('per-node — без w×h поведінка тотожна uniform node_width (backward-compat)', async () => {
    const { byId, cx } = await layoutSized([['r', null], ['c1', 'r'], ['c2', 'r']], 'r');
    expect(
      Math.abs(Math.abs(cx('c2') - cx('c1')) - (OPTS.nodeWidth + OPTS.horizontalGap)),
    ).toBeLessThan(EPS);
    expect(Math.abs(byId.get('c1')!.width - OPTS.nodeWidth)).toBeLessThan(EPS);
  });

  it('per-node — батько по midpoint ЦЕНТРІВ крайніх прямих дітей (канон R-T), не по прольоту', async () => {
    // c1 широкий (400). ВИМІРЯНО (після конвертації центр→ліва-грань у ploeg emit):
    // layered-tidy тримає канон R-T на ЦЕНТРАХ — X батька = midpoint(центр першої,
    // центр останньої прямої дитини), незалежно від їхніх ширин.
    const { byId, cx } = await layoutSized(
      [['r', null], ['c1', 'r', 400], ['c2', 'r'], ['c3', 'r']],
      'r',
    );
    expect(Math.abs(cx('r') - (cx('c1') + cx('c3')) / 2)).toBeLessThan(EPS);

    // КОНТРПРОБА: це НЕ центр ПРОЛЬОТУ дітей (ліва грань першої ↔ права останньої) —
    // за асиметрії ширин вони розходяться на (w_першої − w_останньої)/4 = 50px, тож
    // правило відрізняється від bbox/span-центрування.
    const kids = ['c1', 'c2', 'c3'].map((id) => byId.get(id)!);
    const spanMid =
      (Math.min(...kids.map((k) => k.x)) + Math.max(...kids.map((k) => k.x + k.width))) / 2;
    expect(Math.abs(cx('r') - spanMid)).toBeGreaterThan(1);
  });

  // ─── Компактність / без накладань: сусідні листи рівно на один gap ───
  it('компактність — сусідні листи розведені рівно на horizontalGap, без накладань', async () => {
    const { cx, byId } = await layout(
      [['r', null], ['c1', 'r'], ['c2', 'r']],
      'r',
    );
    // edge-to-edge = horizontalGap → центр-до-центру = nodeWidth + gap (за модулем,
    // незалежно від напряму сиблінгів — див. ПІН реверсу вище)
    expect(
      Math.abs(Math.abs(cx('c2') - cx('c1')) - (OPTS.nodeWidth + OPTS.horizontalGap)),
    ).toBeLessThan(EPS);
    // жодного накладання між двома вузлами одного рівня
    const c1 = byId.get('c1')!;
    const c2 = byId.get('c2')!;
    const [left, right] = c1.x <= c2.x ? [c1, c2] : [c2, c1];
    expect(left.x + left.width).toBeLessThanOrEqual(right.x + EPS);
  });
});
