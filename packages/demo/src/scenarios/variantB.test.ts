import { describe, expect, it } from 'vitest';
import { buildVariantBData } from '../scenarios/variantB.js';
import { computeDeptContour, VARIANT_B_POSITIONS } from '@org-hierarchy/sdk';

describe('buildVariantBData', () => {
  it('success: produces staff diagram with 6 positions', () => {
    const data = buildVariantBData();
    expect(data.positions).toHaveLength(6);
    expect(data.departments.map((d) => d.id).sort()).toEqual(['CEO', 'IT']);
  });
});

describe('Variant B contour', () => {
  it('success: IT contour path is non-empty', async () => {
    const contours = await computeDeptContour('IT', VARIANT_B_POSITIONS, {
      smoothIterations: 0,
      magnetRadius: 8,
    });
    expect(contours.length).toBeGreaterThan(0);
    expect(contours[0]!.path.length).toBeGreaterThan(0);
    expect(contours[0]!.path.startsWith('M')).toBe(true);
  });
});
