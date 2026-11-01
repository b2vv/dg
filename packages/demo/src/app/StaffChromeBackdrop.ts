import { createElement, type ReactElement, type CSSProperties } from 'react';
import type { PromoteBackdropProps } from '@org-hierarchy/sdk/react';
import {
  worldPointToScreen,
  roundedPathD,
  type StaffLiveGeometry,
  type ScreenPoint,
} from '@org-hierarchy/sdk';
import type { DiagramData } from '@org-hierarchy/sdk';

/**
 * React near-view CHROME for ШПС alpha (T129): department frames, the current-org
 * frame and the connector lines, drawn as the promote-overlay `backdrop` so they
 * share the cards' camera transform. Ported 1:1 from the mockup CSS (`.dept`/`.dn`,
 * `.org.cur`, SVG `.ln`/`.ent`); the Pixi chrome is gated off at mid/near when this
 * is mounted. Geometry (frames/lines/node boxes) comes from the SAME deterministic
 * Rust mockup layout the Pixi-far scene uses, so nothing drifts between the two.
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

export interface ChromeDeptFrame {
  departmentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  count: number;
}
export interface ChromeLine {
  points: ScreenPoint[]; // world coords
  endsOnDeptTop: boolean;
}
export interface StaffChromeGeometry {
  org: { x: number; y: number; width: number; height: number; name: string } | null;
  depts: ChromeDeptFrame[];
  lines: ChromeLine[];
}

/**
 * Derive the chrome geometry from the live staff geometry + data. Org frame = the
 * AABB of every department frame and seat node, padded (room for the `.dn`-style
 * org label at the top). Dept name/count joined from `data`.
 */
export function buildStaffChromeGeometry(
  live: StaffLiveGeometry,
  data: DiagramData,
  currentOrgId: string,
): StaffChromeGeometry {
  const deptName = new Map(data.departments.map((d) => [d.id, d.name]));
  const countByDept = new Map<string, number>();
  for (const p of data.positions) {
    if (p.departmentId) countByDept.set(p.departmentId, (countByDept.get(p.departmentId) ?? 0) + 1);
  }

  const depts: ChromeDeptFrame[] = live.frames.map((f) => ({
    departmentId: f.departmentId,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    name: deptName.get(f.departmentId) ?? f.departmentId,
    count: countByDept.get(f.departmentId) ?? 0,
  }));

  const lines: ChromeLine[] = live.routes.map((r) => ({
    points: r.points.map((p) => ({ x: p.x, y: p.y })),
    endsOnDeptTop: r.endsOnDeptTop === true,
  }));

  // Org frame = AABB over frames + seat nodes, padded (top wider for the label).
  const boxes = [
    ...live.frames.map((f) => ({ x: f.x, y: f.y, r: f.x + f.width, b: f.y + f.height })),
    ...live.canvas.positionNodes.map((n) => ({
      x: n.x,
      y: n.y,
      r: n.x + n.width,
      b: n.y + n.height,
    })),
  ];
  let org: StaffChromeGeometry['org'] = null;
  if (boxes.length > 0) {
    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.r));
    const maxY = Math.max(...boxes.map((b) => b.b));
    const PAD = 20;
    const TOP = 44; // room for the «name + Поточна організація» label row
    org = {
      x: minX - PAD,
      y: minY - TOP,
      width: maxX - minX + PAD * 2,
      height: maxY - minY + TOP + PAD,
      name:
        data.organizations.find((o) => o.id === currentOrgId)?.name ??
        data.organizations.find((o) => o.role === 'current')?.name ??
        '',
    };
  }

  return { org, depts, lines };
}

