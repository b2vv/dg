import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import type { DiagramData } from '../data/types.js';
import type { PixiHost } from './PixiHost.js';

/**
 * T115 крок 2, К2 — бокс кнопки доїжджає до сцени **у світових координатах**,
 * і поруч із ним їде ознака моделі.
 *
 * К1 довів, що бокс досяжний у координатах **картки**. Цей крок доводить решту
 * шляху: `card.x + local.x`, а не `getBounds()`, який дав би координати після
 * камери й був би правильний рівно на зумі 1.
 */
function orgTreeData(): DiagramData {
  return {
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: false },
      { id: 'leaf', name: 'Leaf', groupIds: [], parentOrgId: 'root', collapsed: true },
    ],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
  };
}

type DiagramInternals = { host: PixiHost | null };

/** Дерево плюс одна заповнена посада — щоб у сцені були якорі не-організацій. */
function staffishData(): DiagramData {
  const base = orgTreeData();
  return {
    ...base,
    persons: [{ id: 'p-1', fullName: 'Ada Lovelace' }],
    positions: [
      {
        id: 'pos-1',
        title: 'Chief',
        organizationId: 'root',
        groupIds: [],
        personId: 'p-1',
        status: 'filled',
        isTemporary: false,
        isHead: true,
      },
    ],
  };
}

/**
 * ⚠️ `rememberBox` кладе бокси під **типізованим** ключем (`organization:root`),
 * а не під голим id — тому пошук іде по ньому. Перша редакція цього файлу
 * шукала `root` і падала так, наче фічі немає, хоча вона працювала.
 */
const orgBox = <T extends { id: string }>(boxes: readonly T[], id: string): T | undefined =>
  boxes.find((b) => b.id === `organization:${id}`);

function rendererOf(diagram: OrgHierarchyDiagram) {
  const host = (diagram as unknown as DiagramInternals).host;
  if (!host) throw new Error('expected host');
  return host.renderer;
}

async function mount(): Promise<OrgHierarchyDiagram> {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  return OrgHierarchyDiagram.create(container, { data: orgTreeData(), useWorker: false });
}

describe('expander box reaches the scene (T115 K2)', () => {
  it('success: a parent card carries the expander box in world coordinates', async () => {
    const diagram = await mount();
    const boxes = rendererOf(diagram).listNodeBoxes();
    const root = orgBox(boxes, 'root');

    expect(root).toBeTruthy();
    expect(root!.expander).toBeTruthy();

    // 🔴 **Рівності, не «всередині картки».** Перша редакція перевіряла
    // входження в бокс картки — і мутація «зняти зсув `cardX +`» лишала тест
    // зеленим, бо локальна координата теж потрапляє в цей діапазон. Тобто
    // перевірка не бачила саме того, заради чого крок існує.
    //
    // Позиція кнопки задана відносно **правого** краю картки, тож саме цю
    // прив'язку й пінимо; вона хибна для локальних координат за побудовою.
    const e = root!.expander!;
    expect(e.x + e.width).toBe(root!.x + root!.width - 4);
    expect(e.y).toBe(root!.y + 4);

    diagram.destroy();
  });

  it('success: the model flag travels beside the box', async () => {
    const diagram = await mount();
    const boxes = rendererOf(diagram).listNodeBoxes();

    expect(orgBox(boxes, 'root')?.hasChildren).toBe(true);
    expect(orgBox(boxes, 'leaf')?.hasChildren).toBe(false);

    diagram.destroy();
  });

  it('failure: orgTreeChrome false takes the box away at every zoom', async () => {
    // §8 сценарій 5, і до рев'ю циклу він не був покритий **нічим** — при тому
    // що §14 називає цей стан рядком 2 своєї таблиці, тобто контрактом. Опція
    // публічна й стала на весь час життя діаграми: кнопки не буде ніколи, тож
    // порада «підведіть камеру» для неї хибна назавжди.
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: orgTreeData(),
      orgTreeChrome: false,
      useWorker: false,
    });

    const root = orgBox(rendererOf(diagram).listNodeBoxes(), 'root');
    expect(root).toBeTruthy();
    expect(root!.expander).toBeUndefined();
    // 🔑 Пара, а не одне поле: ознака моделі мусить лишитись **чесною**, інакше
    // хост прочитає «це лист» замість «кнопку вимкнено конфігом».
    expect(root!.hasChildren).toBe(true);

    diagram.destroy();
  });

  it('failure: a leaf carries no box, because there is no button to describe', async () => {
    const diagram = await mount();
    const boxes = rendererOf(diagram).listNodeBoxes();

    expect(orgBox(boxes, 'leaf')?.expander).toBeUndefined();

    diagram.destroy();
  });
});

/**
 * T115 крок 2, К3 — публічна поверхня: два поля в `TestAnchorCandidate`.
 *
 * Тут перевіряється те, що побачить **хост**, а не те, що знає сцена.
 */
