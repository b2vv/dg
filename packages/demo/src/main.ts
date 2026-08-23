import { App } from './app/App.js';
import { mountNodeComparePage } from './nodeCompare/renderPage.js';
import { requireElement, showError } from './utils/dom.js';

async function bootstrap(): Promise<void> {
  try {
    if (new URLSearchParams(window.location.search).has('node-compare')) {
      await mountNodeComparePage();
      return;
    }
    const app = new App();
    await app.init();
  } catch (err) {
    const mount = document.getElementById('diagram-mount');
    const msg = err instanceof Error ? err.message : String(err);
    if (mount) {
      showError(mount, msg);
    }
    const status = document.getElementById('status');
    if (status) status.textContent = `Fatal: ${msg}`;
  }
}

void bootstrap();

/** Smoke export for tests */
export { App, requireElement };
