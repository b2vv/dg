import { describe, expect, it } from '@rstest/core';
import { resolveWheelConfig, wheelAction } from './wheelConfig.js';
import type { WheelConfig } from './wheelConfig.js';

const plain = { ctrlKey: false, metaKey: false, shiftKey: false };

describe('wheelConfig', () => {
  it('resolves defaults and leaves Shift to the host', () => {
    const config = resolveWheelConfig(undefined, 'other');
    expect(wheelAction(config, plain)).toBe('pan-vertical');
    expect(wheelAction(config, { ...plain, ctrlKey: true })).toBe('zoom');
    expect(wheelAction(config, { ...plain, metaKey: true })).toBe('pan-vertical');
    expect(wheelAction(config, { ...plain, shiftKey: true, ctrlKey: true })).toBe('none');
  });

  it('supports plain zoom, pan precedence, and explicit horizontal pan', () => {
    expect(wheelAction(resolveWheelConfig({ behavior: 'zoom' }, 'other'), plain)).toBe('zoom');
    expect(wheelAction(resolveWheelConfig({ behavior: 'pan', gestures: { zoom: 'ctrl' } }, 'other'), { ...plain, ctrlKey: true })).toBe('pan-vertical');
    expect(wheelAction(resolveWheelConfig({ gestures: { panHorizontal: 'shift' } }, 'other'), { ...plain, shiftKey: true })).toBe('pan-horizontal');
  });

  it('uses strict modifiers outside Mac and preserves both Mac command and pinch', () => {
    for (const zoom of ['ctrl', 'meta'] as const) {
      const other = resolveWheelConfig({ gestures: { zoom } }, 'other');
      expect(wheelAction(other, { ...plain, ctrlKey: true })).toBe(zoom === 'ctrl' ? 'zoom' : 'pan-vertical');
      expect(wheelAction(other, { ...plain, metaKey: true })).toBe(zoom === 'meta' ? 'zoom' : 'pan-vertical');
      const mac = resolveWheelConfig({ gestures: { zoom } }, 'mac');
      expect(wheelAction(mac, { ...plain, metaKey: true })).toBe('zoom');
      expect(wheelAction(mac, { ...plain, ctrlKey: true })).toBe('zoom');
    }
  });

  it('disables wheel zoom with none on both platforms, even with behavior zoom', () => {
    for (const platform of ['mac', 'other'] as const) {
      for (const behavior of ['zoom', 'zoom-modifier', 'pan'] as const) {
        const config = resolveWheelConfig({ behavior, gestures: { zoom: 'none' } }, platform);
        expect(wheelAction(config, { ...plain, ctrlKey: true, metaKey: true })).toBe('pan-vertical');
      }
    }
  });

  it('falls back for malformed strings and undefined platform', () => {
    // Runtime JavaScript callers can bypass the declared configuration types.
    const malformed: WheelConfig = JSON.parse('{"behavior":"bogus","gestures":{"zoom":"bad","panHorizontal":"bad"}}');
    expect(resolveWheelConfig(malformed, 'other')).toEqual(resolveWheelConfig(undefined, 'other'));
    expect(resolveWheelConfig(undefined, undefined)).toEqual(resolveWheelConfig(undefined, 'other'));
  });
});
