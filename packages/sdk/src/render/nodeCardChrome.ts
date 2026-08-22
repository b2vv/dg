import { Container, Graphics, Rectangle, Text, type FederatedPointerEvent } from 'pixi.js';

export interface ContextMenuPointer {
  clientX: number;
  clientY: number;
}

const BTN = 22;

export { BTN as CHROME_BTN_SIZE };

/** Screen coords for React menus — canvas may omit clientX until first layout frame. */
export function pointerClientCoords(e: FederatedPointerEvent): ContextMenuPointer {
  const native = (e as { nativeEvent?: PointerEvent }).nativeEvent;
  return {
    clientX: Number.isFinite(e.clientX) ? e.clientX : (native?.clientX ?? 0),
    clientY: Number.isFinite(e.clientY) ? e.clientY : (native?.clientY ?? 0),
  };
}

const chromeHandlers = new WeakMap<Container, (e: FederatedPointerEvent) => void>();

function wireChromeButton(btn: Container, onActivate: (e: FederatedPointerEvent) => void): void {
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.hitArea = new Rectangle(0, 0, BTN, BTN);
  chromeHandlers.set(btn, onActivate);
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

/** Manual hit-test for chrome controls (Pixi child targeting can miss small buttons). */
export function hitChromePointer(chromeControls: Container, e: FederatedPointerEvent): boolean {
  if (chromeControls.children.length === 0) return false;
  const local = e.getLocalPosition(chromeControls);
  for (const child of chromeControls.children) {
    const bx = child.x;
    const by = child.y;
    if (local.x >= bx && local.x <= bx + BTN && local.y >= by && local.y <= by + BTN) {
      return true;
    }
  }
  return false;
}

export function activateChromePointer(chromeControls: Container, e: FederatedPointerEvent): boolean {
  if (!hitChromePointer(chromeControls, e)) return false;
  const local = e.getLocalPosition(chromeControls);
  for (const child of chromeControls.children) {
    const bx = child.x;
    const by = child.y;
    if (local.x >= bx && local.x <= bx + BTN && local.y >= by && local.y <= by + BTN) {
      const handler = chromeHandlers.get(child);
      if (handler) {
        handler(e);
        return true;
      }
    }
  }
  return false;
}
