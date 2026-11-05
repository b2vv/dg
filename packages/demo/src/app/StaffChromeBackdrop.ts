import { createElement, type ReactElement, type CSSProperties } from 'react';
import type { PromoteBackdropProps } from '@org-hierarchy/sdk/react';
import { roundedPathD, type StaffChromeGeometry } from '@org-hierarchy/sdk';

/**
 * React near-view CHROME for ШПС alpha (T129): department frames, the current-org
 * frame and the connector lines, drawn as the promote-overlay `backdrop` so they
 * share the cards' camera transform. Ported 1:1 from the mockup CSS (`.dept`/`.dn`,
 * `.org.cur`, SVG `.ln`/`.ent`); the Pixi chrome is gated off at mid/near when this
 * is mounted.
 *
 * Б2: geometry comes from the SDK (`diagram.getStaffChromeGeometry()`), and this
 * backdrop draws it under ONE camera transform (`props.worldTransform`) — HTML
 * frames in a CSS-transformed layer, connector lines in an SVG `<g>` with a
 * non-scaling stroke — instead of mapping each point to screen px. The host owns no
 * geometry: it only styles. `foundId` (which seat the search hit) is host state the
 * demo composes onto the SDK geometry, since the SDK type does not carry it.
 */

// Palette lifted from the mockup CSS variables (facts, not copied code).
const C = {
  deptBg: '#111113',
  deptBorder: '#3a3a40',
  dnBg: '#202023',
  dnName: '#f1f1f2',
  dnBadge: '#9a9aa0',
  orgBorder: '#5a5a62',
  orgBg: '#0f0f11',
  orgName: '#f1f1f2',
  chipBorder: '#e5491d',
  chipText: '#ff8d68',
  chipBg: 'rgba(229,73,29,.1)',
  line: '#c2502a',
  entHalo: '#0d0d0e',
} as const;

/** SDK chrome geometry plus the demo's own search-hit id (host state, §8.2). */
export type StaffChromeWithFound = StaffChromeGeometry & { foundId: string | null };

const HOVER_ACCENT = '#ff8d68'; // mockup `.ln.on` / `.card.rel`

/**
 * Pure: the set of position ids highlighted when `hoveredId` is hovered — itself
 * plus every endpoint of a connector line that touches it (parent + direct
 * children + cross-dept counterparts), as the mockup `hl()` computes `rel`.
 */
export function relatedStaffIds(
  lines: ReadonlyArray<{ fromId: string; toId: string }>,
  hoveredId: string,
): Set<string> {
  const rel = new Set<string>([hoveredId]);
  for (const l of lines) {
    if (l.fromId === hoveredId || l.toId === hoveredId) {
      rel.add(l.fromId);
      rel.add(l.toId);
    }
  }
  return rel;
}

/**
 * ШПС alpha hover highlight (§7/§8.2): hovering a seat card lights its connector
 * lines (accent, thicker) and keeps the related cards full, dimming every other
 * card and line — the mockup `.hl` behaviour. Imperative (toggles inline styles on
 * the already-rendered DOM, like the mockup's class toggles) rather than React
 * state, so it does not force the overlay to re-sync; a camera move re-renders the
 * backdrop and clears the hover, which is the intended end-of-hover. Returns a
 * disposer. `pointerEvents:none` on the backdrop means hover lands on the cards,
 * so one delegated listener on the mount covers enter AND leave.
 */
