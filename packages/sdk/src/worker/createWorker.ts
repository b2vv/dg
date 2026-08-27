/**
 * Default transform + WASM compute worker factory.
 *
 * The URL says `.js`, not `.ts`: `tsc` leaves this string alone, so a `.ts` here
 * ships in `dist` pointing at a file that is not there, and the consumer loses
 * its worker without being told. Bundlers resolve `.js` back to the source in
 * development, which is the same convention every import in this package uses.
 */
export function createTransformWorker(): Worker {
  return new Worker(new URL('./transform.worker.js', import.meta.url), {
    type: 'module',
  });
}
