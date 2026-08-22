import { describe, expect, it } from 'vitest';
import { VARIANT_B_POSITIONS } from '../contour/bridge.js';
import { clusterPositionIds, clusterPositionsByDepartment } from './contourCluster.js';

describe('clusterPositionIds', () => {
  it('success: Variant B IT splits into top row + two bottom blobs at radius 1.5', () => {
    const it = VARIANT_B_POSITIONS.filter((p) => p.departmentId === 'IT');
    const clusters = clusterPositionIds(it, 1.5);
    expect(clusters).toHaveLength(3);
    expect(clusters.find((c) => c.includes('P1') && c.includes('P2') && c.includes('P3'))).toBeTruthy();
    expect(clusters.find((c) => c.length === 1 && c[0] === 'P5')).toBeTruthy();
    expect(clusters.find((c) => c.length === 1 && c[0] === 'P6')).toBeTruthy();
  });

  it('failure: empty input yields no clusters', () => {
    expect(clusterPositionIds([])).toEqual([]);
    expect(clusterPositionsByDepartment(VARIANT_B_POSITIONS, 'MISSING')).toEqual([]);
  });
});
