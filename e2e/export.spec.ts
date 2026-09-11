import { expect, test, type Download, type Page } from '@playwright/test';

/**
 * Експорт — перша наскрізна перевірка поверхні, у якої їх було **нуль**
 * (D&D, promote, мульти-виділення, вікно за камерою і тест-якорі свої мають).
 *
 * 🔑 **Що тут доводиться понад юніти, а не замість них.** `export.test.ts`
 * покриває повернене значення: що SVG має `path d=`, що PNG іде через
 * `extractPngFromPixi`, що PDF починається з `%PDF`. Чого юніт не бачить:
 *
 * 1. **шлях до файлу** — `diagram.export()` → `Blob` → `<a download>` →
 *    завантаження, яке отримує ОС (`App.ts:1150-1157`). Юніт зупиняється на
 *    поверненому значенні;
 * 2. **справжню сцену** — у юніта вона зібрана в jsdom, тут її малює справжній
 *    рендерер зі справжніми шрифтами;
 * 3. **що експорт іде за сценою, а не за якимось її знімком** — це й перевіряє
 *    головний тест нижче, і саме його не можна написати юнітом.
 *
 * 🔑 **Вимір дорогою спростував моє припущення про два з трьох форматів.**
 * Мутація «віддати експорту порожні дані» валить **лише** SVG — PNG і PDF
 * лишаються зеленими, бо вони знімають **канву**, а не модель
 * (`extractPngFromPixi` → `app.renderer.extract.canvas`). Тож «експорт іде за
 * сценою» доведено для SVG і **не доведено** для растрових форматів: там
 * предметом є канва, і ловить її інша мутація — порожня канва того ж розміру.
 *
 * ⚠️ Виміряно перед написанням (інакше це була б гіпотеза): headless ловить
 * завантаження від синтетичного `a.click()` по blob-URL для **всіх трьох**
 * форматів, і вміст доїжджає цілим — SVG `<?xml`, PNG із сигнатурою,
 * PDF `%PDF-1.4`. Окремої машинерії не треба, тож звужувати до «SVG як рядок»
 * не довелось.
 */
async function openFlatOrgs(page: Page): Promise<void> {
  await page.goto('/?e2e=1');
  await page.getByRole('button', { name: 'Flat orgs', exact: true }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(800);
}

async function bytesOf(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function exportFile(page: Page, format: 'svg' | 'png' | 'pdf'): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 45_000 }),
    page.locator(`#export-${format}`).click(),
  ]);
  return download;
}

test.describe('export delivers a real file (T101 agenda)', () => {
  test('svg follows the scene: expanding a node changes what gets exported', async ({ page }) => {
    test.setTimeout(180_000);
    await openFlatOrgs(page);

    const before = (await bytesOf(await exportFile(page, 'svg'))).toString('utf8');

    // Сцена справжня: імена приходять із даних, ребра — з розкладки.
    expect(before).toContain('Organization 1');
    expect(before).toContain('Organization 2');
    // `org-6` — дитина згорнутого `org-2`, тож у цьому кадрі її немає.
    expect(before).not.toContain('Organization 6');
    const pathsBefore = (before.match(/<path/g) ?? []).length;
    expect(pathsBefore).toBeGreaterThan(0);

    // Розгортаємо через якір експандера — той самий шлях, яким клікає користувач.
    await page.getByTestId('node-org-2-expander').click();
    await expect(page.getByTestId('node-org-6')).toBeVisible({ timeout: 10_000 });

    const after = (await bytesOf(await exportFile(page, 'svg'))).toString('utf8');

    // 🔴 Половина, заради якої тест існує, і єдина, яку юніт написати не може:
    // експорт узяв **нинішню** сцену, а не ту, що була на момент монтування.
    expect(after).toContain('Organization 6');
    expect((after.match(/<path/g) ?? []).length).toBeGreaterThan(pathsBefore);
  });

  test('png is a real raster of the canvas, not a blank page', async ({ page }) => {
    test.setTimeout(120_000);
    await openFlatOrgs(page);
    const png = await bytesOf(await exportFile(page, 'png'));

    // Сигнатура PNG — байт у байт, не «схоже на картинку».
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // IHDR іде першим чанком: ширина й висота лежать на зсувах 16 і 20.
    expect(png.subarray(12, 16).toString('latin1')).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBeGreaterThan(0);
    expect(png.readUInt32BE(20)).toBeGreaterThan(0);

    // ⚠️ Поріг виміряний **мутацією**, а не прикинутий, і перша редакція цього
    // коментаря брехала: я написав «порожня канва — одиниці кілобайт».
    // Насправді (підміна `extract.canvas` на порожню того самого розміру):
    //
    //     намальовано → 97 242 Б · порожньо → 11 402 Б
    //
    // Тобто 20 000 лежить у **1,75×** над порожнім і в 4,9× під намальованим —
    // запас реальний, але вужчий, ніж «на порядок». Тест розрізняє
    // «намальовано» й «біла сторінка», і не міряє машину: стиснення PNG від
    // навантаження не залежить.
    expect(png.length).toBeGreaterThan(20_000);
  });

  test('pdf carries the same scene through a third pipeline', async ({ page }) => {
    test.setTimeout(120_000);
    await openFlatOrgs(page);
    const pdf = await bytesOf(await exportFile(page, 'pdf'));

    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(100_000);
    // Кожен експорт має власне ім'я — інакше хост перезаписав би файл.
    expect((await exportFile(page, 'svg')).suggestedFilename()).toBe('org-diagram.svg');

    // ⚠️ **Чого цей тест НЕ доводить, і це виміряно.** Мутація «порожня канва»
    // його **не валить**: PDF лишається понад 100 КБ, бо вага йде від
    // контейнера, а не від вмісту. Тобто тут доведено доставку й формат —
    // третій конвеєр справді доходить до файлу, — а не те, що на сторінці
    // намальовано сцену.
    //
    // Вміст PDF покритий **транзитивно**: `pngBlobToPdfBlob` вкладає в нього
    // рівно той PNG, який пінить тест вище, і мутацію канви ловить саме він.
    // Дублювати перевірку тут означало б два вирази, що мусять збігатись.
  });
});
