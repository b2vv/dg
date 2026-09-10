import { describe, expect, it } from '@rstest/core';
import { buildBoxIndex, foreignBoxesNear } from './paintMagneticGroups.js';
import { clusterPositionIds } from './contourCluster.js';
import type { ContourPositionInput } from './types.js';
import type { ContourMemberBox } from './contourClearance.js';

/**
 * T107 — the contour is painted inside the render frame, so its cost is frame
 * budget. What is asserted here is **work done**, not milliseconds.
 *
 * The first version of this test compared wall-clock ratios. It failed under a
 * full parallel suite and passed alone — the shape T101 describes. Sampling the
 * sizes round-robin did not fix it either: a clock comparison inside a
 * contended suite is unreliable by construction. Counting the work is
 * deterministic on any machine, and it pins the property that was actually
 * fixed — a ring reads its neighbours instead of the whole scene.
 */
function scene(depts: number, seatsPerDept: number) {
  const inputs: ContourPositionInput[] = [];
  const boxes: ContourMemberBox[] = [];
  const cols = Math.ceil(Math.sqrt(seatsPerDept));

  for (let d = 0; d < depts; d += 1) {
    const baseCol = (d % 10) * (cols + 2);
    const baseRow = Math.floor(d / 10) * (cols + 2);
    for (let s = 0; s < seatsPerDept; s += 1) {
      const id = `dept-${d}-p${s}`;
      const col = baseCol + (s % cols);
      const row = baseRow + Math.floor(s / cols);
      inputs.push({ id, departmentId: `dept-${d}`, col, row });
      boxes.push({ positionId: id, x: col * 240, y: row * 90, width: 220, height: 72 });
    }
  }
  return { inputs, boxes };
}

describe('paintMagneticGroups cost', () => {
  it('success: a ring reads its neighbours, not every card in the scene', () => {
    const { boxes } = scene(80, 50);
    expect(boxes).toHaveLength(4_000);
    const index = buildBoxIndex(boxes);

    let worst = 0;
    for (let d = 0; d < 80; d += 1) {
      const members = boxes.filter((b) => b.positionId.startsWith(`dept-${d}-`));
      const own = new Set(members.map((b) => b.positionId));
      worst = Math.max(worst, foreignBoxesNear(index, members, 32, own).length);
    }

    // Before the index every ring was handed ~3 950 boxes — the whole scene
    // minus itself, allocated once per ring, which was two thirds of the frame.
    expect(worst).toBeLessThan(600);
  });

  it('success: the neighbour query still returns everything that can reach the ring', () => {
    // A reach wide enough to cover the scene: the answer must be every foreign
    // box, so the index can never be accused of quietly hiding one.
    const { boxes } = scene(4, 9);
    const index = buildBoxIndex(boxes);
    const members = boxes.filter((b) => b.positionId.startsWith('dept-0-'));
    const own = new Set(members.map((b) => b.positionId));
    const near = foreignBoxesNear(index, members, 1_000_000, own);

    const expected = boxes.filter((b) => !own.has(b.positionId));
    expect(near).toHaveLength(expected.length);
    // Original order is preserved: the cuts are consumed in sequence downstream,
    // so reordering them would be a geometry change dressed as an optimisation.
    expect(near.map((b) => b.positionId)).toEqual(expected.map((b) => b.positionId));
  });

  it('success: clustering 80k seats is not quadratic', () => {
    // 🔴 **Третя редакція стелі, і перші дві виміряно як недійсні.**
    //
    // 1. `< 1 000 мс на 20 000` проходила на **квадратичному** коді (646 мс на
    //    тому розмірі) — стерегла ніщо.
    // 2. `< 300 мс на 40 000` розділяла правильно поодинці (43 мс проти 2 378)
    //    і **червоніла в повному прогоні**: у контендованій сюїті годинник міряє
    //    завантаженість машини, а не алгоритм. Це та сама причина, з якої перший
    //    тест цього файлу рахує **роботу**, а не мілісекунди.
    //
    // Лишається форма кривої, виміряна в тому самому процесі: учетверо більший
    // вхід коштує ≈×4 у лінійного й ≈×16 у квадратичного. Під навантаженням
    // обидва числа ростуть **разом**, тож частка стійка там, де абсолют — ні.
    const small20 = scene(1, 20_000).inputs;
    const large80 = scene(1, 80_000).inputs;

    /** Медіана з трьох: один прогін — це шум, і на менших входах шум більший за сигнал. */
    const medianMs = (inputs: ContourPositionInput[]): number => {
      const runs: number[] = [];
      for (let i = 0; i < 3; i += 1) {
        const started = performance.now();
        expect(clusterPositionIds(inputs, 1.5)).toHaveLength(1);
        runs.push(performance.now() - started);
      }
      return runs.sort((a, b) => a - b)[1]!;
    };

    // Прогрів: перший виклик у процесі несе JIT, і це не алгоритм.
    clusterPositionIds(small20, 1.5);

    const small = medianMs(small20);
    const large = medianMs(large80);

    // Стеля з виміру, не з теорії:
    //
    // | Що | Ratio 4× |
    // |---|---|
    // | 20k→80k, спокій | 3,53 · 3,76 · 4,22 |
    // | 20k→80k, під паралельною сюїтою | 3,63 · 3,99 · 4,87 |
    // | 10k→40k, під паралельною сюїтою | **8,24** — саме тому розміри більші |
    // | квадратичний (n²) | ≈16 |
    //
    // ⚠️ Перша спроба цієї правки брала 10k→40k і **червоніла на 8,24** під
    // двома сюїтами одночасно: на десяти тисячах корисна робота — десяток
    // мілісекунд, тобто співмірна з плануванням потоків. Більший вхід прибирає
    // шум, а не ховає його: частка з 4,87 до 16 має ×3,3 запасу.
    expect(large / Math.max(small, 0.001)).toBeLessThan(10);
  }, 60_000);
});
