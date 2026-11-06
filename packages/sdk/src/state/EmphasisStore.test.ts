import { describe, expect, it } from '@rstest/core';
import { EmphasisStore } from './EmphasisStore.js';

describe('EmphasisStore', () => {
  it('success: stores the supplied found set as-is, including an empty set', () => {
    const store = new EmphasisStore();
    const found = new Set(['position:a']);
    store.setFound(found);
    expect(store.found).toBe(found);
    const empty = new Set<string>();
    store.setFound(empty);
    expect(store.found).toBe(empty);
    store.setFound(null);
    expect(store.found).toBeNull();
  });

  it('success: exposes a string highlight in both accessors', () => {
    const store = new EmphasisStore();
    store.setHighlight('a');
    const highlight: string | null = store.highlight;
    const stateHighlight: string | null = store.state.highlight;
    expect(highlight).toBe('a');
    expect(stateHighlight).toBe('a');
  });

  it('failure: empty and null highlights clear an existing id', () => {
    const store = new EmphasisStore();
    store.setHighlight('a');
    store.setHighlight('');
    expect(store.highlight).toBeNull();
    store.setHighlight('b');
    store.setHighlight(null);
    expect(store.highlight).toBeNull();
  });

  it('success: state exposes both current values', () => {
    const store = new EmphasisStore();
    expect(store.state).toEqual({ found: null, highlight: null });
    const found = new Set(['position:a']);
    store.setFound(found);
    store.setHighlight('a');
    expect(store.state).toEqual({ found, highlight: 'a' });
    expect(store.state.found).toBe(found);
  });

  it('failure: clear unconditionally resets both populated fields', () => {
    const store = new EmphasisStore();
    store.setFound(new Set(['position:a']));
    store.setHighlight('a');
    store.clearEmphasis();
    expect(store.found).toBeNull();
    expect(store.highlight).toBeNull();
    expect(store.state).toEqual({ found: null, highlight: null });
    store.clearEmphasis();
    expect(store.state).toEqual({ found: null, highlight: null });
  });
});
