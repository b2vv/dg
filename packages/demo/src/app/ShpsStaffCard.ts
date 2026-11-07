import { relatedStaffIds, type OrgHierarchyDiagram } from '@org-hierarchy/sdk';
import { useStaffHovered } from './StaffChromeBackdrop.js';
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

export interface StaffCardFocusState {
  /**
   * The search-found position id (§8.2). While set, every card except this one
   * dims to .38 — the mockup `.org.focus .card:not(.found){opacity:.38}`. Read on
   * every render (via `makeShpsStaffCard`'s thunk), so the dim is part of the
   * rendered output and survives promote re-syncs — unlike an imperative opacity
   * poke, which a camera-move re-render would wipe.
   */
  foundId: string | null;
  /** Current SDK expand state, read again whenever the overlay syncs. */
  expandedPositionIds?: readonly string[];
}

/**
 * Factory binding an optional focus-state thunk, read fresh on every render.
 * `ShpsStaffCard` (no thunk) is the plain card the `staff-shps` tab uses; the
 * `staff-alpha` tab passes a thunk so a search can dim the non-found cards.
 */
export function makeShpsStaffCard(
  getFocus?: () => StaffCardFocusState | null,
  diagram?: Pick<OrgHierarchyDiagram, 'setHovered' | 'subscribeInteraction' | 'getStaffChromeGeometry'>,
): (props: PromoteSlotProps) => ReactElement {
  if (!diagram) return (props: PromoteSlotProps) => renderShpsStaffCard(props, getFocus?.() ?? null);
  return function SubscribedStaffCard(props: PromoteSlotProps): ReactElement {
    const hovered = useStaffHovered(diagram);
    const geom = diagram.getStaffChromeGeometry();
    const related = hovered?.kind === 'position' && geom && Object.hasOwn(geom.nodeBoxes, hovered.id)
      ? relatedStaffIds(geom.lines, hovered.id) : null;
    return renderShpsStaffCard(props, getFocus?.() ?? null, diagram, related);
  };
}

/** Plain card (no search-focus dim) — the shape shared by both ШПС tabs. */
export const ShpsStaffCard: (props: PromoteSlotProps) => ReactElement = makeShpsStaffCard();

function renderShpsStaffCard(
  props: PromoteSlotProps,
  focus: StaffCardFocusState | null,
  diagram?: Pick<OrgHierarchyDiagram, 'setHovered'>,
  related: ReadonlySet<string> | null = null,
): ReactElement {
  const { screenRect, node, viewport } = props;
  const s = viewport.scale;
  const px = (n: number) => `${n * s}px`;

  const pos = node.position;
  const title = pos?.title ?? node.organization?.name ?? node.ref.id;
  const name = node.person?.fullName;
  const vacant = pos?.status === 'vacant' || (!name && node.ref.kind === 'position');
  const acting = pos?.status === 'acting' || pos?.isTemporary === true;
  // Head-стиль (оранж рамка/title/футер-чіп) — лише для голів (деп-корені+орг-корінь),
  // як у мокапі, а НЕ для будь-якої картки з дітьми. childrenCount керує футером окремо.
  const isHead = pos?.isHead === true;
  const hasChildren = (pos?.childrenCount ?? 0) > 0;
  const hasCounts = pos?.childrenCount != null || pos?.allDescendantCount != null;
  const date = periodLine(pos?.periodStart, pos?.periodEnd);

  // Position id — matches the connector lines and the §8.2 found marker. ref.id
  // can be the person id for a filled seat, which neither keys on.
  const posId = pos?.id ?? node.ref.id;
  // Search focus (§8.2): dim every card except the found one, mockup `.org.focus`.
  const dimmed = focus?.foundId != null && posId !== focus.foundId;

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
    opacity: related ? (related.has(posId) ? 1 : 0.45) : dimmed ? 0.38 : 1,
    // Smooth hover dim/accent (mockup `.card{transition:opacity .25s}` + border).
    transition: 'opacity .2s ease, border-color .15s ease',
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
        // v3 `.pos` = var(--pos-fs)=17px (не 15 — те для зовнішньої `.xcard`).
        fontSize: px(17),
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
        // v3 `.who` = var(--who-fs)=15px.
        fontSize: px(15),
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
    const footChildren: ReactElement[] = [
      createElement(
        'span',
        {
          key: 'cnt',
          style: { fontFamily: 'JetBrains Mono, monospace', fontSize: px(13), color: C.cnt },
        },
        `${n} `,
        createElement('span', { style: { color: C.cntDim } }, `[${m}]`),
      ),
    ];
    // Chevron-чіп лише коли є підлеглі (мокап: `.tg` рендериться if k.length).
    if (hasChildren) {
      const closed = pos?.expanded !== true && !focus?.expandedPositionIds?.includes(posId);
      footChildren.push(
        createElement(
          'span',
          {
            key: 'tg',
            // Collapse toggle (§8.1): keyed by position id, like the hover lines.
            'data-staff-toggle': posId,
            role: 'button',
            'aria-expanded': !closed,
            title: closed ? 'Розгорнути підлеглі посади' : 'Згорнути підлеглі посади',
            style: {
              position: 'absolute',
              right: px(8),
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: px(4),
              height: px(24),
              padding: `0 ${px(7)} 0 ${px(6)}`,
              borderRadius: px(12),
              border: `1px solid ${C.headBorder}`,
              background: closed ? C.headBorder : 'rgba(229,73,29,.14)',
              color: closed ? '#fff' : C.headPos,
              fontSize: px(12),
              fontWeight: 600,
              cursor: 'pointer',
              pointerEvents: 'auto',
              transition: 'background .15s',
            },
          },
          createElement(
            'svg',
            {
              key: 'chev',
              viewBox: '0 0 16 16',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              style: {
                width: px(14),
                height: px(14),
                transition: 'transform .2s',
                transform: closed ? 'rotate(-90deg)' : 'none',
              },
            },
            createElement('path', { d: 'M4 6l4 4 4-4' }),
          ),
          closed ? createElement('b', { key: 'n', style: { fontWeight: 600 } }, String(n)) : null,
        ),
      );
    }
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
        ...footChildren,
      ),
    );
  }

  return createElement(
    'div',
    {
      'data-promote-card': node.ref.id,
      // Position id (matches connector-line fromId/toId) for the hover highlight —
      // ref.id can be the person id for a filled seat, which lines don't key on.
      'data-staff-pos': posId,
      onPointerEnter: () => diagram?.setHovered(pos ? { kind: 'position', id: pos.id } : node.ref),
      onPointerLeave: () => diagram?.setHovered(null),
      style: root,
    },
    ...childNodes,
  );
}
