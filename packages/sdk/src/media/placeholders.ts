import type { MediaPlaceholderRegistry } from './types.js';

/** Minimal SVG data-URIs for SDK defaults (T74 Q15·B / Q23·A). Host may override. */
const LOADING_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <rect width="48" height="48" rx="6" fill="#e2e8f0"/>
      <circle cx="24" cy="24" r="8" fill="none" stroke="#94a3b8" stroke-width="3" stroke-dasharray="12 8"/>
    </svg>`,
  );

const ERROR_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <rect width="48" height="48" rx="6" fill="#fee2e2"/>
      <path d="M16 16 L32 32 M32 16 L16 32" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  );

const FAR_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="3" fill="#cbd5e1"/>
    </svg>`,
  );

/**
 * Default placeholder registry keyed by `default` (required) + optional entityType overrides.
 * GoF: null-object / defaults — host merges via `mediaPlaceholders` config.
 */
export const DEFAULT_MEDIA_PLACEHOLDERS: MediaPlaceholderRegistry = {
  default: {
    loading: LOADING_SVG,
    error: ERROR_SVG,
    far: FAR_SVG,
  },
};
