import { describe, expect, it } from '@rstest/core';
import { NO_DEPARTMENT_ID } from '../data/types.js';
import {
  countDepartmentPositions,
  formatDepartmentPositionsBadge,
} from './departmentPositionsBadge.js';

const seat = (id: string, departmentId?: string) => ({ id, name: id, departmentId });

describe('countDepartmentPositions', () => {
  it('counts every position of the department', () => {
    const positions = [
      seat('a', 'rozrobka'),
      seat('b', 'rozrobka'),
      seat('c', 'prodazh'),
      seat('d', 'rozrobka'),
    ];
    expect(countDepartmentPositions(positions, 'rozrobka')).toBe(3);
    expect(countDepartmentPositions(positions, 'prodazh')).toBe(1);
  });

  it('is independent of which members are laid out (collapse must not shrink it)', () => {
    // The badge states the department's establishment, not what is on screen:
    // a collapsed head hides its reports, and the count must not follow.
    const positions = [seat('head', 'rada'), seat('hidden-1', 'rada'), seat('hidden-2', 'rada')];
    expect(countDepartmentPositions(positions, 'rada')).toBe(3);
  });

  it('returns 0 for a department with no positions', () => {
    expect(countDepartmentPositions([seat('a', 'rozrobka')], 'empty')).toBe(0);
  });

  it('buckets a position with no departmentId under NO_DEPARTMENT_ID', () => {
    const positions = [seat('loose'), seat('owned', 'rada')];
    expect(countDepartmentPositions(positions, NO_DEPARTMENT_ID)).toBe(1);
    expect(countDepartmentPositions(positions, 'rada')).toBe(1);
  });
});

describe('formatDepartmentPositionsBadge', () => {
  it('formats the mockup copy', () => {
    expect(formatDepartmentPositionsBadge(5)).toBe('5 поз.');
    expect(formatDepartmentPositionsBadge(1)).toBe('1 поз.');
  });

  it('omits the badge when there is nothing to state', () => {
    expect(formatDepartmentPositionsBadge(0)).toBeUndefined();
  });
});
