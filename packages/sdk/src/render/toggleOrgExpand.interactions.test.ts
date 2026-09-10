import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import type { DiagramData, DiagramOrganization } from '../data/types.js';

/**
 * T115 крок 2, К4 — `toggleOrgExpand` на фасаді.
 *
 * Метод існує не заради оверлея: у штату тогл був (`toggleStaffOrgExpand`), у
 * дерева — ні, тож хост мусив сам знати, у якому стані вузол, щоб обрати між
 * `expandOrg` і `collapseOrg`. К5 буде першим його користувачем, але контракт
 * закривається **тут**, окремим кроком: це єдина ламальна назад частина циклу.
 *
 * Контракт (сценарій 18): невідомий id → `false` **без кидка**; лист → `false`.
 * Обидва — беззвучні no-op, і мовчання тут не косметичне: у гілці розгортання
 * `expandOrg` кличе `panToNode`, тож «нічого не сталося», яке все ж малює кадр,
 * від'їхало б камерою на вузол, по якому клікнули даремно.
 */
function treeData(): DiagramData {
  const orgs: DiagramOrganization[] = [
    { id: 'root', name: 'Root', groupIds: [], collapsed: false },
    { id: 'mid', name: 'Mid', groupIds: [], parentOrgId: 'root', collapsed: true },
    { id: 'leaf', name: 'Leaf', groupIds: [], parentOrgId: 'mid', collapsed: true },
  ];
  return {
    organizations: orgs,
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
  };
}

type Internals = {
  data: DiagramData;
  host: { renderer: { render: (...a: unknown[]) => Promise<void> } };
};

async function mount() {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: treeData(),
    useWorker: false,
  });
  const internals = diagram as unknown as Internals;
  const inner = internals.host.renderer.render.bind(internals.host.renderer);
  let frames = 0;
  internals.host.renderer.render = (...a: unknown[]) => {
    frames += 1;
    return inner(...a);
  };
  const collapsedOf = (id: string): boolean | undefined =>
    internals.data.organizations.find((o) => o.id === id)?.collapsed;
  return { diagram, framesSince: () => frames, collapsedOf };
}

describe('toggleOrgExpand (T115 K4)', () => {
  it('success: the return value is the new state, and the data agrees with it', async () => {
    const { diagram, collapsedOf } = await mount();

    expect(await diagram.toggleOrgExpand('mid')).toBe(true);
    expect(collapsedOf('mid')).toBe(false);

    expect(await diagram.toggleOrgExpand('mid')).toBe(false);
    expect(collapsedOf('mid')).toBe(true);

    diagram.destroy();
  });

  it('failure: an unknown id answers false, without a throw and without a frame', async () => {
    const { diagram, framesSince } = await mount();
    const before = framesSince();

    expect(await diagram.toggleOrgExpand('no-such-org')).toBe(false);
    // 🔑 Кадр — не деталь реалізації, а половина контракту: `expandOrg` за
    // собою тягне `panToNode`, тож no-op, який усе ж малює, зрушив би камеру.
    expect(framesSince()).toBe(before);

    diagram.destroy();
  });

  it('failure: a leaf answers false, because there is nothing under it to open', async () => {
    const { diagram, framesSince, collapsedOf } = await mount();
    const before = framesSince();

    expect(await diagram.toggleOrgExpand('leaf')).toBe(false);
    expect(collapsedOf('leaf')).toBe(true);
    expect(framesSince()).toBe(before);

    diagram.destroy();
  });

  it('failure: an id that is unknown but HAS children answers false, not a TypeError', async () => {
    // 🔴 Цей тест — від рев'ю другої сесії, і він спростовує те, що я записав у
    // коді як доведене. Я стверджував, що випадок «id невідомий, але діти є» не
    // будується, бо висячий `parentOrgId` відсікає валідатор «на прийомі
    // даних». Валідатор стоїть **не на прийомі**: `validateOrgHierarchy`
    // кличуть лише `rowTreeLayout.ts:146`/`:216` і `orgTree.ts:110`, тобто
    // **деревна** розкладка. Сцену ж обирає `positions.length > 0`
    // (`DiagramRenderer.ts:422`) — тож у **штатній** сцені org-ієрархія не
    // валідується взагалі, і висячий `parentOrgId` доїжджає до `this.data`
    // цілим.
    //
    // Тоді `orgHasChildren('ghost')` віддає `true`, другий охоронець не
    // спрацьовує, і без першого наступний рядок дістав би
    // `isOrgCollapsed(undefined)` — `TypeError` замість `false`.
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const data = treeData();
    data.organizations.push({
      id: 'orphan',
      name: 'Orphan',
      groupIds: [],
      parentOrgId: 'ghost',
      collapsed: true,
    });
    // Хоч одна посада — і сцена стає штатною, тобто без валідації ієрархії.
    data.positions.push({
      id: 'p-1',
      title: 'Lead',
      organizationId: 'root',
      groupIds: [],
      status: 'vacant',
      isTemporary: false,
      isHead: true,
    });
    const diagram = await OrgHierarchyDiagram.create(container, {
      data,
      staffCurrentOrgId: 'root',
      useWorker: false,
    });

    expect(await diagram.toggleOrgExpand('ghost')).toBe(false);

    diagram.destroy();
  });

  it('success: collapsing a parent takes the subtree with it, as the chevron does', async () => {
    const { diagram, collapsedOf } = await mount();

    await diagram.toggleOrgExpand('mid');
    expect(await diagram.toggleOrgExpand('root')).toBe(false);
    // `collapseOrg` ховає піддерево — інакше згорнутий батько лишив би
    // розгорнутого нащадка, і `detectOrgMode` бачив би row-tree без коріння.
    expect(collapsedOf('mid')).toBe(true);

    diagram.destroy();
  });
});
