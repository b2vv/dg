/** Create transform worker — path resolved by bundler at build time */
export function createTransformWorker(): Worker {
  return new Worker(new URL('../../../sdk/src/worker/transform.worker.ts', import.meta.url), {
    type: 'module',
  });
}
