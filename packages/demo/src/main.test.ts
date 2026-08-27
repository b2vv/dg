import { describe, expect, it } from '@rstest/core';
import { App } from './app/App.js';
import { buildVariantBData } from './scenarios/variantB.js';

describe('demo smoke', () => {
  it('success: App and scenarios import without throw', () => {
    expect(App).toBeDefined();
    expect(buildVariantBData().positions).toHaveLength(6);
  });
});
