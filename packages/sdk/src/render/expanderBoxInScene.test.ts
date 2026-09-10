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