export function installStaffHoverHighlight(
  mount: HTMLElement,
  getFoundId?: () => string | null,
): () => void {
  let current: string | null = null;

  const clear = (): void => {
    mount.querySelectorAll<SVGElement>('[data-ln]').forEach((l) => {
      l.style.opacity = '';
      l.style.stroke = '';
      l.style.strokeWidth = '';
      l.style.fill = '';
    });
    // Restore the search-focus baseline (§8.2) rather than blanking opacity: the
    // card dim is a rendered inline style (`opacity:.38` on non-found), so clearing
    // to '' would wipe it until the next re-render. While a search is focused, put
    // each card back to its focus value; otherwise clear it.
    const foundId = getFoundId?.() ?? null;
    mount.querySelectorAll<HTMLElement>('[data-staff-pos]').forEach((c) => {
      if (foundId == null) c.style.opacity = '';
      else c.style.opacity = c.getAttribute('data-staff-pos') === foundId ? '1' : '0.38';
    });
  };

  const apply = (id: string | null): void => {
    if (!id) {
      clear();
      return;
    }
    const lnEls = [...mount.querySelectorAll<SVGElement>('[data-ln]')];
    const rel = relatedStaffIds(
      lnEls.map((l) => ({
        fromId: l.getAttribute('data-from') ?? '',
        toId: l.getAttribute('data-to') ?? '',
      })),
      id,
    );
    for (const l of lnEls) {
      const on = l.getAttribute('data-from') === id || l.getAttribute('data-to') === id;
      l.style.opacity = on ? '1' : '0.18';
      if (l.tagName.toLowerCase() === 'circle') l.style.fill = on ? HOVER_ACCENT : '';
      else {
        l.style.stroke = on ? HOVER_ACCENT : '';
        l.style.strokeWidth = on ? '2.5' : '';
      }
    }
    for (const c of mount.querySelectorAll<HTMLElement>('[data-staff-pos]')) {
      const isRel = rel.has(c.getAttribute('data-staff-pos') ?? '');
      // Only dim via opacity (reverts cleanly). We deliberately do NOT recolour the
      // card border: `borderColor=''` reverts to `currentColor` (--text #e2e8f0),
      // not the card's own border, which painted a stray light ring on every card
      // after a hover. Related cards read as related by staying full-opacity.
      c.style.opacity = isRel ? '1' : '0.45';
    }
  };

  const onOver = (e: Event): void => {
    const target = e.target as Element | null;
    const id = target?.closest?.('[data-staff-pos]')?.getAttribute('data-staff-pos') ?? null;
    if (id === current) return;
    current = id;
    apply(id);
  };

  mount.addEventListener('mouseover', onOver);
  return () => {
    mount.removeEventListener('mouseover', onOver);
    clear();
  };
}

/**
 * Factory: the returned component reads the LATEST geometry from `getGeom` on every
 * render (not a bound snapshot), so collapse/expand can swap the geometry and force
 * one overlay `sync()` — re-laying the frames/lines in place, with no diagram
 * teardown and no flash.
 *
 * Draws everything in WORLD coords under `props.worldTransform` (Б2): HTML frames in
 * a CSS-transformed layer, connector lines in an SVG `<g>` with the same transform
 * and `non-scaling-stroke`. The backdrop stays the first node of the overlay layer,
 * so the pan catch-up transform carries it with the cards. Paint order (bottom→top):
 * org + dept frames, connector lines, search-found marker.
 */
