import { Container, Graphics, Rectangle, Text, type FederatedPointerEvent } from 'pixi.js';

export interface ContextMenuPointer {
  clientX: number;
  clientY: number;
}

const BTN = 22;

/**
 * Сторона квадратної chrome-кнопки (icon-варіант), px.
 *
 * ⚠️ Розмір кнопки **не можна** виводити з `hitArea`: gojs-варіант експандера
 * кладе туди `contains`-функцію без `width`/`height`, тобто 26×26 звідти не
 * прочитати (`orgNodeChrome.ts`, `EXPANDER_D`). Тому бокс кнопки для тест-якоря
 * (T115 крок 2) віддає **той, хто її будує**, а не той, хто її міряє.
 */
export { BTN as CHROME_BTN_SIZE };

/** Screen coords for React menus — canvas may omit clientX until first layout frame. */
export function pointerClientCoords(e: FederatedPointerEvent): ContextMenuPointer {
  const native = (e as { nativeEvent?: PointerEvent }).nativeEvent;
  return {
    clientX: Number.isFinite(e.clientX) ? e.clientX : (native?.clientX ?? 0),
    clientY: Number.isFinite(e.clientY) ? e.clientY : (native?.clientY ?? 0),
  };
}

function wireChromeButton(btn: Container, onActivate: (e: FederatedPointerEvent) => void): void {
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.hitArea = new Rectangle(0, 0, BTN, BTN);
  btn.on('pointerdown', (e) => e.stopPropagation());
  btn.on('pointertap', (e) => {
    e.stopPropagation();
    onActivate(e);
  });
}

/** ⋮ menu affordance — works on touch (right-click alone does not). */
export function attachMenuButton(
  host: Container,
  cardWidth: number,
  y = 4,
  onMenu: (pointer: ContextMenuPointer) => void,
  x?: number,
): Container {
  const btn = new Container();
  btn.x = x ?? cardWidth - BTN - 4;
  btn.y = y;

  const bg = new Graphics();
  bg.roundRect(0, 0, BTN, BTN, 6);
  bg.fill({ color: 0xffffff, alpha: 0.92 });
  bg.stroke({ color: 0x94a3b8, width: 1 });
  const label = new Text({
    text: '⋮',
    style: { fill: 0x334155, fontSize: 14, fontWeight: '700' },
  });
  label.anchor.set(0.5);
  label.position.set(BTN / 2, BTN / 2 + 1);
  btn.addChild(bg, label);

  wireChromeButton(btn, (e) => onMenu(pointerClientCoords(e)));

  host.addChild(btn);
  return btn;
}

export function attachIconButton(
  host: Container,
  x: number,
  y: number,
  symbol: string,
  title: string,
  onTap: () => void,
): Container {
  const btn = new Container();
  btn.x = x;
  btn.y = y;

  const bg = new Graphics();
  bg.roundRect(0, 0, BTN, BTN, 6);
  bg.fill({ color: 0xffffff, alpha: 0.92 });
  bg.stroke({ color: 0x94a3b8, width: 1 });
  const label = new Text({
    text: symbol,
    style: { fill: 0x1e40af, fontSize: 13, fontWeight: '700' },
  });
  label.anchor.set(0.5);
  label.position.set(BTN / 2, BTN / 2);
  btn.addChild(bg, label);

  wireChromeButton(btn, () => onTap());

  host.addChild(btn);
  return btn;
}
