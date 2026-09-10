import { afterEach, describe, expect, it, rstest } from '@rstest/core';
import { createTestAnchorOverlay, type TestAnchorOverlayDiagram } from './createTestAnchorOverlay.js';
import type { TestAnchorCandidate } from '../interaction/nodeTestId.js';

function makeDiagram(overrides: Partial<TestAnchorOverlayDiagram> = {}): TestAnchorOverlayDiagram {
  const anchor: TestAnchorCandidate = {
    testId: 'root',
    kind: 'organization',
    ref: { kind: 'organization', id: 'org-1', organizationId: 'org-1' },
    world: { x: 10, y: 20, width: 120, height: 64 },
  };

  return {
    getViewport: () => ({ x: 0, y: 0, scale: 1 }),
    listTestAnchors: () => [anchor],
    focusByTestId: rstest.fn(async () => true),
    toggleOrgExpand: rstest.fn(async () => true),
    openContextMenu: rstest.fn(),
    subscribePromoteSync: (listener) => {
      listener();
      return () => {
        void listener;
      };
    },
    ...overrides,
  };
}

describe('createTestAnchorOverlay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('success: renders data-testid anchors synced to viewport', () => {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);

    const diagram = makeDiagram();
    const overlay = createTestAnchorOverlay({ diagram, mount });

    const el = mount.querySelector('[data-testid="node-root"]');
    expect(el).toBeTruthy();
    expect(el?.getAttribute('data-node-kind')).toBe('organization');

    overlay.dispose();
    expect(mount.querySelector('[data-org-hierarchy-test-anchors]')).toBeNull();
  });

  it('success: interactive click calls focusByTestId', async () => {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);

    const diagram = makeDiagram();
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    const btn = mount.querySelector('[data-testid="node-root"]') as HTMLButtonElement;
    btn.click();
    expect(diagram.focusByTestId).toHaveBeenCalledWith('root');
  });

  it('success: interactive contextmenu opens menu for ref', () => {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);

    const diagram = makeDiagram();
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    const btn = mount.querySelector('[data-testid="node-root"]') as HTMLButtonElement;
    btn.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 12, clientY: 34 }));
    expect(diagram.openContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'org-1' }),
      expect.objectContaining({ clientX: 12, clientY: 34 }),
    );
  });
});

/**
 * T115 крок 2, К5 — другий якір, і **окрема** гілка кліку.
 *
 * Обробник кліку в оверлеї був один на всі якорі й кликав `focusByTestId`,
 * тобто **виділяв** вузол. Якір експандера мусить розгортати й **не** виділяти:
 * інакше e2e не може відрізнити «клікнув chevron» від «клікнув картку», а
 * рівно ця різниця й була причиною циклу.
 */
function mountEl(): HTMLElement {
  const mount = document.createElement('div');
  Object.defineProperty(mount, 'clientWidth', { value: 800 });
  Object.defineProperty(mount, 'clientHeight', { value: 600 });
  document.body.appendChild(mount);
  return mount;
}

const withExpander = (extra: Partial<TestAnchorCandidate> = {}): TestAnchorCandidate => ({
  testId: 'root',
  kind: 'organization',
  ref: { kind: 'organization', id: 'org-1', organizationId: 'org-1' },
  world: { x: 10, y: 20, width: 120, height: 64 },
  hasChildren: true,
  expander: { x: 104, y: 24, width: 22, height: 22 },
  ...extra,
});

