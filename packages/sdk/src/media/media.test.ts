import { describe, expect, it } from 'vitest';
import {
  mediaCacheKey,
  resolveThemedMediaUrl,
  resolveThemedMediaFromOrganization,
  resolveThemedMediaFromPerson,
} from './index.js';

describe('mediaCacheKey', () => {
  it('success: revision suffix when present', () => {
    expect(mediaCacheKey('blob:x', 3)).toBe('blob:x::3');
    expect(mediaCacheKey('blob:x', undefined)).toBe('blob:x');
  });
});

describe('resolveThemedMediaUrl', () => {
  it('success: theme hit then fallback', () => {
    expect(
      resolveThemedMediaUrl(
        { byTheme: { dark: '/d.png', light: '/l.png' }, fallback: '/f.png' },
        'dark',
      ),
    ).toBe('/d.png');
    expect(
      resolveThemedMediaUrl(
        { byTheme: { light: '/l.png' }, fallback: '/f.png' },
        'dark',
      ),
    ).toBe('/f.png');
  });
});

describe('legacyBridge', () => {
  it('success: org legacy maps to byTheme', () => {
    const media = resolveThemedMediaFromOrganization({
      id: 'o1',
      name: 'O',
      groupIds: [],
      symbolUrlLight: '/l.png',
      symbolUrlDark: '/d.png',
    });
    expect(media?.byTheme?.light).toBe('/l.png');
    expect(media?.byTheme?.dark).toBe('/d.png');
  });

  it('success: media wins over legacy', () => {
    const media = resolveThemedMediaFromOrganization({
      id: 'o1',
      name: 'O',
      groupIds: [],
      symbolUrl: '/legacy.png',
      media: { fallback: '/canonical.png' },
    });
    expect(media?.fallback).toBe('/canonical.png');
  });

  it('success: person photoUrl → fallback', () => {
    expect(
      resolveThemedMediaFromPerson({ id: 'p1', fullName: 'A', photoUrl: '/p.png' })?.fallback,
    ).toBe('/p.png');
  });
});
