import { describe, expect, it, rstest } from '@rstest/core';
import { Container, Rectangle, type FederatedPointerEvent } from 'pixi.js';
import { attachIconButton, attachMenuButton, pointerClientCoords } from './nodeCardChrome.js';
import { mountGojsTreeChrome } from './orgNodeChrome.js';

describe('nodeCardChrome', () => {
  it('success: menu button has hitArea and fires on pointertap', () => {
    const host = new Container();
    const onMenu = rstest.fn();
    const btn = attachMenuButton(host, 200, 4, onMenu, 160);
    expect(btn.hitArea).toBeInstanceOf(Rectangle);
    expect((btn.hitArea as Rectangle).width).toBe(22);

    btn.emit('pointertap', {
      stopPropagation: () => {},
      clientX: 12,
      clientY: 34,
    } as unknown as FederatedPointerEvent);
    expect(onMenu).toHaveBeenCalledWith({ clientX: 12, clientY: 34 });
  });

  it('success: expand icon button fires on pointertap', () => {
    const host = new Container();
    const onTap = rstest.fn();
    const btn = attachIconButton(host, 10, 4, '+', 'Expand', onTap);
    expect(btn.hitArea).toBeInstanceOf(Rectangle);
    btn.emit('pointertap', { stopPropagation: () => {} } as unknown as FederatedPointerEvent);
    expect(onTap).toHaveBeenCalledOnce();
  });

  it('success: a wired button swallows pointerdown AND pointertap', () => {
    // Обидва `stopPropagation` — запобіжник, і це виміряно, а не припущено:
    // у браузері зняття того, що на `pointertap`, **нічого не змінює** (клік і
    // так належить кнопці, бо вона ціль Pixi; валить тест лише
    // `eventMode: 'none'` — див. `e2e/chrome-hit.spec.ts`).
    //
    // Тест лишається тому, що пінить **намір**: після зняття ручного фолбеку
    // (T123) це єдине місце, де код каже «подія кнопки далі не йде». Той, хто
    // прибере ці рядки як зайві, має спершу побачити це червоне.
    const host = new Container();
    const onTap = rstest.fn();
    const btn = attachIconButton(host, 0, 0, '+', 'Expand', onTap);

    const down = rstest.fn();
    btn.emit('pointerdown', { stopPropagation: down } as unknown as FederatedPointerEvent);
    expect(down).toHaveBeenCalledTimes(1);

    const tap = rstest.fn();
    btn.emit('pointertap', { stopPropagation: tap } as unknown as FederatedPointerEvent);
    expect(tap).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('success: the gojs expander is wired the same way, at its own 26px', () => {
    // Правка після рев'ю T123: ця кнопка була **єдиною**, що вішала слухачі
    // сама, тобто єдиною поза інваріантом «chrome ковтає власний
    // `pointerdown`». Після видалення ручного фолбеку інваріант став несучим —
    // а мутація «прибрати ковтання в gojs» не валила жодного тесту.
    const host = new Container();
    const onExpand = rstest.fn();
    const btn = mountGojsTreeChrome(
      host,
      220,
      121,
      { kind: 'tree', collapsed: true, hasChildren: true, onExpand, onCollapse: () => {} },
      0x2563eb,
    );
    expect(btn).toBeTruthy();

    // 🔑 Розмір **читається**: раніше тут лежала `contains`-функція без
    // `width`/`height`, і саме через неї T123 два дні мав недійсний вимір.
    expect(btn!.hitArea).toBeInstanceOf(Rectangle);
    expect((btn!.hitArea as Rectangle).width).toBe(26);

    const down = rstest.fn();
    btn!.emit('pointerdown', { stopPropagation: down } as unknown as FederatedPointerEvent);
    expect(down).toHaveBeenCalledTimes(1);

    const tap = rstest.fn();
    btn!.emit('pointertap', { stopPropagation: tap } as unknown as FederatedPointerEvent);
    expect(tap).toHaveBeenCalledTimes(1);
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('success: pointerClientCoords falls back to nativeEvent', () => {
    const coords = pointerClientCoords({
      clientX: Number.NaN,
      clientY: Number.NaN,
      nativeEvent: { clientX: 5, clientY: 6 } as PointerEvent,
    } as never);
    expect(coords).toEqual({ clientX: 5, clientY: 6 });
  });
});
