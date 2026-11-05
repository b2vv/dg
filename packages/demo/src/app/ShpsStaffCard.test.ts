import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { relatedStaffIds, type InteractionState, type NodeRef } from '@org-hierarchy/sdk';
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

/** A head with 3 direct reports — the only kind of card that renders the `.tg` chip. */
function headSlot(posId: string): PromoteSlotProps {
  const p = slot(posId);
  (p.node.position as unknown as Record<string, unknown>).childrenCount = 3;
  (p.node.position as unknown as Record<string, unknown>).allDescendantCount = 7;
  return p;
}

describe('ShpsStaffCard collapse chevron (§8.1, v3 `.card.closed .tg`)', () => {
  it('collapsed: filled chip, white text, chevron rotated -90°, direct-report count shown', () => {
    const Card = makeShpsStaffCard(() => ({ foundId: null, expandedPositionIds: [] }));
    const html = renderToStaticMarkup(Card(headSlot('ceo')));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('title="Розгорнути підлеглі посади"');
    expect(html).toContain('background:#e5491d');
    expect(html).toContain('color:#fff');
    expect(html).toContain('rotate(-90deg)');
    expect(html).toMatch(/<b[^>]*>3<\/b>/);
  });

  it('an explicit position expanded flag keeps the chevron open without a set entry', () => {
    const Card = makeShpsStaffCard(() => ({ foundId: null, expandedPositionIds: [] }));
    const props = headSlot('ceo');
    props.node.position!.expanded = true;
    expect(renderToStaticMarkup(Card(props))).toContain('aria-expanded="true"');
  });

  it('expanded: tinted chip, chevron unrotated, no count', () => {
    const Card = makeShpsStaffCard(() => ({ foundId: null, expandedPositionIds: ['ceo'] }));
    const html = renderToStaticMarkup(Card(headSlot('ceo')));
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('title="Згорнути підлеглі посади"');
    expect(html).toContain('rgba(229,73,29,.14)');
    expect(html).not.toContain('rotate(-90deg)');
    expect(html).not.toMatch(/<b[^>]*>3<\/b>/);
    // The v3 SVG chevron, not a text glyph.
    expect(html).toContain('M4 6l4 4 4-4');
    expect(html).not.toContain('⌄');
  });
});


describe('store-driven staff hover', () => {
  it('writes position refs on enter/leave and derives related opacity from subscription', async () => {
    const listeners = new Set<(state: InteractionState) => void>();
    const calls: (NodeRef | null)[] = [];
    const lines = [
      { fromId: 'ceo', toId: 'cfo', points: [], endsOnDeptTop: false },
      { fromId: 'cfo', toId: 'acc', points: [], endsOnDeptTop: false },
    ];
    const diagram = {
      setHovered(ref: NodeRef | null) { calls.push(ref); },
      subscribeInteraction(cb: (state: InteractionState) => void) {
        listeners.add(cb);
        return () => { listeners.delete(cb); };
      },
      getStaffChromeGeometry: () => ({ org: null, depts: [], lines, nodeBoxes: {
        ceo: { x: 0, y: 0, width: 1, height: 1 }, cfo: { x: 0, y: 0, width: 1, height: 1 },
        acc: { x: 0, y: 0, width: 1, height: 1 }, other: { x: 0, y: 0, width: 1, height: 1 },
      } }),
    };
    const Card = makeShpsStaffCard(() => ({ foundId: 'ceo' }), diagram);
    const mount = document.createElement('div');
    document.body.append(mount);
    const root = createRoot(mount);
    const emit = async (hovered: NodeRef | null) => {
      await act(async () => { for (const cb of listeners) cb({ hovered, selected: [], primary: null }); });
    };
    try {
      await act(async () => root.render(createElement('div', {}, ...['ceo', 'cfo', 'acc', 'other'].map(id => {
        const props = slot(id);
        // Filled seats may expose a person ref; connectors still use the seat id.
        if (id === 'cfo') props.node.ref = { kind: 'person', id: 'person-cfo' };
        return createElement(Card, { ...props, key: id });
      }))));
      const card = (id: string) => mount.querySelector<HTMLElement>(`[data-staff-pos="${id}"]`)!;
      card('cfo').dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
      expect(calls).toEqual([{ kind: 'position', id: 'cfo' }]);
      // Input alone cannot paint: only the subscription changes the view.
      expect(card('acc').style.opacity).toBe('0.38');
      await emit({ kind: 'position', id: 'cfo' });
      for (const id of relatedStaffIds(lines, 'cfo')) expect(card(id).style.opacity).toBe('1');
      expect(card('other').style.opacity).toBe('0.45');
      card('cfo').dispatchEvent(new MouseEvent('pointerout', { bubbles: true }));
      expect(calls.at(-1)).toBeNull();
      await emit(null);
      expect(card('ceo').style.opacity).toBe('1');
      expect(card('acc').style.opacity).toBe('0.38');
      await emit({ kind: 'position', id: 'cfo' });
      await emit({ kind: 'position', id: 'missing' });
      expect(card('acc').style.opacity).toBe('0.38');
      await emit({ kind: 'organization', id: 'cfo' });
      expect(card('acc').style.opacity).toBe('0.38');
      expect(listeners.size).toBe(4);
    } finally {
      await act(async () => root.unmount());
      mount.remove();
    }
    expect(listeners.size).toBe(0);
  });
});
