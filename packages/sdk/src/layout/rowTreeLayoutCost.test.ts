import { beforeAll, describe, expect, it } from '@rstest/core';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeOrgRowTreeLayout } from './rowTreeLayout.js';
import { resetContourWasmForTests, setContourWasmLoaderForTests } from '../contour/bridge.js';
import type { DiagramOrganization } from '../data/types.js';

/**
 * T102 блок Б, приймальні рядки **B3** і **B4** — `work/reports/row-tree-depth/spec.md`.
 *
 * 🔑 **Цей файл кріпить ФОРМУ КРИВОЇ, а не мілісекунди.** Стенд шумить: власний
 * розкид на незмінному коді доходив до 28% (T88 §9.4), тож абсолютний бюджет,
 * вужчий за шум, не є вердиктом ні в який бік. Тому пороги нижче свідомо грубі,
 * а головна перевірка — **у скільки разів** дорожчає подвоєння обсягу.
 *
 * Що ловиться: повернення квадратичної вартості. До блоку Б плоске дерево
 * 20 000 коштувало **2 912 мс**, і подвоєння обсягу коштувало ×3,7 — тобто
 * `n²`. Після того як три повні скани стали індексами, те саме дерево коштує
 * ~105 мс, а подвоєння — менш ніж ×2.
 *
 * ⚠️ Перф-юніти в цьому репо флейкують під паралельним навантаженням
 * (брифінг, ризик 12). Якщо цей файл почервонів — **спершу прожени його
 * окремо**, і лише потім шукай регресію.
 */
function flatTree(size: number): DiagramOrganization[] {
  const orgs: DiagramOrganization[] = [
    { id: 'root', name: 'Root', groupIds: [], collapsed: false },
  ];
  for (let i = 0; i < size - 1; i += 1) {
    orgs.push({
      id: `o-${i}`,
      name: `O${i}`,
      parentOrgId: 'root',
      groupIds: [],
      collapsed: false,
    });
  }
  return orgs;
}


/** Медіана з трьох — один прогін тут не вимір, а збіг. */
async function medianMs(orgs: DiagramOrganization[], rootId: string): Promise<number> {
  // Прогрів: перший виклик у процесі несе інстанціацію WASM і JIT, і це не
  // алгоритм. Без нього медіана з трьох на 20 000 давала 2 907 мс — рівно те
  // число, що стояло в задачі як «до», хоча код уже був виправлений.
  await computeOrgRowTreeLayout(orgs, rootId);
  const runs: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    const started = performance.now();
    await computeOrgRowTreeLayout(orgs, rootId);
    runs.push(performance.now() - started);
  }
  return runs.sort((a, b) => a - b)[1]!;
}

describe('row-tree layout cost', () => {
  beforeAll(async () => {
    const wasmPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '../wasm/pkg/org_hierarchy_core_bg.wasm',
    );
    const bytes = readFileSync(wasmPath);
    setContourWasmLoaderForTests(async () => {
      const mod = await import('../wasm/pkg/org_hierarchy_core.js');
      await mod.default({ module_or_path: bytes });
      return mod as never;
    });
    resetContourWasmForTests();
  });

  it('success: B3 — quadrupling a flat tree costs about 4x, not about 16x', async () => {
    const five = await medianMs(flatTree(5_000), 'root');
    const twenty = await medianMs(flatTree(20_000), 'root');

    // 🔴 **Дві форми цієї перевірки виміряно й відкинуто, перш ніж лишилась ця.**
    //
    // 1. Рядок B3 спеки просить «< ×2,5 на кожному подвоєнні». Десять прогонів
    //    на **виправленому** коді дали верхній перехід 1,90 … 3,20 — і 2,5, і
    //    3,0 червоніли б на справному коді. На 5 000 корисна робота співмірна з
    //    накладними харнесу, тож частка двох малих чисел шумить сильніше за
    //    кожне з них.
    // 2. Абсолютні бюджети (5 000 < 200 мс, 20 000 < 600 мс) були стабільні
    //    поодинці й **червоніли в повному прогоні**: перф-юніти тут чутливі до
    //    паралельного навантаження (брифінг, ризик 12).
    //
    // Лишилось те, що переживає обидва: відношення на **чотирикратному** кроці,
    // виміряне в тому самому процесі. Під навантаженням обидва числа ростуть
    // разом, тож частка стійка, а лінійне (≈×4) від квадратичного (≈×16)
    // відділене з великим запасом з обох боків. Спостережено 1,9–4,4.
    expect(twenty / five).toBeLessThan(8);
  });

  it('success: B4 — 20k flat tree stays far under the ceiling it used to breach', async () => {
    // Єдиний абсолют, що лишився, і це число самої спеки. Було 2 912 мс, зараз
    // 115–218 мс поодинці — запас понад ×5 навіть до порога, не кажучи про
    // виміряне значення.
    expect(await medianMs(flatTree(20_000), 'root')).toBeLessThan(1_200);
  });

  // 🔴 **Тут БУВ третій тест — на ланцюг — і його прибрано як недійсний.**
  //
  // `depth_of` давав n² саме на ланцюгу, тож перевірка форми напрошувалась. Але
  // жодна з трьох спроб не відрізняє дефект від шуму:
  //
  // - відношення `chain(2500)/chain(1250)` на незміненому коді гуляє 1,08–2,77,
  //   а квадрат дав би ×4 — не розділяється;
  // - абсолютний бюджет (< 60 мс) стабільний поодинці й червоніє в повному
  //   прогоні під навантаженням;
  // - відношення `chain/flat` того самого розміру: 0,44 наодинці, але **1,72**
  //   під навантаженням — тоді як **до** правки воно було ≈1,4. Тобто виправлений
  //   код під навантаженням «гірший» за зламаний у спокої, і тест міряє
  //   завантаженість машини, а не алгоритм.
  //
  // Тест, який не може відрізнити дефект від шуму, у сюїті шкідливіший за
  // відсутній: він або червоніє даремно, або зеленіє з хибної причини. Вимір
  // ланцюга живе там, де його можна зробити чесно — зондом поза гвардією
  // (`packages/core/examples/depth_probe.rs`, числа у звіті: 3 000 коштували
  // 151 мс і ×3,5 на подвоєння, стали 16 мс і ×1,7).
});
