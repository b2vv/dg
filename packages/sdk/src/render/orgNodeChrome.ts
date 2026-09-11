import { Container, Graphics, Text } from 'pixi.js';
import {
  CHROME_BTN_SIZE,
  attachIconButton,
  attachMenuButton,
  wireChromeButton,
  type ContextMenuPointer,
} from './nodeCardChrome.js';

export interface OrgTreeChrome {
  kind: 'tree';
  collapsed: boolean;
  hasChildren: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

export interface OrgStaffExpandChrome {
  kind: 'staff-expand';
  expanded: boolean;
  /**
   * Чи є під карткою штат, який chevron міг би розкрити.
   *
   * Дзеркалить `hasChildren` у деревному варіанті, і з тієї ж причини: кнопка
   * розгортання є тоді й лише тоді, коли є що розгортати. У дереві це
   * виконувалось точно — при `hasChildren: false` chrome не створюється взагалі.
   * Тут же chevron монтувався **безумовно**, тож організація без жодної посади
   * показувала кнопку, яка розкриває порожнечу.
   */
  hasStaff: boolean;
  onToggle: () => void;
}

export type OrgNodeChrome = OrgTreeChrome | OrgStaffExpandChrome;

/** Прямокутник у координатах **картки** — не сцени й не екрана. */
export interface ChromeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OrgNodeChromeMount {
  menuButton?: Container;
  expandButton?: Container;
  /**
   * Бокс кнопки розгортання, у координатах картки (T115 крок 2).
   *
   * Віддає його **той, хто кнопку щойно поставив**, бо лише тут відома справжня
   * геометрія: icon-варіант і gojs-варіант різняться і розміром, і кутом.
   * Виводити її ззовні з `hitArea` не можна — gojs кладе туди `contains`-функцію.
   */
  expanderBox?: ChromeBox;
}

const EXPANDER_D = 26;

/** GoJS tree: brand circle bottom-right, no ⋮ (RMB menu only). */
export function mountGojsTreeChrome(
  host: Container,
  cardWidth: number,
  cardHeight: number,
  chrome: OrgTreeChrome,
  brandColor: number,
): Container | undefined {
  if (!chrome.hasChildren) return undefined;

  const cx = cardWidth - 13;
  const cy = cardHeight - 13;
  const btn = new Container();
  btn.x = cx - EXPANDER_D / 2;
  btn.y = cy - EXPANDER_D / 2;

  const circle = new Graphics();
  circle.circle(EXPANDER_D / 2, EXPANDER_D / 2, EXPANDER_D / 2);
  circle.fill({ color: brandColor });
  btn.addChild(circle);

  const glyph = new Text({
    text: chrome.collapsed ? '+' : '−',
    style: { fill: 0xffffff, fontSize: 14, fontWeight: '700' },
  });
  glyph.anchor.set(0.5);
  glyph.position.set(EXPANDER_D / 2, EXPANDER_D / 2);
  glyph.eventMode = 'none';
  btn.addChild(glyph);

  // Через спільний `wireChromeButton`, а не вручну (правка після рев'ю T123).
  // Раніше ця кнопка була **єдиною**, що вішала слухачі сама — і тому єдиною
  // поза інваріантом «chrome ковтає власний `pointerdown`», який після
  // видалення ручного фолбеку став несучим. Мутація «прибрати те ковтання» не
  // валила жодного тесту. Заразом зникає `contains`-функція без розмірів, через
  // яку `hitArea` тут неможливо було прочитати.
  wireChromeButton(btn, () => (chrome.collapsed ? chrome.onExpand() : chrome.onCollapse()), EXPANDER_D);

  host.addChild(btn);
  btn.label = 'org-expand';
  return btn;
}

/** Expand/collapse (tree) or staff chevron + ⋮ menu on org cards. */
export function mountOrgNodeChrome(
  host: Container,
  cardWidth: number,
  chrome: OrgNodeChrome,
  onContextMenu: (pointer: ContextMenuPointer) => void,
  options: { cardHeight?: number; brandColor?: number; gojsTree?: boolean } = {},
): OrgNodeChromeMount {
  if (options.gojsTree && chrome.kind === 'tree') {
    const cardHeight = options.cardHeight ?? 121;
    const expandButton = mountGojsTreeChrome(
      host,
      cardWidth,
      cardHeight,
      chrome,
      options.brandColor ?? 0x2563eb,
    );
    return {
      expandButton,
      // Беремо з кнопки, яку щойно поставили, а не перераховуємо ту саму
      // арифметику вдруге: два вирази, що **мусять** збігатись, розійдуться
      // тихо, і жоден тест цього не побачить.
      expanderBox: expandButton
        ? { x: expandButton.x, y: expandButton.y, width: EXPANDER_D, height: EXPANDER_D }
        : undefined,
    };
  }

  let x = cardWidth - 26;
  let expandButton: Container | undefined;
  let expanderBox: ChromeBox | undefined;
  /** Беремо з поставленої кнопки — не дублюємо ні координату, ні відступ `4`. */
  const boxOf = (btn: Container): ChromeBox => ({
    x: btn.x,
    y: btn.y,
    width: CHROME_BTN_SIZE,
    height: CHROME_BTN_SIZE,
  });

  if (chrome.kind === 'tree') {
    if (chrome.hasChildren && chrome.collapsed) {
      expandButton = attachIconButton(host, x, 4, '+', 'Expand', chrome.onExpand);
      expandButton.label = 'org-expand';
      expanderBox = boxOf(expandButton);
      x -= 28;
    } else if (chrome.hasChildren && !chrome.collapsed) {
      expandButton = attachIconButton(host, x, 4, '−', 'Collapse', chrome.onCollapse);
      expandButton.label = 'org-expand';
      expanderBox = boxOf(expandButton);
      x -= 28;
    }
  } else if (chrome.hasStaff) {
    expandButton = attachIconButton(
      host,
      x,
      4,
      chrome.expanded ? '▲' : '▼',
      chrome.expanded ? 'Collapse staff' : 'Expand staff',
      chrome.onToggle,
    );
    expandButton.label = 'org-expand';
    // ⚠️ `expanderBox` тут **свідомо не заповнюється**. Спершу заповнювався —
    // «арифметика спільна, хай їде», — і власний коментар зізнавався, що
    // споживача немає. Після рішення К2 (штатний якір не несе жодного з двох
    // полів) значення стало гарантовано мертвим: `DiagramRenderer` штатний бокс
    // до `rememberBox` не доносить. Порахуємо, коли з'явиться замовник.
    x -= 28;
  }

  const menuButton = attachMenuButton(host, cardWidth, 4, onContextMenu);
  menuButton.label = 'org-menu';
  menuButton.x = x;

  return { menuButton, expandButton, expanderBox };
}
