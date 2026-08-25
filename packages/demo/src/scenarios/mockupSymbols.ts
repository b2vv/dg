/**
 * Data-URI SVG marks for the demo fixtures. Neutral by design — the demo is
 * published to GitHub Pages, so no real branding and no military insignia.
 */

/** Neutral brand mark (letter) as data-URI SVG — safe for GitHub Pages. */
export function brandMarkSymbol(mark: string, fill = '#5b9bd5'): string {
  const safe = mark.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || 'A';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect x="8" y="8" width="104" height="104" rx="16" fill="${fill}" stroke="#1e3a5f" stroke-width="4"/>
    <text x="60" y="78" text-anchor="middle" font-size="48" font-family="system-ui,sans-serif" font-weight="700" fill="#0f172a">${safe}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Wide banner symbol (~400×200) for full-bleed org cards. */
export function fullBleedOrgSymbol(label: string, fill = '#64748b'): string {
  const safe = label.replace(/[<>&"']/g, '').slice(0, 12) || 'ORG';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
    <rect width="400" height="200" fill="${fill}"/>
    <text x="200" y="112" text-anchor="middle" font-size="42" font-family="system-ui,sans-serif" font-weight="700" fill="#0f172a">${safe}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Figma-style org tree topology:
 * root → mid → five peer children (sibling dashed chrome in demo).
 */
