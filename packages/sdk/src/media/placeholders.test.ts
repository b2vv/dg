import { describe, expect, it } from 'vitest';
import { DEFAULT_MEDIA_PLACEHOLDERS } from './placeholders.js';
import { MediaService } from './MediaService.js';

describe('DEFAULT_MEDIA_PLACEHOLDERS', () => {
  it('success: default registry has loading/error/far', () => {
    expect(DEFAULT_MEDIA_PLACEHOLDERS.default?.loading).toMatch(/^data:image\/svg\+xml/);
    expect(DEFAULT_MEDIA_PLACEHOLDERS.default?.error).toMatch(/^data:image\/svg\+xml/);
    expect(DEFAULT_MEDIA_PLACEHOLDERS.default?.far).toMatch(/^data:image\/svg\+xml/);
  });

  it('success: MediaService resolves default then entityType override', () => {
    const media = new MediaService('light', {
      ...DEFAULT_MEDIA_PLACEHOLDERS,
      military: { error: 'data:image/svg+xml,military-err' },
    });
    expect(media.getPlaceholder(undefined, 'loading')).toBe(
      DEFAULT_MEDIA_PLACEHOLDERS.default?.loading,
    );
    expect(media.getPlaceholder('military', 'error')).toBe('data:image/svg+xml,military-err');
    expect(media.getPlaceholder('military', 'far')).toBe(DEFAULT_MEDIA_PLACEHOLDERS.default?.far);
  });
});
