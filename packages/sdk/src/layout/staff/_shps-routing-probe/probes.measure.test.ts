/**
 * ⚠️ THROWAWAY probe scaffold — СИМЕТРИЧНИЙ вимір A vs B (plan `work/reports/shps-routing/`).
 * Поза головним suite (`*.measure.test.ts`); запуск: `npm run measure -w @org-hierarchy/sdk`.
 *
 * Обидва рушії проходять ТІ САМІ критерії над ТИМ САМИМ входом (B3: ELK не валідує A).
 * Асертимо лише ІНВАРІАНТИ (детермінізм, §12 немає-тихого-перетину, SVG, A-by-construction);
 * різниця якості (к-сть перетинів, кліренс) — ЛОГ у таблицю як вхід рішення рушія на plan-GATE.
 */

import { beforeAll, describe, expect, it } from '@rstest/core';
import { edgeEdgeCrossings } from './crossingDetector.js';
import { cardClearance, svgSerializable, throughThirdFrame } from './clearance.js';
import {
  deptOfNodeFromInput,
  perfScheme,
  scheme2,
  scheme4,
  scheme5,
  sharedSourceFromInput,
} from './fixtures.js';
import { layoutConstructive } from './probeA.constructive.js';
import { layoutElk } from './probeB.elk.js';
import type { RouteInput, RouteOutput } from './probeTypes.js';

interface Metrics {
  properCrossings: number;
  collinearOverlaps: number;
  adminTreeCrossings: number;
  minClearance: number;
  clearanceViolations: number;
  throughThird: number;
  svgOk: boolean;
  unmarkedCrossingEdges: number;
}

function measure(input: RouteInput, out: RouteOutput): Metrics {
  const shared = sharedSourceFromInput();
  const report = edgeEdgeCrossings(out.edges, shared);
  const adminEdges = out.edges.filter((e) => e.kind === 'admin');
  const adminReport = edgeEdgeCrossings(adminEdges, shared);
  const clear = cardClearance(out);
  const through = throughThirdFrame(out, deptOfNodeFromInput(input));

  // §12: кожне ребро у транзверсальному перетині МУСИТЬ бути marked (чесно, не тихо).
  let unmarked = 0;
  for (let i = 0; i < out.edges.length; i++) {
    for (let j = i + 1; j < out.edges.length; j++) {
      const sub = edgeEdgeCrossings([out.edges[i]!, out.edges[j]!], shared);
      if (sub.properCrossings > 0) {
        if (!out.edges[i]!.marked) unmarked++;
        if (!out.edges[j]!.marked) unmarked++;
      }
    }
  }

  return {
    properCrossings: report.properCrossings,
    collinearOverlaps: report.collinearOverlaps,
    adminTreeCrossings: adminReport.properCrossings,
    minClearance: Math.round(clear.minClearance * 100) / 100,
    clearanceViolations: clear.violations,
    throughThird: through,
    svgOk: svgSerializable(out.edges),
    unmarkedCrossingEdges: unmarked,
  };
}

const SCHEMES: { name: string; input: RouteInput }[] = [
  { name: 'scheme2 (3 депи під 1 керівником)', input: scheme2() },
  { name: 'scheme4 (§10.1.4 два керівники → C)', input: scheme4() },
  { name: 'scheme5 (крізь рівень, депо між)', input: scheme5() },
];

const table: Record<string, Record<string, Metrics>> = {};
const perf: Record<string, number> = {};

describe('ШПС-роутер: СИМЕТРИЧНА проба A (конструктив) vs B (ELK)', () => {
  const bOut: Record<string, RouteOutput> = {};

  beforeAll(async () => {
    for (const s of SCHEMES) bOut[s.name] = await layoutElk(s.input);
  });

  for (const s of SCHEMES) {
    it(`[A] ${s.name}: інваріанти + метрики`, () => {
      const out1 = layoutConstructive(s.input);
      const out2 = layoutConstructive(s.input);
      const m = measure(s.input, out1);
      (table[s.name] ??= {})['A'] = m;
      // Інваріанти A:
      expect(JSON.stringify(out1)).toBe(JSON.stringify(out2)); // детермінізм
      expect(m.svgOk).toBe(true);
      expect(m.adminTreeCrossings).toBe(0); // деревні (in-dept) ребра 0 BY CONSTRUCTION
      expect(m.unmarkedCrossingEdges).toBe(0); // §12 немає тихого перетину
    });

    it(`[B] ${s.name}: інваріанти + метрики`, () => {
      const out = bOut[s.name]!;
      const m = measure(s.input, out);
      (table[s.name] ??= {})['B'] = m;
      // Інваріанти B (ELK):
      expect(m.svgOk).toBe(true);
      expect(m.unmarkedCrossingEdges).toBe(0); // §12 немає тихого перетину
      // детермінізм ELK перевіряємо окремо нижче (async)
    });
  }

  it('детермінізм B (ELK): два прогони → ідентичний вихід', async () => {
    const r1 = await layoutElk(scheme4());
    const r2 = await layoutElk(scheme4());
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it('перф-гейт: 500 посад ≤ 50мс (A sync; B async) + контрольна важка', async () => {
    const big = perfScheme(500);
    const t0 = performance.now();
    layoutConstructive(big);
    perf['A-500'] = Math.round(performance.now() - t0);
    const t1 = performance.now();
    await layoutElk(big);
    perf['B-500'] = Math.round(performance.now() - t1);
    // Лог; жорсткий асерт лише на A (конструктив — наш перф-бюджет).
    expect(perf['A-500']).toBeLessThanOrEqual(50);
  });

  it('ЗВЕДЕНА ТАБЛИЦЯ МЕТРИК (лог для plan-GATE)', async () => {
    const payload = JSON.stringify({ table, perf }, null, 2);
    // eslint-disable-next-line no-console
    console.log('\n=== SHPS ROUTER PROBE METRICS ===\n' + payload);
    const out = process.env.PROBE_METRICS_OUT;
    if (out) {
      const fs = await import('node:fs');
      fs.writeFileSync(out, payload);
    }
    expect(Object.keys(table).length).toBeGreaterThan(0);
  });
});
