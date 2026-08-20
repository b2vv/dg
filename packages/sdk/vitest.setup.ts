import { beforeAll, vi } from 'vitest';
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
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createPattern: vi.fn(),
    clip: vi.fn(),
    rect: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
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

HTMLCanvasElement.prototype.getContext = function getContext(
  type: string,
  ..._args: unknown[]
) {
  if (type === '2d') {
    return create2dMock() as unknown as CanvasRenderingContext2D;
  }
  if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
    return createGlMock() as unknown as WebGLRenderingContext;
  }
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;

vi.stubGlobal(
  'matchMedia',
  vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  },
);

beforeAll(async () => {
  const wasmPath = join(
    dirname(fileURLToPath(import.meta.url)),
    'src/wasm/pkg/org_hierarchy_core_bg.wasm',
  );
  const bytes = readFileSync(wasmPath);
  const mod = await import('./src/wasm/pkg/org_hierarchy_core.js');
  await mod.default({ module_or_path: bytes });
});
