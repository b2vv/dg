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
