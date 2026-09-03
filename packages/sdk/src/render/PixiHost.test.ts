import { describe, expect, it } from '@rstest/core';
import { Application } from 'pixi.js';
import { PixiHost, resolvePixiResolution, resolveRendererPreference } from './PixiHost.js';

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

describe('resolveRendererPreference — software fallback', () => {
  it('success: auto on a recognised software rasteriser asks for canvas outright', () => {
    const resolved = resolveRendererPreference('auto', () => 'swiftshader');
    expect(resolved.preference).toEqual(['canvas']);
    expect(resolved.failIfMajorPerformanceCaveat).toBe(false);
  });

  it('failure: a renderer we cannot place leaves the choice exactly as it was', () => {
    // The regression this feature must not cause. Byte-for-byte the old result.
    expect(resolveRendererPreference('auto', () => null)).toEqual({
      preference: ['webgl', 'canvas'],
      failIfMajorPerformanceCaveat: true,
    });
  });

  it('failure: an explicit renderer is never second-guessed — nothing is even asked', () => {
    let asked = 0;
    const spy = () => {
      asked += 1;
      return 'swiftshader';
    };
    expect(resolveRendererPreference('webgl', spy).preference).toEqual(['webgl']);
    expect(resolveRendererPreference('canvas', spy).preference).toEqual(['canvas']);
    expect(asked).toBe(0);
  });

  it('success: when the fallback fires, the host is told which renderer caused it', () => {
    const resolved = resolveRendererPreference('auto', () => 'swiftshader');
    expect(resolved.diagnostic).toBeDefined();
    expect(resolved.diagnostic).toContain('swiftshader');
    expect(resolved.diagnostic).toContain('canvas');
  });

  it('failure: when nothing changed, nothing is said', () => {
    // A diagnostic about a decision that was not taken teaches hosts to ignore
    // the channel, so silence here is the feature.
    expect(resolveRendererPreference('auto', () => null).diagnostic).toBeUndefined();
  });
});

describe('resolveRendererPreference', () => {
  it('success: auto asks for webgl-then-canvas and lets the browser refuse software webgl', () => {
    expect(resolveRendererPreference('auto')).toEqual({
      preference: ['webgl', 'canvas'],
      failIfMajorPerformanceCaveat: true,
    });
  });

  it('success: an absent option is auto, and says nothing about it', () => {
    expect(resolveRendererPreference(undefined)).toEqual(resolveRendererPreference('auto'));
    expect(resolveRendererPreference(undefined).diagnostic).toBeUndefined();
  });

  it('failure: an unknown value behaves as auto and names both values', () => {
    // `as never` on purpose: this is the untyped-host path, and the type system
    // is exactly what such a host does not have.
    const resolved = resolveRendererPreference('vulkan' as never);
    expect(resolved.preference).toEqual(['webgl', 'canvas']);
    expect(resolved.failIfMajorPerformanceCaveat).toBe(true);
    expect(resolved.diagnostic).toContain('vulkan');
    expect(resolved.diagnostic).toContain('auto');
  });

  it('success: canvas is the guarantee — webgl is never attempted', () => {
    expect(resolveRendererPreference('canvas')).toEqual({
      preference: ['canvas'],
      failIfMajorPerformanceCaveat: false,
    });
  });

  it('success: webgl pins the engine and accepts a software context', () => {
    expect(resolveRendererPreference('webgl')).toEqual({
      preference: ['webgl'],
      failIfMajorPerformanceCaveat: false,
    });
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

  it('success: a pinned canvas host reports canvas, and null once destroyed', async () => {
    const container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '300px';
    document.body.appendChild(container);

    const host = await PixiHost.create(container, { renderer: 'canvas' });
    expect(host.getRendererKind()).toBe('canvas');
    host.destroy();
    // Support asks "which engine drew this?" after the fact — a throw there
    // would be the worst answer, so the lifecycle state is a value.
    expect(host.getRendererKind()).toBeNull();
    document.body.removeChild(container);
  });

  it('failure: the shared ticker does not run — nothing paints unless asked', async () => {
    const container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '300px';
    document.body.appendChild(container);

    const host = await PixiHost.create(container);
    const app = host.getApplication()!;

    // jsdom starves requestAnimationFrame, so a paint counter here would read
    // zero whether or not the ticker runs — it cannot prove idle cost. What it
    // can prove is that the loop is not armed; the CPU number lives in the
    // browser measurement recorded in work/reports/zero-client/report.md.
    expect(app.ticker.started).toBe(false);

    host.destroy();
    document.body.removeChild(container);
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
