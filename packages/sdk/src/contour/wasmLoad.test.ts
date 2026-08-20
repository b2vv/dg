import { afterEach, describe, expect, it } from 'vitest';
import {
  initContourWasm,
  resetContourWasmForTests,
  setContourWasmLoaderForTests,
  WasmLoadError,
} from './bridge.js';

describe('initContourWasm', () => {
  afterEach(() => {
    setContourWasmLoaderForTests(null);
    resetContourWasmForTests();
  });

  it('success: loads wasm module once', async () => {
    const m = await initContourWasm();
    expect(m.computeDeptContour).toBeTypeOf('function');
    const again = await initContourWasm();
    expect(again).toBe(m);
  });

  it('failure: wraps loader errors as WasmLoadError with build:wasm hint', async () => {
    setContourWasmLoaderForTests(async () => {
      throw new Error('simulated missing wasm');
    });

    await expect(initContourWasm()).rejects.toBeInstanceOf(WasmLoadError);
    await expect(initContourWasm()).rejects.toThrow(/build:wasm/i);

    // Cached failure cleared — retry with restored loader succeeds.
    setContourWasmLoaderForTests(null);
    const m = await initContourWasm();
    expect(m.computeDeptContour).toBeTypeOf('function');
  });
});