describe('listTestAnchors exposes the expander (T115 K3)', () => {
  const anchorOf = <T extends { testId: string }>(
    anchors: readonly T[],
    testId: string,
  ): T | undefined => anchors.find((a) => a.testId === testId);

  it('success: a parent anchor carries the box and the model flag', async () => {
    const diagram = await mount();
    const anchors = diagram.listTestAnchors();
    const root = anchorOf(anchors, 'root');

    expect(root).toBeTruthy();
    expect(root!.hasChildren).toBe(true);
    expect(root!.expander).toBeTruthy();
    // Той самий світовий простір, що й `world` картки — не екранний.
    expect(root!.expander!.x + root!.expander!.width).toBe(
      root!.world.x + root!.world.width - 4,
    );

    diagram.destroy();
  });

  it('failure: a leaf carries the flag but no box', async () => {
    const diagram = await mount();
    const leaf = anchorOf(diagram.listTestAnchors(), 'leaf');

    expect(leaf).toBeTruthy();
    // 🔑 Саме ця пара робить негативний тест хоста чесним: `false` — це
    // властивість вузла, а не наслідок того, що камера від'їхала.
    expect(leaf!.hasChildren).toBe(false);
    expect(leaf!.expander).toBeUndefined();

    diagram.destroy();
  });

  it('failure: a node promoted by its BARE id reports no box, like one promoted by key', async () => {
    // 🔴 Цей тест — від рев'ю другої сесії, і він ловить те, чого попередній не
    // ловив **за побудовою**. `setPromotedNodeIds` публічний, тож найкоротший
    // шлях хоста — передати голий `'root'`, тоді як реєстр кладе типізований
    // ключ. Точний збіг `promoted.has(box.id)` тут мовчав: в'юха вже схована, а
    // якір усе ще показував на кнопку, якої на екрані немає. Тест із
    // типізованим ключем вибирає ту саму форму, що й реалізація, і тому
    // погоджується з нею замість перевіряти її.
    const diagram = await mount();
    expect(anchorOf(diagram.listTestAnchors(), 'root')!.expander).toBeTruthy();

    rendererOf(diagram).setPromotedNodeIds(['root']);

    expect(anchorOf(diagram.listTestAnchors(), 'root')!.expander).toBeUndefined();

    diagram.destroy();
  });

  it('failure: at far LOD the box goes and the model flag stays — read through listTestAnchors', async () => {
    // §8 сценарій 4. Він **був** доведений, але на `view.expanderBox()` — тобто
    // на рівні, який хост не бачить. План вимагав доводити його **через
    // `listTestAnchors()`**, і саме тут пара «`hasChildren: true` + бокса
    // немає» відрізняє модель від кадру. Без цього тесту публічна поверхня
    // цього стану не була запінена ніде.
    const diagram = await mount();
    expect(anchorOf(diagram.listTestAnchors(), 'root')!.expander).toBeTruthy();

    // Через **публічний** шлях: зум нижче `farMax` (0.45) переводить LOD, а
    // перехід сам ставить рендер у мікрозадачу (`onViewportTransform`).
    diagram.setZoom(0.2);
    await new Promise((r) => {
      setTimeout(r, 0);
    });
    expect(diagram.getLodLevel()).toBe('far');

    const root = anchorOf(diagram.listTestAnchors(), 'root');
    expect(root!.expander).toBeUndefined();
    expect(root!.hasChildren).toBe(true);

    diagram.destroy();
  });

  it('failure: person and position anchors carry no hasChildren at all', async () => {
    // §8 сценарій 7 / A15. Був закритий **лише типом** — тобто твердженням
    // компілятора про форму, а не про значення. `false` тут читалося б як
    // доведене «дітей немає», тоді як для персони питання відповіді не має.
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: staffishData(),
      staffCurrentOrgId: 'root',
      useWorker: false,
    });

    const anchors = diagram.listTestAnchors();
    const nonOrg = anchors.filter((a) => a.kind !== 'organization');
    expect(nonOrg.length).toBeGreaterThan(0);
    for (const a of nonOrg) {
      expect(a.hasChildren).toBeUndefined();
      expect(a.expander).toBeUndefined();
    }

    diagram.destroy();
  });

  it('success: after a second render the box follows the card, with nothing stale left over', async () => {
    // §8 сценарій 13. Реєстр чиститься на **вході** кадру, тож застаріле
    // посилання пройшло б повз усі інші критерії: воно виглядає як бокс, лежить
    // у боксі й має правильний розмір — просто вказує на попередній кадр.
    // ⚠️ Чесно про силу цього тесту: він пінить **інваріант на другому кадрі**
    // (мутація «зняти зсув на позицію картки» валить його разом із двома
    // іншими), але саме *застарілість* спровокувати мутацією не вдалось —
    // в'юхи створюються наново на кожен кадр, тож «заморозити перший бокс»
    // (`??=`) поведінки не змінює. Тобто тест сторожить контракт, а не
    // нинішній механізм; якщо в'юхи почнуть переживати кадр, він стане
    // єдиним, хто це помітить.
    const diagram = await mount();
    const before = anchorOf(diagram.listTestAnchors(), 'root')!;

    // Другий кадр із іншою геометрією: розгортання зсуває корінь.
    await diagram.toggleOrgExpand('root');

    const after = anchorOf(diagram.listTestAnchors(), 'root')!;
    expect(after.expander).toBeTruthy();
    // Інваріант той самий, що й у К2, але вже на **другому** кадрі: кнопка
    // прив'язана до правого краю **нової** картки, а не старої.
    expect(after.expander!.x + after.expander!.width).toBe(
      after.world.x + after.world.width - 4,
    );
    // І кадр справді інший — інакше тест був би зелений і на застарілому боксі.
    expect(after.world).not.toEqual(before.world);

    diagram.destroy();
  });

  it('failure: a promoted node reports no box, because its button is not on screen', async () => {
    const diagram = await mount();
    const before = anchorOf(diagram.listTestAnchors(), 'root');
    expect(before!.expander).toBeTruthy();

    // Promote ховає Pixi-в'юху, лишаючи бокси в сцені; шар якорів стоїть **над**
    // шаром promote, тож якір указував би на чужий HTML-компонент.
    rendererOf(diagram).setPromotedNodeIds(['organization:root']);

    const after = anchorOf(diagram.listTestAnchors(), 'root');
    expect(after!.expander).toBeUndefined();
    // Ознака моделі від promote не залежить — вона про вузол, не про кадр.
    expect(after!.hasChildren).toBe(true);

    diagram.destroy();
  });
});
