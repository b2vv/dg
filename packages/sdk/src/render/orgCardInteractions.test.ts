import { describe, expect, it, rstest } from '@rstest/core';
import { DoubleTapTracker } from '../interaction/doubleTap.js';
import { bindOrgCardInteractions } from './orgCardInteractions.js';
import type { OrganizationNodeView } from './OrganizationNode.js';

/** Minimal stand-in for the Pixi view: records listeners, answers chrome hits. */
function fakeCard(chrome: { activates?: boolean; isChrome?: boolean } = {}) {
  const listeners = new Map<string, (e: never) => void>();
  const view = {
    on(event: string, fn: (e: never) => void) {
      listeners.set(event, fn);
      return view;
    },
    activateChromePointer: () => chrome.activates === true,
    isChromePointer: () => chrome.isChrome === true,
  };
  const fire = (event: string, e: Record<string, unknown> = {}) => {
    listeners.get(event)?.({
      button: 0,
      pointerType: 'mouse',
      stopPropagation: () => {},
      preventDefault: () => {},
      global: { x: 0, y: 0 },
      ...e,
    } as never);
  };
  return { view: view as unknown as OrganizationNodeView, fire };
}

function handlers() {
  return {
    onOrgClick: rstest.fn(),
    onOrgDoubleClick: rstest.fn(),
    onOrgContextMenu: rstest.fn(),
  };
}

describe('bindOrgCardInteractions', () => {
  it('success: a plain tap runs the single-tap action, then the click handler', () => {
    const card = fakeCard();
    const h = handlers();
    const onSingleTap = rstest.fn();
    bindOrgCardInteractions(card.view, {
      orgId: 'o1',
      doubleTap: new DoubleTapTracker(),
      handlers: h,
      onSingleTap,
    });

    card.fire('pointertap');
    expect(onSingleTap).toHaveBeenCalledWith('o1');
    expect(h.onOrgClick).toHaveBeenCalledOnce();
    expect(h.onOrgDoubleClick).not.toHaveBeenCalled();
  });

  it('success: a modifier tap selects only — no expand, no double-tap state', () => {
    const card = fakeCard();
    const h = handlers();
    const onSingleTap = rstest.fn();
    bindOrgCardInteractions(card.view, {
      orgId: 'o1',
      doubleTap: new DoubleTapTracker(),
      handlers: h,
      onSingleTap,
    });

    card.fire('pointertap', { shiftKey: true });
    expect(onSingleTap).not.toHaveBeenCalled();
    expect(h.onOrgClick).toHaveBeenCalledOnce();
  });

  it('success: two quick taps report a double-click instead of the single action', () => {
    const card = fakeCard();
    const h = handlers();
    const onSingleTap = rstest.fn();
    const doubleTap = new DoubleTapTracker();
    bindOrgCardInteractions(card.view, { orgId: 'o1', doubleTap, handlers: h, onSingleTap });

    card.fire('pointertap');
    card.fire('pointertap');
    expect(h.onOrgDoubleClick).toHaveBeenCalledWith('o1');
    expect(onSingleTap).toHaveBeenCalledTimes(1);
  });

  it('failure: a tap consumed by card chrome fires nothing', () => {
    const card = fakeCard({ activates: true });
    const h = handlers();
    const onSingleTap = rstest.fn();
    bindOrgCardInteractions(card.view, {
      orgId: 'o1',
      doubleTap: new DoubleTapTracker(),
      handlers: h,
      onSingleTap,
    });

    card.fire('pointertap');
    expect(onSingleTap).not.toHaveBeenCalled();
    expect(h.onOrgClick).not.toHaveBeenCalled();
  });

  it('failure: a non-primary pointer is ignored; right-click reports the pointer', () => {
    const card = fakeCard();
    const h = handlers();
    bindOrgCardInteractions(card.view, {
      orgId: 'o1',
      doubleTap: new DoubleTapTracker(),
      handlers: h,
    });

    card.fire('pointertap', { button: 2 });
    expect(h.onOrgClick).not.toHaveBeenCalled();

    card.fire('rightclick', { clientX: 12, clientY: 34, global: { x: 5, y: 6 } });
    expect(h.onOrgContextMenu).toHaveBeenCalledWith('o1', {
      clientX: 12,
      clientY: 34,
      canvasX: 5,
      canvasY: 6,
    });
  });
});
