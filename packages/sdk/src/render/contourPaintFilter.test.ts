import { describe, expect, it } from 'vitest';
import { filterContoursForPaint, shouldPaintDeptContour } from './contourPaintFilter.js';

describe('contourPaintFilter (T46)', () => {
  it('success: default min=1 paints singleton CEO and multi IT', () => {
    expect(shouldPaintDeptContour(1, 1)).toBe(true);
    expect(shouldPaintDeptContour(5, 1)).toBe(true);
  });

  it('success: min=2 hides singleton CEO, keeps IT', () => {
    const counts = new Map([
      ['CEO', 1],
      ['IT', 5],
    ]);
    const painted = filterContoursForPaint(
      [
        { departmentId: 'CEO', path: 'ceo' },
        { departmentId: 'IT', path: 'it' },
      ],
      counts,
      2,
    );
    expect(painted.map((c) => c.departmentId)).toEqual(['IT']);
  });

  it('failure: missing count is treated as 0 and filtered out when min>=1', () => {
    expect(shouldPaintDeptContour(undefined, 1)).toBe(false);
    expect(shouldPaintDeptContour(0, 2)).toBe(false);
  });
});
