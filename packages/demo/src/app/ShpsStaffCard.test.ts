import { describe, expect, it } from '@rstest/core';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PromoteSlotProps } from '@org-hierarchy/sdk/react';
import { ShpsStaffCard, makeShpsStaffCard } from './ShpsStaffCard.js';

/** Minimal slot props — only the fields the card reads. */
function slot(posId: string, title = 'Директор'): PromoteSlotProps {
  return {
    id: posId,
    node: {
      ref: { id: posId, kind: 'position' },
      position: { id: posId, title, status: 'filled', isHead: false, childrenCount: 0 },
      person: { fullName: 'Петренко О. В.' },
    },
    screenRect: { left: 0, top: 0, width: 300, height: 112 },
    chrome: {},
    viewport: { x: 0, y: 0, scale: 1 },
    onDemote: () => {},
  } as unknown as PromoteSlotProps;
}

describe('ShpsStaffCard search-focus dim (§8.2)', () => {
  it('focus set: a non-found card dims to .38, the found card stays full', () => {
    const Card = makeShpsStaffCard(() => ({ foundId: 'ceo' }));
    const other = renderToStaticMarkup(Card(slot('cfo')));
    const found = renderToStaticMarkup(Card(slot('ceo')));
    expect(other).toContain('opacity:0.38');
    expect(found).toContain('opacity:1');
    expect(found).not.toContain('opacity:0.38');
  });

  it('no focus (foundId null, or plain card): opacity stays full, never .38', () => {
    const CardNull = makeShpsStaffCard(() => ({ foundId: null }));
    expect(renderToStaticMarkup(CardNull(slot('cfo')))).not.toContain('opacity:0.38');
    // The plain exported card (staff-shps) has no focus thunk at all.
    expect(renderToStaticMarkup(ShpsStaffCard(slot('cfo')))).not.toContain('opacity:0.38');
  });
});
