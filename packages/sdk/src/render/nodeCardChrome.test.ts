import { describe, expect, it, vi } from 'vitest';
import { Container, Rectangle, type FederatedPointerEvent } from 'pixi.js';
import { attachIconButton, attachMenuButton, hitChromePointer, pointerClientCoords } from './nodeCardChrome.js';

describe('nodeCardChrome', () => {
  it('success: menu button has hitArea and fires on pointertap', () => {
    const host = new Container();
    const onMenu = vi.fn();
    const btn = attachMenuButton(host, 200, 4, onMenu, 160);
    expect(btn.hitArea).toBeInstanceOf(Rectangle);
    expect((btn.hitArea as Rectangle).width).toBe(22);

    btn.emit('pointertap', { stopPropagation: () => {}, clientX: 12, clientY: 34 });
    expect(onMenu).toHaveBeenCalledWith({ clientX: 12, clientY: 34 });
  });

  it('success: expand icon button fires on pointertap', () => {
    const host = new Container();
    const onTap = vi.fn();
    const btn = attachIconButton(host, 10, 4, '+', 'Expand', onTap);
    expect(btn.hitArea).toBeInstanceOf(Rectangle);
    btn.emit('pointertap', { stopPropagation: () => {} });
    expect(onTap).toHaveBeenCalledOnce();
  });

  it('success: pointerClientCoords falls back to nativeEvent', () => {
    const coords = pointerClientCoords({
      clientX: Number.NaN,
      clientY: Number.NaN,
      nativeEvent: { clientX: 5, clientY: 6 } as PointerEvent,
    } as never);
    expect(coords).toEqual({ clientX: 5, clientY: 6 });
  });

  it('success: hitChromePointer detects button bounds', () => {
    const host = new Container();
    attachMenuButton(host, 200, 4, () => {}, 160);
    const e = {
      getLocalPosition: (target: Container) => target.toLocal({ x: 170, y: 15 }),
    } as FederatedPointerEvent;
    expect(hitChromePointer(host, e)).toBe(true);
    expect(hitChromePointer(host, { getLocalPosition: () => ({ x: 0, y: 0 }) } as FederatedPointerEvent)).toBe(false);
  });
});
