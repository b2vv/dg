import { describe, expect, it } from 'vitest';
import { formatIsoDateUk, formatOrgPeriodLabel } from './formatPeriodLabel.js';

describe('formatIsoDateUk', () => {
  it('success: ISO date → DD.MM.YYYY', () => {
    expect(formatIsoDateUk('2024-03-15')).toBe('15.03.2024');
    expect(formatIsoDateUk('2024-03-15T12:00:00Z')).toBe('15.03.2024');
  });

  it('failure: empty / invalid → null', () => {
    expect(formatIsoDateUk('')).toBeNull();
    expect(formatIsoDateUk('not-a-date')).toBeNull();
    expect(formatIsoDateUk(undefined)).toBeNull();
  });
});

describe('formatOrgPeriodLabel', () => {
  it('success: host periodLabel wins', () => {
    expect(
      formatOrgPeriodLabel({
        periodLabel: '  custom  ',
        periodStart: '2020-01-01',
      }),
    ).toBe('custom');
  });

  it('success: open-ended → по т.ч.', () => {
    expect(formatOrgPeriodLabel({ periodStart: '2023-01-01', periodEnd: null })).toBe(
      'з 01.01.2023 по т.ч.',
    );
    expect(formatOrgPeriodLabel({ periodStart: '2023-01-01' })).toBe('з 01.01.2023 по т.ч.');
  });

  it('success: closed window', () => {
    expect(
      formatOrgPeriodLabel({ periodStart: '2022-06-01', periodEnd: '2023-12-31' }),
    ).toBe('з 01.06.2022 по 31.12.2023');
  });

  it('failure: no start and no label → undefined (no hole)', () => {
    expect(formatOrgPeriodLabel({})).toBeUndefined();
    expect(formatOrgPeriodLabel({ periodEnd: '2023-01-01' })).toBeUndefined();
  });
});
