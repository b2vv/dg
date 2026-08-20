import type { WasmContourModule } from '../contour/bridge.js';

let wasmPromise: Promise<WasmContourModule> | null = null;

/** Lazy WASM init — safe to call from Web Worker */
export async function initWasmModule(): Promise<WasmContourModule> {
  if (!wasmPromise) {
    wasmPromise = (async () => {
      const mod = (await import('../wasm/pkg/org_hierarchy_core.js')) as unknown as WasmContourModule;
      await mod.default();
      return mod;
    })();
  }
  return wasmPromise;
}

/** Test helper */
export function resetWasmModuleForTests(): void {
  wasmPromise = null;
}
