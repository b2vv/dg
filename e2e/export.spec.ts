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

test.describe('export delivers a real file', () => {
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

    // ⚠️ Поріг — **на піксель**, а не на файл, і це правка після рев'ю.
    //
    // Перша редакція тримала абсолютні 20 000 Б. Мутація «порожня канва того ж
    // розміру» його валила (11 402 проти 97 242), але запас був **1,75×** — і,
    // головне, абсолют зсувається сам: канва росте з камерою, тож той самий
    // кадр на іншому зумі дає інше число (виміряно: 852×551 → 1096×709).
    //
    //     порожньо        → 0,024 Б/пікс
    //     намальовано @1,94 → 0,207
    //     намальовано @2,5  → 0,169   ← найтонше з виміряних
    //
    // 0,06 лежить у ×2,5 над порожнім і ×2,8 під найтоншим намальованим —
    // ширше з обох боків, і не залежить від того, який зум відновив браузер.
    const pixels = png.readUInt32BE(16) * png.readUInt32BE(20);
    expect(png.length / pixels).toBeGreaterThan(0.06);
  });

  test('png resolution follows the camera, so a zoomed export is a bigger raster', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openFlatOrgs(page);

    const dims = async () => {
      const png = await bytesOf(await exportFile(page, 'png'));
      return { w: png.readUInt32BE(16), h: png.readUInt32BE(20), bytes: png.length };
    };
    const setZoom = async (z: number) => {
      await page.evaluate((value) => {
        (window as unknown as { __demoE2e?: { setZoom(s: number): void } }).__demoE2e?.setZoom(
          value,
        );
      }, z);
      await page.waitForTimeout(600);
      return page.evaluate(
        () => (window as unknown as { __demoE2e: { getZoom(): number } }).__demoE2e.getZoom(),
      );
    };

    const z1 = await setZoom(1);
    const a = await dims();
    const z2 = await setZoom(2);
    const b = await dims();

    // 🔑 Тест **калібрується сам**: очікуване відношення береться з реального
    // зуму, а не з переданого. Інакше він упав би від будь-якого клампу чи
    // від зуму, який браузер відновив із `localStorage` — саме так post-deploy
    // T115 відкрився на 1,94 замість 1.
    expect(z2).toBeGreaterThan(z1);
    expect(b.w / a.w).toBeCloseTo(z2 / z1, 1);
    expect(b.h / a.h).toBeCloseTo(z2 / z1, 1);

    // ⚠️ Це **опис поведінки, а не схвалення**: експорт PNG віддає растр
    // поточного кадру, тож хост, у якого користувач крутнув колесо, дістане
    // файл іншого розміру. У `USAGE.md` це сказано словами й **без чисел**;
    // тут воно стає перевірюваним.
    expect(b.bytes).toBeGreaterThan(a.bytes);
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
