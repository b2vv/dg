import { describe, expect, it } from 'vitest';
import { DepartmentBlobView } from './DepartmentBlob.js';
import { defaultNodeTheme } from './types.js';

describe('DepartmentBlobView', () => {
  it('success: fromPath creates container with graphics for valid path', () => {
    const path =
      'M 0 0 L 300 0 L 300 80 L 200 80 L 200 160 L 100 160 L 100 240 L 0 240 Z';
    const view = DepartmentBlobView.fromPath(path, 'IT', defaultNodeTheme.department);
    expect(view.children.length).toBeGreaterThanOrEqual(2);
    expect(view.label).toBe('IT');
  });

  it('failure: empty path yields empty graphics without throw', () => {
    const view = DepartmentBlobView.fromPath('', 'Empty', defaultNodeTheme.department);
    expect(view.children.length).toBeGreaterThanOrEqual(1);
  });

  it('success: redrawPoints updates drawn ring for morph', () => {
    const view = DepartmentBlobView.fromPoints(
      [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 40 },
        { x: 0, y: 40 },
      ],
      'IT',
      defaultNodeTheme.department,
    );
    expect(view.getDrawnPoints().length).toBeGreaterThanOrEqual(2);
    view.redrawPoints(
      [
        { x: 10, y: 10 },
        { x: 50, y: 10 },
        { x: 50, y: 50 },
        { x: 10, y: 50 },
      ],
      defaultNodeTheme.department,
    );
    expect(view.getDrawnPoints()[0]!.x).toBe(10);
  });
});
