import { afterEach, describe, expect, it, rstest } from '@rstest/core';
import { showError } from './utils/dom.js';
import { WasmLoadError } from '@org-hierarchy/sdk';

describe('demo WASM load failure', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    rstest.restoreAllMocks();
  });

  it('failure: WASM load error is shown in mount (not blank page)', () => {
    const mount = document.createElement('div');
    mount.id = 'diagram-mount';
    document.body.appendChild(mount);

    const err = new WasmLoadError(
      'Failed to load Org Hierarchy WASM. Run `npm run build:wasm` and ensure packages/sdk/src/wasm/pkg exists.',
    );
    showError(mount, err.message);

    const banner = mount.querySelector('.error-banner');
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toMatch(/build:wasm/i);
    expect(mount.textContent?.trim().length).toBeGreaterThan(0);
  });
});
