import { describe, expect, it } from '@rstest/core';
import { buildVariantBData } from '../scenarios/variantB.js';

describe('buildVariantBData', () => {
  it('success: produces staff diagram with 6 positions', () => {
    const data = buildVariantBData();
    expect(data.positions).toHaveLength(6);
    expect(data.departments.map((d) => d.id).sort()).toEqual(['CEO', 'IT']);
  });
});

