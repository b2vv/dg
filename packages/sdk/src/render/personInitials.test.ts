import { describe, expect, it } from '@rstest/core';
import { avatarColorFromName, personInitials } from './personInitials.js';

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

describe('avatarColorFromName', () => {
  it('success: stable color for the same name', () => {
    expect(avatarColorFromName('Alice Koval')).toBe(avatarColorFromName('Alice Koval'));
  });

  it('success: different names can differ; empty maps like ?', () => {
    expect(avatarColorFromName('Alice Koval')).not.toBe(avatarColorFromName('Bob Novak'));
    expect(avatarColorFromName('')).toBe(avatarColorFromName('?'));
    expect(avatarColorFromName(null)).toBe(avatarColorFromName(undefined));
  });
});
