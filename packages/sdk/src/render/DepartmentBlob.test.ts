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

  it('failure: invalid path logs warn and still creates view', () => {
    const view = DepartmentBlobView.fromPath('M 0 0 Q bad', 'Bad', defaultNodeTheme.department);
    expect(view).toBeInstanceOf(DepartmentBlobView);
  });
});
