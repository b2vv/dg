import { describe, expect, it } from 'vitest';
import { formatOrgCountsBadge, formatPositionCountsBadge, VACANT_POSITION_LABEL } from './orgCardChrome.js';

describe('formatOrgCountsBadge', () => {
  it('omits when both counts undefined', () => {
    expect(formatOrgCountsBadge({ id: '1', name: 'O', groupIds: [] })).toBeUndefined();
  });

  it('formats N [M] when both set', () => {
    expect(
      formatOrgCountsBadge({ id: '1', name: 'O', groupIds: [], filledCount: 5, vacantCount: 2 }),
    ).toBe('5 [2]');
  });

  it('formats tree children [descendants] when set', () => {
    expect(
      formatOrgCountsBadge({
        id: '1',
        name: 'O',
        groupIds: [],
        childrenCount: 5,
        allDescendantCount: 12,
      }),
    ).toBe('5 [12]');
  });

  it('uses 0 for missing side when either present', () => {
    expect(formatOrgCountsBadge({ id: '1', name: 'O', groupIds: [], filledCount: 4 })).toBe(
      '4 [0]',
    );
    expect(formatOrgCountsBadge({ id: '1', name: 'O', groupIds: [], vacantCount: 1 })).toBe(
      '0 [1]',
    );
  });
});

describe('VACANT_POSITION_LABEL', () => {
  it('is uk vacancy copy', () => {
    expect(VACANT_POSITION_LABEL).toBe('(вакансія)');
  });
});

describe('formatPositionCountsBadge', () => {
  it('formats N [M] for position count bar', () => {
    expect(
      formatPositionCountsBadge({
        id: 'p',
        title: 'T',
        organizationId: 'o',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
        childrenCount: 3,
        allDescendantCount: 5,
      }),
    ).toBe('3 [5]');
  });
});
