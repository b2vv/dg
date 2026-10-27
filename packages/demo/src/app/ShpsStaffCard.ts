import { createElement, type ReactElement, type CSSProperties } from 'react';
import type { PromoteSlotProps } from '@org-hierarchy/sdk/react';

/**
 * React promote card in the shape of the reference mockup
 * (`~/Downloads/mock2/ШПС картка v3.html`) — this is the **near-zoom** face of a
 * staff seat. At far zoom the SDK draws the Pixi card instead; the two must read
 * as the same object, so every size here is multiplied by `viewport.scale`.
 *
 * Dark palette lifted from the mockup's CSS variables so the card matches the
 * `theme: 'dark'` canvas it sits over.
 */
const C = {
  cardBg: '#2c2c31',
  cardBorder: '#4c4c54',
  headBorder: '#e5491d',
  headPos: '#ff8d68',
  pos: '#f6f6f7',
  who: '#c2c2c6',
  vac: '#f5a524',
  avaBg: '#3e3e45',
  avaText: '#f1f1f2',
  footBg: '#26262a',
  cardDiv: '#3c3c42',
  cnt: '#d6d6da',
  cntDim: '#8a8a90',
  date: '#a0a0a6',
  tmpBg: 'rgba(245,165,36,.16)',
} as const;

function initials(name: string | undefined): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || '—';
}

/** ISO `2025-02-03` → `з 03.02.2025 по т.ч.` (open-ended when `periodEnd` is null). */
function periodLine(start: string | undefined, end: string | null | undefined): string | null {
  if (!start) return null;
  const parts = start.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  const tail = end == null ? 'по т.ч.' : (() => {
    const e = end.split('-');
    return e.length === 3 ? `по ${e[2]}.${e[1]}.${e[0]}` : 'по т.ч.';
  })();
  return `з ${d}.${m}.${y} ${tail}`;
}

export function ShpsStaffCard(props: PromoteSlotProps): ReactElement {
  const { screenRect, node, viewport } = props;
  const s = viewport.scale;
  const px = (n: number) => `${n * s}px`;

  const pos = node.position;
  const title = pos?.title ?? node.organization?.name ?? node.ref.id;
  const name = node.person?.fullName;
  const vacant = pos?.status === 'vacant' || (!name && node.ref.kind === 'position');
  const acting = pos?.status === 'acting' || pos?.isTemporary === true;
  const isHead = pos?.isHead === true || (pos?.childrenCount ?? 0) > 0;
  const hasCounts = pos?.childrenCount != null || pos?.allDescendantCount != null;
  const date = periodLine(pos?.periodStart, pos?.periodEnd);

  const root: CSSProperties = {
    position: 'absolute',
    left: screenRect.left,
    top: screenRect.top,
    width: screenRect.width,
    height: screenRect.height,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: px(10),
    border: `${Math.max(1, (isHead ? 1.5 : 1) * s)}px solid ${isHead ? C.headBorder : C.cardBorder}`,
    background: C.cardBg,
    boxShadow: isHead
      ? `0 0 0 ${px(3)} rgba(229,73,29,.16), 0 ${px(6)} ${px(18)} rgba(0,0,0,.6)`
      : `0 ${px(6)} ${px(18)} rgba(0,0,0,.5)`,
    overflow: 'hidden',
    pointerEvents: 'auto',
    fontFamily: 'Onest, system-ui, sans-serif',
  };

  // Body — avatar + text column.
  const avatar = createElement(
    'div',
    {
      style: {
        width: px(38),
        height: px(38),
        flex: `0 0 ${px(38)}`,
        borderRadius: px(9),
        background: C.avaBg,
        color: vacant ? C.vac : C.avaText,
        display: 'grid',
        placeItems: 'center',
        fontSize: px(13),
        fontWeight: 600,
      },
    },
    initials(name),
  );

  const titleEl = createElement(
    'div',
    {
      style: {
        fontSize: px(15),
        fontWeight: 600,
        lineHeight: 1.28,
        color: isHead ? C.headPos : C.pos,
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 3,
        overflow: 'hidden',
        wordBreak: 'break-word',
      } as CSSProperties,
      title,
    },
    title,
  );

  const whoChildren: ReactElement[] = [];
  if (vacant) {
    whoChildren.push(
      createElement('span', { key: 'v', style: { color: C.vac } }, 'Вакантно'),
    );
  } else if (name) {
    whoChildren.push(createElement('span', { key: 'n' }, name));
    if (acting) {
      whoChildren.push(
        createElement(
          'span',
          {
            key: 't',
            title: 'Тимчасове призначення (ТВО)',
            style: {
              display: 'inline-grid',
              placeItems: 'center',
              width: px(18),
              height: px(18),
              borderRadius: px(5),
              background: C.tmpBg,
              color: C.vac,
              fontSize: px(11),
            },
          },
          '⌛',
        ),
      );
    }
  }

  const whoEl = createElement(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: px(6),
        fontSize: px(13.5),
        fontWeight: 500,
        lineHeight: 1.3,
        marginTop: px(4),
        color: vacant ? C.vac : C.who,
      },
    },
    ...whoChildren,
  );

  const textCol: ReactElement[] = [titleEl, whoEl];
  if (date) {
    textCol.push(
      createElement(
        'div',
        {
          key: 'd',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: px(5),
            marginTop: px(5),
            fontSize: px(12.5),
            fontWeight: 500,
            color: C.date,
            whiteSpace: 'nowrap',
          },
        },
        '🗓 ' + date,
      ),
    );
  }

  const body = createElement(
    'div',
    {
      style: {
        flex: 1,
        display: 'flex',
        gap: px(11),
        padding: `${px(11)} ${px(12)}`,
        alignItems: 'center',
        minHeight: 0,
      },
    },
    avatar,
    createElement('div', { style: { minWidth: 0, flex: 1 } }, ...textCol),
  );

  const childNodes: ReactElement[] = [body];

  if (hasCounts) {
    const n = pos?.childrenCount ?? 0;
    const m = pos?.allDescendantCount ?? 0;
    childNodes.push(
      createElement(
        'div',
        {
          key: 'foot',
          style: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: px(34),
            padding: `${px(6)} ${px(12)}`,
            borderTop: `1px solid ${C.cardDiv}`,
            background: C.footBg,
          },
        },
        createElement(
          'span',
          {
            style: { fontFamily: 'JetBrains Mono, monospace', fontSize: px(13), color: C.cnt },
          },
          `${n} `,
          createElement('span', { style: { color: C.cntDim } }, `[${m}]`),
        ),
        createElement(
          'span',
          {
            style: {
              position: 'absolute',
              right: px(8),
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              height: px(24),
              padding: `0 ${px(7)}`,
              borderRadius: px(12),
              border: `1px solid ${C.headBorder}`,
              background: 'rgba(229,73,29,.14)',
              color: C.headPos,
              fontSize: px(12),
              fontWeight: 600,
            },
          },
          '⌄',
        ),
      ),
    );
  }

  return createElement('div', { 'data-promote-card': node.ref.id, style: root }, ...childNodes);
}
