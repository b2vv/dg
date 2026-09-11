import { describe, expect, it } from '@rstest/core';
import { buildBoxIndex, foreignBoxesNear } from './paintMagneticGroups.js';
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

});
