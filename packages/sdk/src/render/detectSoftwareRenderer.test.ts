import { describe, expect, it } from '@rstest/core';
import {
  createSoftwareRendererDetector,
  readUnmaskedRendererFromDom,
} from './detectSoftwareRenderer.js';

/**
 * jsdom hands back `null` from `getContext('webgl')`, which is only one of the
 * branches. Stubbing the prototype is how the others become reachable without
 * inventing a seam the production signature does not have.
 */
function withStubbedContext(
  context: unknown,
  run: () => void,
): void {
  const original = HTMLCanvasElement.prototype.getContext;
  (HTMLCanvasElement.prototype as unknown as { getContext: unknown }).getContext = () => context;
  try {
    run();
  } finally {
    HTMLCanvasElement.prototype.getContext = original;
  }
}

describe('createSoftwareRendererDetector', () => {
  it('success: recognises SwiftShader inside the ANGLE wrapper the browser actually reports', () => {
    // Not a hand-made string: this is the shape Chromium reports for a software
    // context, and matching the bare word would have missed it.
    const detect = createSoftwareRendererDetector(
      () => 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
    );
    expect(detect()).toBe(
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
    );
  });

  it('failure: a reader that throws yields unknown, and does not throw again on the next call', () => {
    let calls = 0;
    const detect = createSoftwareRendererDetector(() => {
      calls += 1;
      throw new Error('WEBGL_debug_renderer_info is not available');
    });
    expect(detect()).toBeNull();
    expect(detect()).toBeNull();
    // The throw is the answer, so it is remembered like any other: a driver that
    // refuses once will refuse again, and re-asking costs a context each time.
    expect(calls).toBe(1);
  });

  it('success: recognises the other software rasterisers by the strings drivers really report', () => {
    const real = [
      'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)',
      'Mesa/X.org, llvmpipe (LLVM 15.0.7, 256 bits)',
      'ANGLE (Software Adapter)',
      'Apple Software Renderer',
      'Gallium 0.4 on softpipe',
      'Chromium Software Rasterizer',
    ];
    for (const value of real) {
      // The driver's own string comes back, not our marker: a fragment of our
      // own list would describe our matching rather than the host's machine.
      expect(createSoftwareRendererDetector(() => value)()).toBe(value);
    }
  });

  it('success: matching ignores case, because vendors do not agree on it', () => {
    expect(createSoftwareRendererDetector(() => 'LLVMPIPE (LLVM 15.0.7)')()).toBe('LLVMPIPE (LLVM 15.0.7)');
    expect(createSoftwareRendererDetector(() => 'SwiftShader Device')()).toBe('SwiftShader Device');
  });

  it('failure: a real GPU is never demoted — an unrecognised name means unknown', () => {
    // The one regression this feature must not cause. `unknown` is what keeps
    // today's behaviour, so anything we fail to place stays on WebGL.
    const hardware = [
      'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)',
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'WebKit WebGL',
      'Mozilla',
    ];
    for (const value of hardware) {
      expect(createSoftwareRendererDetector(() => value)()).toBeNull();
    }
  });

  it('failure: a value that is not a usable string yields unknown instead of throwing', () => {
    const junk: unknown[] = [null, undefined, '', 42, {}, []];
    for (const value of junk) {
      expect(createSoftwareRendererDetector(() => value as string | null)()).toBeNull();
    }
  });

  it('success: the renderer string is read once, however often the verdict is asked for', () => {
    let calls = 0;
    const detect = createSoftwareRendererDetector(() => {
      calls += 1;
      return 'ANGLE (Google, SwiftShader Device)';
    });
    const want = 'ANGLE (Google, SwiftShader Device)';
    expect([detect(), detect(), detect()]).toEqual([want, want, want]);
    expect(calls).toBe(1);
  });

  it('success: two detectors keep separate answers, so the memo is not process-wide state', () => {
    const soft = createSoftwareRendererDetector(() => 'llvmpipe');
    const hard = createSoftwareRendererDetector(() => 'ANGLE (Apple, Apple M1 Pro)');
    expect(soft()).toBe('llvmpipe');
    expect(hard()).toBeNull();
  });
});

describe('readUnmaskedRendererFromDom', () => {
  it('success: returns the unmasked name and hands the probe context straight back', () => {
    let lost = 0;
    const gl = {
      getExtension: (name: string) =>
        name === 'WEBGL_debug_renderer_info'
          ? { UNMASKED_RENDERER_WEBGL: 0x9246 }
          : name === 'WEBGL_lose_context'
            ? { loseContext: () => { lost += 1; } }
            : null,
      getParameter: (p: number) => (p === 0x9246 ? 'ANGLE (Google, SwiftShader Device)' : null),
    };
    withStubbedContext(gl, () => {
      expect(readUnmaskedRendererFromDom()).toBe('ANGLE (Google, SwiftShader Device)');
    });
    expect(lost).toBe(1);
  });

  it('failure: no WebGL context at all is not knowing, and must not throw', () => {
    withStubbedContext(null, () => {
      expect(readUnmaskedRendererFromDom()).toBeNull();
    });
  });

  it('failure: a hidden debug extension still releases the context we took', () => {
    // Privacy-hardened browsers withhold the name. We asked for a context to ask
    // the question, so we owe it back whether or not we got an answer.
    let lost = 0;
    const gl = {
      getExtension: (name: string) =>
        name === 'WEBGL_lose_context' ? { loseContext: () => { lost += 1; } } : null,
      getParameter: () => 'never reached',
    };
    withStubbedContext(gl, () => {
      expect(readUnmaskedRendererFromDom()).toBeNull();
    });
    expect(lost).toBe(1);
  });

  it('failure: a driver that throws on getParameter yields null, not an exception', () => {
    const gl = {
      getExtension: (name: string) =>
        name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : null,
      getParameter: () => {
        throw new Error('blocked by privacy settings');
      },
    };
    withStubbedContext(gl, () => {
      expect(readUnmaskedRendererFromDom()).toBeNull();
    });
  });

  it('failure: an environment without WebGL — jsdom, as it really is — yields null', () => {
    // No stub: this is the unmodified test environment, and it stands in for
    // every browser that hands back nothing.
    expect(readUnmaskedRendererFromDom()).toBeNull();
  });
});
