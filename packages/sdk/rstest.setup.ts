import { beforeAll, rstest } from '@rstest/core';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function create2dMock() {
  return {
    canvas: document.createElement('canvas'),
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillRect: rstest.fn(),
    strokeRect: rstest.fn(),
    clearRect: rstest.fn(),
    beginPath: rstest.fn(),
    closePath: rstest.fn(),
    moveTo: rstest.fn(),
    lineTo: rstest.fn(),
    arc: rstest.fn(),
    fill: rstest.fn(),
    stroke: rstest.fn(),
    drawImage: rstest.fn(),
    getImageData: rstest.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: rstest.fn(),
    save: rstest.fn(),
    restore: rstest.fn(),
    scale: rstest.fn(),
    rotate: rstest.fn(),
    translate: rstest.fn(),
    transform: rstest.fn(),
    setTransform: rstest.fn(),
    measureText: rstest.fn(() => ({ width: 10 })),
    fillText: rstest.fn(),
    strokeText: rstest.fn(),
    createLinearGradient: rstest.fn(() => ({ addColorStop: rstest.fn() })),
    createRadialGradient: rstest.fn(() => ({ addColorStop: rstest.fn() })),
    createPattern: rstest.fn(),
    clip: rstest.fn(),
    rect: rstest.fn(),
    quadraticCurveTo: rstest.fn(),
    bezierCurveTo: rstest.fn(),
  };
}

/** Minimal WebGL mock so Pixi Application can init in jsdom */
function createGlMock() {
  const noop = () => null;
  return {
    canvas: document.createElement('canvas'),
    drawingBufferWidth: 800,
    drawingBufferHeight: 600,
    getExtension: noop,
    getParameter: () => 0,
    getShaderPrecisionFormat: () => ({ precision: 1, rangeMin: 1, rangeMax: 1 }),
    createProgram: () => ({}),
    createShader: () => ({}),
    shaderSource: noop,
    compileShader: noop,
    attachShader: noop,
    linkProgram: noop,
    getProgramParameter: () => true,
    getShaderParameter: () => true,
    useProgram: noop,
    createBuffer: () => ({}),
    bindBuffer: noop,
    bufferData: noop,
    enable: noop,
    disable: noop,
    blendFunc: noop,
    viewport: noop,
    clearColor: noop,
    clear: noop,
    activeTexture: noop,
    bindTexture: noop,
    createTexture: () => ({}),
    texParameteri: noop,
    texImage2D: noop,
    generateMipmap: noop,
    createFramebuffer: () => ({}),
    bindFramebuffer: noop,
    framebufferTexture2D: noop,
    checkFramebufferStatus: () => 36053,
    deleteTexture: noop,
    deleteBuffer: noop,
    deleteProgram: noop,
    deleteShader: noop,
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    uniform1i: noop,
    uniform1f: noop,
    uniform2f: noop,
    uniform3f: noop,
    uniform4f: noop,
    uniformMatrix3fv: noop,
    uniformMatrix4fv: noop,
    enableVertexAttribArray: noop,
    vertexAttribPointer: noop,
    drawArrays: noop,
    drawElements: noop,
    pixelStorei: noop,
    readPixels: noop,
    scissor: noop,
    flush: noop,
    finish: noop,
  };
}

/**
 * jsdom implements no 2D context, and the list of methods Pixi's Canvas2D
 * renderer reaches for is not knowable up front — it cost two CI rounds to learn
 * that `resetTransform` follows `CanvasRenderingContext2D`. Unknown methods
 * therefore answer with a no-op rather than throwing; the explicit properties
 * above still carry the values anything reads.
 */
function permissive2dMock(): CanvasRenderingContext2D {
  const base = create2dMock() as Record<string | symbol, unknown>;
  const made = new Map<string | symbol, unknown>();
  return new Proxy(base, {
    get(target, key) {
      if (key in target) return target[key];
      if (!made.has(key)) made.set(key, rstest.fn());
      return made.get(key);
    },
    has: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

HTMLCanvasElement.prototype.getContext = function getContext(
  type: string,
  ..._args: unknown[]
) {
  if (type === '2d') {
    return permissive2dMock();
  }
  if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
    return createGlMock() as unknown as WebGLRenderingContext;
  }
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;

// jsdom ships no canvas implementation, so this browser global does not exist.
// Pixi's BrowserAdapter hands back the constructor itself
// (`getCanvasRenderingContext2D: () => CanvasRenderingContext2D`), and the
// Canvas2D renderer — the one `isWebGLSupported` leaves us with in jsdom —
// dereferences it on its first real paint. Before T84 no paint ever happened
// here, so the gap stayed invisible.
if ((globalThis as { CanvasRenderingContext2D?: unknown }).CanvasRenderingContext2D === undefined) {
  // A function, not an empty class: Pixi only ever hands this identifier back,
  // and an empty class trips the linter for no gain here.
  (globalThis as { CanvasRenderingContext2D?: unknown }).CanvasRenderingContext2D =
    function CanvasRenderingContext2D() {};
}

rstest.stubGlobal(
  'matchMedia',
  rstest.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark'),
    media: query,
    addEventListener: rstest.fn(),
    removeEventListener: rstest.fn(),
    addListener: rstest.fn(),
    removeListener: rstest.fn(),
    dispatchEvent: rstest.fn(),
  })),
);

rstest.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe = rstest.fn();
    disconnect = rstest.fn();
    unobserve = rstest.fn();
  },
);

beforeAll(async () => {
  // React 19 act() in jsdom
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  const wasmPath = join(
    dirname(fileURLToPath(import.meta.url)),
    'src/wasm/pkg/org_hierarchy_core_bg.wasm',
  );
  const bytes = readFileSync(wasmPath);
  const mod = await import('./src/wasm/pkg/org_hierarchy_core.js');
  await mod.default({ module_or_path: bytes });
});
