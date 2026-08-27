import { describe, expect, it } from '@rstest/core';
import { parseJsonText, ParseJsonError } from './json.js';
import { requireElement, setThemeAttribute, getThemeFromDocument } from './dom.js';

describe('parseJsonText', () => {
  it('success: parses valid JSON array', () => {
    const result = parseJsonText<unknown[]>('[{"id":"1"}]');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([{ id: '1' }]);
  });

  it('failure: invalid JSON returns ParseJsonError', () => {
    const result = parseJsonText('not-json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(ParseJsonError);
  });

  it('failure: empty string returns error', () => {
    const result = parseJsonText('   ');
    expect(result.ok).toBe(false);
  });
});

describe('requireElement', () => {
  it('failure: missing element throws', () => {
    expect(() => requireElement('nonexistent-demo-el')).toThrow(/Missing element/);
  });

  it('success: returns element when present', () => {
    const el = document.createElement('div');
    el.id = 'demo-test-el';
    document.body.appendChild(el);
    expect(requireElement('demo-test-el')).toBe(el);
    document.body.removeChild(el);
  });
});

describe('setThemeAttribute', () => {
  it('success: sets data-theme on document', () => {
    setThemeAttribute('dark');
    expect(getThemeFromDocument()).toBe('dark');
    setThemeAttribute('light');
    expect(getThemeFromDocument()).toBe('light');
  });
});