describe('createTestAnchorOverlay expander anchor (T115 K5)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('success: a node carrying a box gets a second anchor beside the first', () => {
    const mount = mountEl();
    const diagram = makeDiagram({ listTestAnchors: () => [withExpander()] });
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    const el = mount.querySelector('[data-testid="node-root-expander"]') as HTMLElement | null;
    expect(el).toBeTruthy();
    // Геометрія — власна, не картки: інакше якір накрив би її всю й будь-який
    // клік по вузлу читався б як клік по chevron.
    expect(el!.style.left).toBe('104px');
    expect(el!.style.width).toBe('22px');
  });

  it('success: the expander anchor is appended AFTER its node anchor', () => {
    const mount = mountEl();
    const diagram = makeDiagram({ listTestAnchors: () => [withExpander()] });
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    const ids = [...mount.querySelectorAll('[data-testid]')].map((e) =>
      e.getAttribute('data-testid'),
    );
    // 🔑 Порядок — не косметика. Обидва якорі абсолютні й без `z-index`, тож
    // виграє **пізніший** брат. Якби expander ішов першим, картка накрила б
    // його, і клік по chevron дійшов би до вузла — рівно той дефект, заради
    // якого крок існує, але вже в DOM.
    expect(ids).toEqual(['node-root', 'node-root-expander']);
  });

  it('failure: a leaf gets no expander anchor, because there is no box', () => {
    const mount = mountEl();
    const diagram = makeDiagram({
      listTestAnchors: () => [withExpander({ hasChildren: false, expander: undefined })],
    });
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    expect(mount.querySelector('[data-testid="node-root-expander"]')).toBeNull();
    expect(mount.querySelector('[data-testid="node-root"]')).toBeTruthy();
  });

  it('success: clicking the expander toggles and does NOT select', () => {
    const mount = mountEl();
    const diagram = makeDiagram({ listTestAnchors: () => [withExpander()] });
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    const btn = mount.querySelector('[data-testid="node-root-expander"]') as HTMLButtonElement;
    btn.click();

    expect(diagram.toggleOrgExpand).toHaveBeenCalledWith('org-1');
    // 🔴 Друга половина — і саме вона робить тест вартим написання. Гілка, що
    // кличе тогл **і** фокус, задовольнила б перший асерт цілком.
    expect(diagram.focusByTestId).not.toHaveBeenCalled();
  });

  it('success: clicking the node anchor still selects — the contrast to the line above', () => {
    const mount = mountEl();
    const diagram = makeDiagram({ listTestAnchors: () => [withExpander()] });
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    (mount.querySelector('[data-testid="node-root"]') as HTMLButtonElement).click();

    expect(diagram.focusByTestId).toHaveBeenCalledWith('root');
    expect(diagram.toggleOrgExpand).not.toHaveBeenCalled();
  });

  it('failure: a refused toggle is caught — witnessed by the warning, not by the event', async () => {
    const mount = mountEl();
    const diagram = makeDiagram({
      listTestAnchors: () => [withExpander()],
      toggleOrgExpand: rstest.fn(async () => {
        throw new Error('layout exploded');
      }),
    });
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    // ⚠️ Перша редакція слухала `unhandledrejection` на `window` — і мутація
    // «зняти `.catch`» лишала її зеленою: у цьому середовищі подія не приходить
    // узагалі, тож тест перевіряв порожнечу. Свідком лишається єдиний
    // спостережуваний слід самого `catch` — попередження.
    const warn = rstest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      (mount.querySelector('[data-testid="node-root-expander"]') as HTMLButtonElement).click();
      await new Promise((r) => {
        setTimeout(r, 0);
      });

      // `toggleOrgExpand` успадкував нетранзакційний шлях `expandOrg` (T115
      // план Г4′): відмова рендера **кидає**, а клік нічого не чекає. Без
      // `.catch` це стало б необробленим reject у сторінці хоста.
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain('expander anchor toggle failed');
    } finally {
      warn.mockRestore();
    }
  });

  it('failure: right-click on the expander opens the diagram menu, not the browser one', () => {
    // 🔴 Регресія, яку вніс сам К5 і знайшло рев'ю другої сесії. До нього ця
    // ділянка екрана належала якорю **вузла**, а слухач `contextmenu` висить
    // саме на ньому: `preventDefault()` плюс `openContextMenu`. Chevron ліг
    // зверху з `pointer-events: auto` і **без** такого слухача — тобто меню
    // діаграми не відкривалось, `preventDefault` ніхто не кликав, і користувач
    // діставав **браузерне** меню поверх канви.
    //
    // Мовчазно воно тому, що всі наші проби клікають у центр картки.
    const mount = mountEl();
    const diagram = makeDiagram({ listTestAnchors: () => [withExpander()] });
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    const chevron = mount.querySelector('[data-testid="node-root-expander"]') as HTMLElement;
    const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 7, clientY: 9 });
    chevron.dispatchEvent(e);

    expect(diagram.openContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'org-1' }),
      expect.objectContaining({ clientX: 7, clientY: 9 }),
    );
    expect(e.defaultPrevented).toBe(true);
  });

  it('failure: with interactive off the expander anchor takes no clicks at all', () => {
    const mount = mountEl();
    const diagram = makeDiagram({ listTestAnchors: () => [withExpander()] });
    createTestAnchorOverlay({ diagram, mount });

    const chevron = mount.querySelector('[data-testid="node-root-expander"]') as HTMLElement;
    expect(chevron).toBeTruthy();
    expect(chevron.style.pointerEvents).toBe('none');
    (chevron as HTMLButtonElement).click();
    expect(diagram.toggleOrgExpand).not.toHaveBeenCalled();
  });

  it('success: the expander anchor does not duplicate the node id attributes', () => {
    const mount = mountEl();
    const diagram = makeDiagram({ listTestAnchors: () => [withExpander()] });
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    // Хост із селектором `[data-node-id="org-1"]` інакше дістав би **два**
    // елементи, а Playwright у strict-режимі на цьому кидає. Вузол якір
    // ідентифікує сам — через `data-testid`.
    expect(mount.querySelectorAll('[data-node-id="org-1"]')).toHaveLength(1);
  });

  it('success: at zoom != 1 the chevron rect goes through the camera, like the card', () => {
    // 🔑 §8 сценарій 14, і спека назвала його вирішальним словами «при
    // `scale === 1` **хибний підхід теж зелений**». До рев'ю циклу єдиний
    // вьюпорт у цьому файлі був `{ x: 0, y: 0, scale: 1 }` — тобто критерій,
    // заради якого рядок писався, не перевіряв нічого.
    const mount = mountEl();
    const diagram = makeDiagram({
      listTestAnchors: () => [withExpander()],
      getViewport: () => ({ x: 30, y: -10, scale: 2 }),
    });
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    const chevron = mount.querySelector('[data-testid="node-root-expander"]') as HTMLElement;
    // world (104, 24, 22, 22) · scale 2 + (30, -10) → (238, 38, 44, 44)
    expect(chevron.style.left).toBe('238px');
    expect(chevron.style.top).toBe('38px');
    expect(chevron.style.width).toBe('44px');

    // Контраст у тому ж кадрі: картка проходить ту саму камеру, тож помилка
    // «взяти world як екранні» була б видна на обох, а не лише на кнопці.
    const card = mount.querySelector('[data-testid="node-root"]') as HTMLElement;
    expect(card.style.left).toBe('50px');
    expect(card.style.width).toBe('240px');
  });

  it('failure: an element handle taken before a sync is detached after it', () => {
    const mount = mountEl();
    const diagram = makeDiagram({ listTestAnchors: () => [withExpander()] });
    const overlay = createTestAnchorOverlay({ diagram, mount, interactive: true });

    const before = mount.querySelector('[data-testid="node-root-expander"]') as HTMLElement;
    overlay.sync();
    const after = mount.querySelector('[data-testid="node-root-expander"]') as HTMLElement;

    // ⚠️ Межу **називаємо, а не лікуємо**: `sync` робить `replaceChildren()`, тож
    // кожен рух камери вибудовує шар наново. Playwright, який тримає handle між
    // rebuild'ами, отримає detached-вузол — це вже кусало `flat-orgs.spec.ts`.
    // Ліки — брати локатор заново перед кліком, і §14 скаже це прямо.
    expect(before.isConnected).toBe(false);
    expect(after).toBeTruthy();
    expect(after).not.toBe(before);
  });
});
