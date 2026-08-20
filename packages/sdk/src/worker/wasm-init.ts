import type { WasmContourModule } from '../contour/bridge.js';
import { WasmLoadError } from '../contour/bridge.js';

let wasmPromise: Promise<WasmContourModule> | null = null;

/** Lazy WASM init — safe to call from Web Worker */
export async function initWasmModule(): Promise<WasmContourModule> {
  if (!wasmPromise) {
    wasmPromise = (async () => {
      try {
        const mod = (await import('../wasm/pkg/org_hierarchy_core.js')) as unknown as WasmContourModule;
        await mod.default();
        return mod;
      } catch (err) {
        wasmPromise = null;
        if (err instanceof WasmLoadError) throw err;
        throw new WasmLoadError(
          'Failed to load Org Hierarchy WASM in worker. Run `npm run build:wasm`.',
          err,
        );
      }
    })();
  }
  return wasmPromise;
}

/** Test helper */
export function resetWasmModuleForTests(): void {
  wasmPromise = null;
}
