/**
 * The WASM loader. One instance per process, shared by everything that crosses
 * the boundary — which, since T80 removed the Rust contour, is exactly one
 * caller: `wasm/layoutBridge.ts` and the row-tree layout behind it.
 *
 * ⚠️ The names here still say «contour» — `initContourWasm`, `WasmContourModule`,
 * `ContourWasmLoader`, and the path of this file. Nothing in it computes a
 * contour any more. Renaming them is deliberately **not** part of T80: it would
 * mix a mass rename into a breaking purge, and `initContourWasm` is exported
 * from the public barrel, so it is its own decision with its own release note.
 * Until then, read «contour» here as «the one WASM module».
 */
export interface WasmContourModule {
  default: () => Promise<void>;
  computeOrgRowTreeLayout: (
    organizations: unknown,
    expandedRootId: string,
    direction?: string | null,
    nodeWidth?: number | null,
    nodeHeight?: number | null,
    hGap?: number | null,
    vGap?: number | null,
    margin?: number | null,
  ) => unknown;
}

/** Thrown when the WASM module cannot be loaded or initialized. */
export class WasmLoadError extends Error {
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'WasmLoadError';
    this.cause = cause;
  }
}

export type ContourWasmLoader = () => Promise<WasmContourModule>;

const defaultContourWasmLoader: ContourWasmLoader = async () => {
  const mod = (await import('../wasm/pkg/org_hierarchy_core.js')) as unknown as WasmContourModule;
  await mod.default();
  return mod;
};

let contourWasmLoader: ContourWasmLoader = defaultContourWasmLoader;
let wasm: WasmContourModule | null = null;
let wasmPromise: Promise<WasmContourModule> | null = null;

export async function initContourWasm(): Promise<WasmContourModule> {
  if (wasm) return wasm;
  if (!wasmPromise) {
    wasmPromise = (async () => {
      try {
        const mod = await contourWasmLoader();
        wasm = mod;
        return mod;
      } catch (err) {
        wasmPromise = null;
        wasm = null;
        if (err instanceof WasmLoadError) throw err;
        throw new WasmLoadError(
          'Failed to load Org Hierarchy WASM. Run `npm run build:wasm` and ensure packages/sdk/src/wasm/pkg exists.',
          err,
        );
      }
    })();
  }
  return wasmPromise;
}

/** Test helper — clear cached module so the next init reloads. */
export function resetContourWasmForTests(): void {
  wasm = null;
  wasmPromise = null;
}

/** Test helper — inject a failing/successful loader. Pass `null` to restore default. */
export function setContourWasmLoaderForTests(loader: ContourWasmLoader | null): void {
  contourWasmLoader = loader ?? defaultContourWasmLoader;
  resetContourWasmForTests();
}
