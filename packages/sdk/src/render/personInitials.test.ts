import { describe, expect, it } from 'vitest';
import { personInitials } from './personInitials.js';

describe('personInitials', () => {
  it('success: two-word Latin / Cyrillic names', () => {
    expect(personInitials('Alice Koval')).toBe('AK');
    expect(personInitials('Олена Коваль')).toBe('ОК');
  });

  it('success: single token uses up to two graphemes', () => {
    expect(personInitials('Олена')).toBe('ОЛ');
    expect(personInitials('Ada')).toBe('AD');
  });

  it('failure: empty / placeholder yields ?', () => {
    expect(personInitials('')).toBe('?');
    expect(personInitials('   ')).toBe('?');
    expect(personInitials('—')).toBe('?');
    expect(personInitials(null)).toBe('?');
    expect(personInitials(undefined)).toBe('?');
  });
});
