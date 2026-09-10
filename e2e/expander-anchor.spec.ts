import { expect, test } from '@playwright/test';
import { openFlatOrgs } from './demoBridge.js';

/**
 * T115 крок 2 — якір експандера в справжньому браузері.
 *
 * Юніт довів, що оверлей чіпляє другий якір і кличе іншу гілку. Тут
 * перевіряється те, чого юніт не бачить: що бокс, порахований у світових
 * координатах, після камери справді накриває намальований chevron, і що клік
 * по ньому **не** виділяє вузол.
 *
 * 🔴 **Свідки підібрані виміром, а не інтуїцією — і перша спроба була хибна
 * двічі.** Я вважав, що вкладка стартує матрицею з усіма 24 вузлами, і взяв
 * свідком появу `node-org-2`. Насправді T97 відкриває вкладку **мінімумом**:
 * корінь уже розгорнутий, діти `org-2`..`org-5` згорнуті (виміряно дампом
 * шару якорів). Тобто `org-2` видно ще **до** кліку, а клік по кореневому
 * chevron не розгортає, а **згортає**.
 *
 * Дані (`packages/demo/src/scenarios/flatOrgs.ts`): `org-1` несе
 * `testId: 'root'`, його діти — `org-2`..`org-5`, діти `org-2` — `org-6`..`org-9`,
 * а `org-7` дітей не має зовсім. Тому свідок розгортання — поява `org-6`,
 * якого на старті немає.
 *
 * ⚠️ Локатор береться **заново перед кожним кліком**. Шар якорів робить
 * `replaceChildren()` на кожен sync (`createTestAnchorOverlay.ts`), тож handle,
 * узятий до руху камери, після нього detached — це вже кусало `flat-orgs`.
 */
test.describe('expander anchor (T115)', () => {
  test('clicking the expander anchor expands, and does not select the node', async ({ page }) => {
    await openFlatOrgs(page);

    await expect(page.getByTestId('node-org-2')).toBeVisible();
    await expect(page.getByTestId('node-org-6')).toHaveCount(0);

    await page.getByTestId('node-org-2-expander').click();

    await expect(page.getByTestId('node-org-6')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('diagram-ready')).toBeVisible();

    // 🔴 Половина, заради якої спек існує. `focusByTestId` виділяє вузол; гілка
    // експандера — ні. Свідок — `#status`, куди демо друкує кожну зміну
    // виділення (`App.ts:520-525`); його вже читають чотири інші спеки.
    await expect(page.locator('#status')).not.toContainText('selected');

    // ⚠️ І одразу — доказ, що свідок **живий**. «У статусі немає `selected`»
    // задовольняється й зламаним оракулом: якби `#status` не оновлювався
    // взагалі, проба була б зелена. Клік по якорю **вузла** мусить його
    // оживити — і це той самий клас помилки, який цей цикл спіймав уже тричі.
    await page.getByTestId('node-org-2').click();
    await expect(page.locator('#status')).toContainText('1 selected', { timeout: 10_000 });
  });

  test('the same anchor collapses again', async ({ page }) => {
    await openFlatOrgs(page);

    await page.getByTestId('node-org-2-expander').click();
    await expect(page.getByTestId('node-org-6')).toBeVisible({ timeout: 10_000 });

    // Заново: попередній handle пережив кілька sync'ів і вже detached.
    await page.getByTestId('node-org-2-expander').click();
    await expect(page.getByTestId('node-org-6')).toHaveCount(0, { timeout: 10_000 });
    // Сцена лишається деревом — тобто зникнення `org-6` означає саме згортання
    // `org-2`, а не перехід у матрицю, де малюються геть усі вузли.
    await expect(page.locator('#status')).toContainText('row-tree');
    await expect(page.getByTestId('node-org-2')).toBeVisible();
  });

  test('a leaf has a node anchor but no expander anchor', async ({ page }) => {
    await openFlatOrgs(page);

    await page.getByTestId('node-org-2-expander').click();
    await expect(page.getByTestId('node-org-7')).toBeVisible({ timeout: 10_000 });

    // `org-7` дітей не має — отже кнопки немає, отже й якоря. Пара «вузол є,
    // експандера немає» і є тим, що хост читає як «лист».
    await expect(page.getByTestId('node-org-7-expander')).toHaveCount(0);
    // Контраст у тому ж кадрі: сусід із дітьми якір має. Без цього рядка тест
    // був би зелений і на оверлеї, який не чіпляє експандерів узагалі.
    await expect(page.getByTestId('node-org-6-expander')).toHaveCount(1);
  });
});
