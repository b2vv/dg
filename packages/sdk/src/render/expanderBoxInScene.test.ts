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
const orgBox = (boxes: readonly { id: string }[], id: string) =>
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
    const root = orgBox(boxes, 'root') as (typeof boxes)[number] | undefined;

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
