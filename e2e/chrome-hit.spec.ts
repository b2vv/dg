import { expect, test } from '@playwright/test';

/**
 * Клік по **намальованій** кнопці chrome — у браузері, без DOM-якоря.
 *
 * Цей файл з'явився, коли T123 прибрав ручний фолбек хіт-тесту. До того
 * «клік по chrome не доходить до картки» стерегли юніти, які ставили фейковій
 * картці `activateChromePointer: () => true` — тобто **симулювали** фолбек.
 * Після його зняття гарантію несе `stopPropagation` на самій кнопці, і
 * перевірити це в jsdom не можна: потрібен справжній таргетинг Pixi й справжнє
 * спливання. `emit` на вузлі доводив би лише те, як написаний тест.
 *
 * 🔑 **Дискримінатор — виділення, а не розгортання.** На `flat-orgs` демо саме
 * розгортає org-картку по кліку (`App.handleOrgNodeClick`), тож «діти
 * з'явились» однаково істинне і при влучанні в кнопку, і при промаху повз неї.
 * Кнопка ж ковтає подію, тож нічого не виділяє:
 *
 *     розгорнулось + НЕ виділено → кнопка
 *     розгорнулось + виділено    → картка (промах)
 *
 * Саме на цьому перша редакція виміру T123 і збрехала — вона дивилась на дітей.
 */
async function openFlat(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?e2e=1');
  await page.getByRole('button', { name: 'Flat orgs', exact: true }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(700);
}

/** Прямокутник намальованої кнопки — з якоря експандера (T115 крок 2). */
async function expanderRect(page: import('@playwright/test').Page) {
  const r = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="node-org-2-expander"]') as HTMLElement | null;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  expect(r, 'якір експандера має бути в кадрі').not.toBeNull();
  // ⚠️ Вимикаємо **події**, а не показ. Перша редакція ставила шару
  // `display: none` — і `node-org-6`, по якому перевіряємо розгортання, ставав
  // `hidden`, тобто тест падав із причини, до предмета не дотичної.
  await page.evaluate(() => {
    const layer = document.querySelector('[data-org-hierarchy-test-anchors]') as HTMLElement;
    layer.style.pointerEvents = 'none';
    for (const el of layer.querySelectorAll('button')) {
      (el as HTMLElement).style.pointerEvents = 'none';
    }
  });
  return r!;
}

const selected = async (page: import('@playwright/test').Page) =>
  (await page.locator('#status').innerText()).startsWith('selection ·');

test.describe('canvas click on card chrome (T123)', () => {
  test('hitting the drawn button expands and does NOT select', async ({ page }) => {
    await openFlat(page);
    expect(await page.getByTestId('node-org-6').count()).toBe(0);

    const r = await expanderRect(page);
    await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2);

    await expect(page.getByTestId('node-org-6')).toBeVisible({ timeout: 10_000 });
    // 🔴 Половина, заради якої файл існує: клік належить **кнопці**, тож картка
    // його не бачить і нікого не виділяє.
    //
    // ⚠️ Вага цього асерта **виміряна мутаціями, а не заявлена**, і перша заява
    // була хибна. Я написав був «зняти `stopPropagation` — і впаде цей асерт»:
    // зняв — **не впало**. Валить його інше: `btn.eventMode = 'none'`, тобто
    // коли кнопка перестає бути ціллю Pixi й клік дістається картці
    // (`Received: true`). Отже гарантію дає **таргетинг**, а `stopPropagation`
    // на цьому шляху — запобіжник, якого браузер не потребує.
    expect(await selected(page)).toBe(false);
  });

  test('missing it by 4px reaches the card instead — nothing widens the target', async ({
    page,
  }) => {
    await openFlat(page);
    const r = await expanderRect(page);

    // Ліворуч від кнопки, все ще по картці. Саме цю смугу мав би покривати
    // ручний фолбек, якби був страховкою на промах — виміряно, що не мав:
    // його область дорівнювала власній області кнопки.
    await page.mouse.click(r.x - 4, r.y + r.h / 2);

    await expect(page.getByTestId('node-org-6')).toBeVisible({ timeout: 10_000 });
    expect(await selected(page)).toBe(true);
  });
});
