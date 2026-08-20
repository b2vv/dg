/** Default transform + WASM compute worker factory */
export function createTransformWorker(): Worker {
  return new Worker(new URL('./transform.worker.ts', import.meta.url), {
    type: 'module',
  });
}
