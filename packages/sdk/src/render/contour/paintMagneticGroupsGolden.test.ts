import { describe, expect, it } from '@rstest/core';
import { paintMagneticGroups } from './paintMagneticGroups.js';
import { goldenScene } from './goldenScene.js';

/**
 * Recorded from the implementation as it stood at `ade232e`, before the
 * per-cluster foreign array was removed. The point of the fixture is that it
 * was produced by the *old* code: an optimisation that changes a single
 * coordinate fails here, and «the contour still looks fine» stops being a
 * judgement call.
 *
 * Regenerate only when the geometry is meant to change, and say so in the
 * commit — never to make a red test green.
 */
const GOLDEN: { departmentId: string; ring: [number, number][] }[] = [
  { departmentId: 'IT', ring: [[-14, -4], [-12.66, -9], [-9, -12.66], [-4, -14], [276, -14], [281, -12.66], [284.66, -9], [286, -4], [286, 64], [284.66, 69], [281, 72.66], [276, 74], [-4, 74], [-9, 72.66], [-12.66, 69], [-14, 64]] },
  { departmentId: 'IT', ring: [[586, 296], [587.34, 291], [591, 287.34], [596, 286], [784, 286], [789, 287.34], [792.66, 291], [794, 296], [794, 364], [792.66, 369], [789, 372.66], [784, 374], [596, 374], [591, 372.66], [587.34, 369], [586, 364]] },
  { departmentId: 'HR', ring: [[86, 96], [87.34, 91], [91, 87.34], [96, 86], [376, 86], [381, 87.34], [384.66, 91], [386, 96], [386, 164], [384.66, 169], [381, 172.66], [376, 174], [96, 174], [91, 172.66], [87.34, 169], [86, 164]] },
  { departmentId: 'OPS', ring: [[386, 77.6], [386.48, 75.8], [387.8, 74.48], [389.6, 74], [394, 74], [394, -4], [395.34, -9], [399, -12.66], [404, -14], [584, -14], [589, -12.66], [592.66, -9], [594, -4], [594, 164], [592.66, 169], [589, 172.66], [584, 174], [404, 174], [399, 172.66], [395.34, 169], [394, 164], [394, 86], [389.6, 86], [387.8, 85.52], [386.48, 84.2], [386, 82.4]] },
];

describe('paintMagneticGroups — geometry is unchanged', () => {
  it('success: every ring matches the recorded golden, point for point', () => {
    const painted = paintMagneticGroups(goldenScene());
    const actual = painted.map((g) => ({
      departmentId: g.departmentId,
      ring: g.ring.map((p) => [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]),
    }));
    expect(actual).toEqual(GOLDEN);
  });

  it('success: the golden scene really exercises clustering and the notch', () => {
    const painted = paintMagneticGroups(goldenScene());
    // Two IT clusters — otherwise the fixture would not cover the split.
    expect(painted.filter((g) => g.departmentId === 'IT')).toHaveLength(2);
    // The L-shaped OPS ring carries a notch: more points than a plain rounded box.
    const ops = painted.find((g) => g.departmentId === 'OPS');
    expect(ops!.ring.length).toBeGreaterThan(20);
    // A seat with no department never gets a contour of its own.
    expect(painted.some((g) => g.departmentId === '__none__')).toBe(false);
  });
});