export function makeStaffChromeBackdrop(
  getGeom: () => StaffChromeWithFound | null,
): (props: PromoteBackdropProps) => ReactElement | null {
  return function StaffChromeBackdrop(props: PromoteBackdropProps): ReactElement | null {
    const geom = getGeom();
    const { screen, lod, worldTransform } = props;
    // Pixi owns far; the backdrop only paints at detail zoom (and needs geometry).
    if (lod === 'far' || !geom) return null;

    // One CSS layer in world coords; children carry raw world numbers. Font sizes,
    // paddings and borders scale with zoom (the mockup `px(n)=n*s` behaviour), now
    // for free via the transform.
    const worldLayer: CSSProperties = {
      position: 'absolute',
      left: 0,
      top: 0,
      transform: worldTransform,
      transformOrigin: '0 0',
    };

    // --- Layer 1: org + department frames (bottom) ---------------------------
    const frames: ReactElement[] = [];

    if (geom.org) {
      const o = geom.org;
      frames.push(
        createElement(
          'div',
          {
            key: 'org',
            'data-staff-org': '',
            style: {
              position: 'absolute',
              left: o.x,
              top: o.y,
              width: o.width,
              height: o.height,
              boxSizing: 'border-box',
              border: `1px solid ${C.orgBorder}`,
              borderRadius: 14,
              background: C.orgBg,
            } as CSSProperties,
          },
          createElement(
            'div',
            {
              style: {
                position: 'absolute',
                top: 14,
                left: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: 'Onest, system-ui, sans-serif',
                fontSize: 15,
                fontWeight: 600,
                color: C.orgName,
                whiteSpace: 'nowrap',
              },
            },
            o.name,
            createElement(
              'span',
              {
                style: {
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 5,
                  border: `1px solid ${C.chipBorder}`,
                  color: C.chipText,
                  background: C.chipBg,
                },
              },
              'Поточна організація',
            ),
          ),
        ),
      );
    }

    for (const d of geom.depts) {
      frames.push(
        createElement(
          'div',
          {
            key: `dept-${d.departmentId}`,
            'data-staff-dept': '',
            style: {
              position: 'absolute',
              left: d.x,
              top: d.y,
              width: d.width,
              height: d.height,
              boxSizing: 'border-box',
              border: `1px solid ${C.deptBorder}`,
              borderRadius: 12,
              background: C.deptBg,
              overflow: 'hidden',
            } as CSSProperties,
          },
          createElement(
            'div',
            {
              'data-staff-dn': '',
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 14px',
                background: C.dnBg,
                borderBottom: `1px solid ${C.deptBorder}`,
                borderRadius: '11px 11px 0 0',
                boxSizing: 'border-box',
                fontFamily: 'Onest, system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 600,
                color: C.dnName,
                whiteSpace: 'nowrap',
              } as CSSProperties,
            },
            d.name,
            createElement(
              'span',
              {
                style: {
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  color: C.dnBadge,
                },
              },
              `${d.count} поз.`,
            ),
          ),
        ),
      );
    }

    // --- Layer 2: connector lines (middle). One SVG in screen space; the `<g>`
    //     carries the SAME world transform, and `non-scaling-stroke` keeps the 2px
    //     line crisp at any zoom (SVG transform, not an ancestor CSS transform). ---
    const paths: ReactElement[] = [];
    geom.lines.forEach((ln, i) => {
      if (ln.points.length < 2) return;
      paths.push(
        createElement('path', {
          key: `ln-${i}`,
          'data-ln': '',
          'data-from': ln.fromId,
          'data-to': ln.toId,
          d: roundedPathD(ln.points, 4),
          fill: 'none',
          stroke: C.line,
          strokeWidth: 2,
          vectorEffect: 'non-scaling-stroke',
          style: { transition: 'opacity .15s ease, stroke .15s ease, stroke-width .15s ease' },
        }),
      );
      if (ln.endsOnDeptTop) {
        const last = ln.points[ln.points.length - 1]!;
        paths.push(
          createElement('circle', {
            key: `ent-${i}`,
            'data-ln': '',
            'data-from': ln.fromId,
            'data-to': ln.toId,
            cx: last.x,
            cy: last.y,
            r: 3.5,
            fill: C.line,
            stroke: C.entHalo,
            strokeWidth: 2,
            vectorEffect: 'non-scaling-stroke',
            style: { transition: 'opacity .15s ease, fill .15s ease' },
          }),
        );
      }
    });

    // --- Layer 3: search-found marker (§8.2, top) — world coords, so it rings the
    //     found card (a promote slot above the backdrop). The 4px outline-offset and
    //     the top chip sit OUTSIDE the card box; the pulse keyframes live in the demo
    //     stylesheet (`.staff-found`). ------------------------------------------
    let foundEl: ReactElement | null = null;
    if (geom.foundId) {
      const box = geom.nodeBoxes[geom.foundId];
      if (box) {
        foundEl = createElement(
          'div',
          {
            key: 'found',
            className: 'staff-found',
            'data-staff-found': geom.foundId,
            style: {
              position: 'absolute',
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
              boxSizing: 'border-box',
              borderRadius: 10,
              outline: '2px solid #fff',
              outlineOffset: 4,
              pointerEvents: 'none',
            } as CSSProperties,
          },
          createElement(
            'div',
            {
              style: {
                position: 'absolute',
                left: -2,
                top: -32,
                padding: '4px 9px',
                borderRadius: 6,
                background: '#fff',
                color: '#111113',
                fontFamily: 'Onest, system-ui, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              } as CSSProperties,
            },
            'Знайдено',
          ),
        );
      }
    }

    const children: ReactElement[] = [
      createElement('div', { key: 'frames', 'data-staff-world': '', style: worldLayer }, ...frames),
      createElement(
        'svg',
        {
          key: 'lines',
          width: screen.width,
          height: screen.height,
          style: { position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' },
        },
        createElement('g', { transform: worldTransform }, ...paths),
      ),
    ];
    if (foundEl) {
      children.push(
        createElement('div', { key: 'found-layer', style: worldLayer }, foundEl),
      );
    }

    return createElement(
      'div',
      { 'data-staff-chrome': '', style: { position: 'absolute', inset: 0, pointerEvents: 'none' } },
      ...children,
    );
  };
}