/** Factory: bind the (world) geometry; the returned component positions it per sync. */
export function makeStaffChromeBackdrop(
  geom: StaffChromeGeometry,
): (props: PromoteBackdropProps) => ReactElement | null {
  return function StaffChromeBackdrop(props: PromoteBackdropProps): ReactElement | null {
    const { viewport, screen, lod } = props;
    // Pixi owns far; the backdrop only paints at detail zoom.
    if (lod === 'far') return null;
    const s = viewport.scale;
    const px = (n: number) => n * s;
    const toScreen = (x: number, y: number) => worldPointToScreen(x, y, viewport);

    const children: ReactElement[] = [];

    // 1) Current-org frame (bottom of the stack).
    if (geom.org) {
      const o = geom.org;
      const tl = toScreen(o.x, o.y);
      children.push(
        createElement(
          'div',
          {
            key: 'org',
            'data-staff-org': '',
            style: {
              position: 'absolute',
              left: tl.x,
              top: tl.y,
              width: px(o.width),
              height: px(o.height),
              boxSizing: 'border-box',
              border: `${Math.max(1, s)}px solid ${C.orgBorder}`,
              borderRadius: px(14),
              background: C.orgBg,
            } as CSSProperties,
          },
          createElement(
            'div',
            {
              style: {
                position: 'absolute',
                top: px(14),
                left: px(18),
                display: 'flex',
                alignItems: 'center',
                gap: px(10),
                fontFamily: 'Onest, system-ui, sans-serif',
                fontSize: px(15),
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
                  fontSize: px(11.5),
                  fontWeight: 600,
                  padding: `${px(3)}px ${px(8)}px`,
                  borderRadius: px(5),
                  border: `${Math.max(1, s)}px solid ${C.chipBorder}`,
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

    // 2) Department frames with the filled `.dn` header (34px world).
    for (const d of geom.depts) {
      const tl = toScreen(d.x, d.y);
      children.push(
        createElement(
          'div',
          {
            key: `dept-${d.departmentId}`,
            'data-staff-dept': '',
            style: {
              position: 'absolute',
              left: tl.x,
              top: tl.y,
              width: px(d.width),
              height: px(d.height),
              boxSizing: 'border-box',
              border: `${Math.max(1, s)}px solid ${C.deptBorder}`,
              borderRadius: px(12),
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
                height: px(34),
                display: 'flex',
                alignItems: 'center',
                gap: px(8),
                padding: `0 ${px(14)}px`,
                background: C.dnBg,
                borderBottom: `${Math.max(1, s)}px solid ${C.deptBorder}`,
                borderRadius: `${px(11)}px ${px(11)}px 0 0`,
                boxSizing: 'border-box',
                fontFamily: 'Onest, system-ui, sans-serif',
                fontSize: px(14),
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
                  fontSize: px(12),
                  color: C.dnBadge,
                },
              },
              `${d.count} поз.`,
            ),
          ),
        ),
      );
    }

    // 3) Connector lines (top of the backdrop, under the cards). One SVG in screen
    //    space; 2px non-scaling stroke so the line stays crisp at any zoom.
    const paths: ReactElement[] = [];
    geom.lines.forEach((ln, i) => {
      if (ln.points.length < 2) return;
      const pts = ln.points.map((p) => toScreen(p.x, p.y));
      paths.push(
        createElement('path', {
          key: `ln-${i}`,
          d: roundedPathD(pts, px(4)),
          fill: 'none',
          stroke: C.line,
          strokeWidth: 2,
          vectorEffect: 'non-scaling-stroke',
        }),
      );
      if (ln.endsOnDeptTop) {
        const last = pts[pts.length - 1]!;
        paths.push(
          createElement('circle', {
            key: `ent-${i}`,
            cx: last.x,
            cy: last.y,
            r: 3.5,
            fill: C.line,
            stroke: C.entHalo,
            strokeWidth: 2,
            vectorEffect: 'non-scaling-stroke',
          }),
        );
      }
    });
    children.push(
      createElement(
        'svg',
        {
          key: 'lines',
          width: screen.width,
          height: screen.height,
          style: {
            position: 'absolute',
            left: 0,
            top: 0,
            overflow: 'visible',
            pointerEvents: 'none',
          },
        },
        ...paths,
      ),
    );

    return createElement(
      'div',
      { 'data-staff-chrome': '', style: { position: 'absolute', inset: 0, pointerEvents: 'none' } },
      ...children,
    );
  };
}
