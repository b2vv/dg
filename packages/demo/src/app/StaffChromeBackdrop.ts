import { useLayoutEffect, useState, createElement, type ReactElement, type CSSProperties } from 'react';
import type { PromoteBackdropProps } from '@org-hierarchy/sdk/react';
import { roundedPathD, type NodeRef, type OrgHierarchyDiagram, type StaffChromeGeometry } from '@org-hierarchy/sdk';

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

/** React owns presentation; the SDK subscription is the sole hover input. */
export function useStaffHovered(
  diagram: Pick<OrgHierarchyDiagram, 'subscribeInteraction'> | undefined,
): NodeRef | null {
  const [hovered, setHovered] = useState<NodeRef | null>(null);
  useLayoutEffect(() => diagram?.subscribeInteraction(state => setHovered(state.hovered)), [diagram]);
  return hovered;
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
  getDiagram?: () => Pick<OrgHierarchyDiagram, 'subscribeInteraction'> | undefined,
): (props: PromoteBackdropProps) => ReactElement | null {
  if (getDiagram) {
    return function SubscribedStaffChromeBackdrop(props: PromoteBackdropProps): ReactElement | null {
      const hovered = useStaffHovered(getDiagram());
      return renderBackdrop(props, hovered);
    };
  }
  return renderBackdrop;

  function renderBackdrop(props: PromoteBackdropProps, hovered: NodeRef | null = null): ReactElement | null {
    const geom = getGeom();
    const { screen, lod, worldTransform } = props;
    // Pixi owns far; the backdrop only paints at detail zoom (and needs geometry).
    if (lod === 'far' || !geom) return null;
    const hoveredId = hovered?.kind === 'position' && Object.hasOwn(geom.nodeBoxes, hovered.id)
      ? hovered.id : null;

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
      const on = hoveredId !== null && (ln.fromId === hoveredId || ln.toId === hoveredId);
      const opacity = hoveredId === null || on ? 1 : 0.18;
      paths.push(
        createElement('path', {
          key: `ln-${i}`,
          'data-ln': '',
          'data-from': ln.fromId,
          'data-to': ln.toId,
          d: roundedPathD(ln.points, 4),
          fill: 'none',
          stroke: on ? HOVER_ACCENT : C.line,
          strokeWidth: on ? 2.5 : 2,
          vectorEffect: 'non-scaling-stroke',
          style: { opacity, transition: 'opacity .15s ease, stroke .15s ease, stroke-width .15s ease' },
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
            fill: on ? HOVER_ACCENT : C.line,
            stroke: C.entHalo,
            strokeWidth: 2,
            vectorEffect: 'non-scaling-stroke',
            style: { opacity, transition: 'opacity .15s ease, fill .15s ease' },
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
