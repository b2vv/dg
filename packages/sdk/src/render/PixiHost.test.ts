import { describe, expect, it } from 'vitest';
import { Application } from 'pixi.js';
import { PixiHost, resolvePixiResolution } from './PixiHost.js';

describe('resolvePixiResolution', () => {
  it('success: uses explicit positive resolution capped at 3', () => {
    expect(resolvePixiResolution(2)).toBe(2);
    expect(resolvePixiResolution(8)).toBe(3);
  });

  it('failure: non-finite / non-positive explicit falls back to devicePixelRatio path', () => {
    expect(resolvePixiResolution(0)).toBeGreaterThan(0);
    expect(resolvePixiResolution(Number.NaN)).toBeGreaterThan(0);
    expect(resolvePixiResolution(-1)).toBeGreaterThan(0);
  });
});

describe('PixiHost create/destroy (A4)', () => {
  it('failure: abort during Application.init rejects and leaves no canvas', async () => {
    const container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '300px';
    document.body.appendChild(container);

    const originalInit = Application.prototype.init;
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    Application.prototype.init = async function (this: Application, ...args: unknown[]) {
      await gate;
      return originalInit.apply(this, args as never);
    };

    try {
      const ac = new AbortController();
      const pending = PixiHost.create(container, { signal: ac.signal });
      ac.abort();
      release();
      await expect(pending).rejects.toThrow(/destroyed during create/i);
      expect(container.querySelector('canvas')).toBeNull();
    } finally {
      Application.prototype.init = originalInit;
      document.body.removeChild(container);
    }
  });

  it('success: create then destroy clears application', async () => {
    const container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '300px';
    document.body.appendChild(container);

    const host = await PixiHost.create(container);
    expect(host.getApplication()).toBeTruthy();
    host.destroy();
    expect(host.getApplication()).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
    document.body.removeChild(container);
  });
});
