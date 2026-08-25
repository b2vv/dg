/* tslint:disable */
/* eslint-disable */

/**
 * Контури для всіх dept у positions
 */
export function computeAllContours(positions: any, config?: any | null): any;

/**
 * Контур dept з правилами магнетизму (§4.6.1)
 */
export function computeDeptContour(department_id: string, positions: any, config?: any | null): any;

/**
 * Row-tree layout для org: validate → subtree → Ploeg layered tidy
 */
export function computeOrgRowTreeLayout(organizations: any, expanded_root_id: string, direction?: string | null, node_width?: number | null, node_height?: number | null, h_gap?: number | null, v_gap?: number | null, margin?: number | null): any;

export function init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly computeAllContours: (a: any, b: number) => [number, number, number];
    readonly computeDeptContour: (a: number, b: number, c: any, d: number) => [number, number, number];
    readonly computeOrgRowTreeLayout: (a: any, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number) => [number, number, number];
    readonly init: () => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
