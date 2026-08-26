# tasks — вибір рушія рендеру (T83)

**План:** `plan.md` (GATE 2 зелений: 0 blocking, 0 дірок, 0 порушень конституції)
**Гілка:** `cursor/renderer-canvas-fallback` · **PR:** у `main`

Порядок — за залежностями. `[P]` = можна паралельно з попереднім.
Кожен таск називає, які рядки приймальної таблиці (`plan.md §8`) він закриває.
За `work/TDD.md` тест пишеться **перед** кодом.

---

## T83.1 — Нормалізація значення опції `renderer`

**Файли:** `packages/sdk/src/render/PixiHost.ts` (експортована чиста функція),
`packages/sdk/src/render/PixiHost.test.ts` (наявний файл — там уже живе тест `resolvePixiResolution`)

Чиста функція `resolveRendererPreference(value: unknown)` → `{ preference, failIfMajorPerformanceCaveat, diagnostic }`
за таблицею К2; будь-що поза юніоном → поведінка `'auto'` + текст діагностики, який називає
**і отримане значення, і застосоване**.

- [ ] тест: `'auto'` / `'webgl'` / `'canvas'` дають рівно опції з таблиці К2
- [ ] тест: `undefined` === `'auto'`
- [ ] тест: `'vulkan'` → опції `'auto'` **і** непорожній `diagnostic`
- [ ] код

**Закриває рядки:** 4, 9 (частково — решта в T83.5)

## T83.2 — Опція доїжджає до `app.init`

**Файли:** `packages/sdk/src/render/PixiHost.ts`, `packages/sdk/src/OrgHierarchyDiagram.ts`

`PixiHostOptions.renderer`; `OrgHierarchyDiagram.create` передає `{ renderer: config.renderer }`
у `PixiHost.create` (зараз `:217` кличе без другого аргументу); `renderer?` у `OrgHierarchyConfig`.

- [ ] тест: значення з публічного конфігу доходить до опцій `app.init`
- [ ] код

**Закриває рядки:** 2 (передумова), 4
⚠️ **Нічого, крім `renderer`, у `PixiHost.create` не додаємо** — `resolution`/`background`/`signal`
у публічному конфігу відсутні, і виносити їх — інша задача (§2 плану).

## T83.3 — `getRendererKind()` із контрактом нульового стану

**Файли:** `packages/sdk/src/render/PixiHost.ts`, `packages/sdk/src/OrgHierarchyDiagram.ts`

`PixiHost` читає `app.renderer.type` (`RendererType.WEBGL=1 / CANVAS=4`);
`getRendererKind(): 'webgl' | 'canvas' | null`, `null` до монтування й після `destroy()`.

- [ ] тест: після `destroy()` віддає `null` і **не кидає**
- [ ] тест: до завершення монтування — `null`
- [ ] код

**Закриває рядки:** 1, 2, 3 (спостережувана поверхня для них)

## T83.4 — Рушій у діагностиці, контракт каналу розширено

**Файли:** `packages/sdk/src/OrgHierarchyDiagram.ts`, `packages/sdk/src/callbacks.ts`

Рядок `Renderer: <kind> (requested: <value>)` дописується **поверх**
`renderer.getLayoutDiagnostics()` у `OrgHierarchyDiagram` — `DiagramRenderer` про рушій не знає.
jsdoc каналу (`callbacks.ts:29` і геттер `:817`) переписується з «soft layout warnings» на
«діагностика останнього рендеру, включно з рушієм».

- [ ] тест: рядок присутній **після другого** рендеру (не лише після першого)
- [ ] тест: рядок про підміну невідомого значення (T83.1) доїжджає в той самий список
- [ ] код + jsdoc **тим самим комітом**

**Закриває рядки:** 9, 12

## T83.5 — Відмова монтування не лишає воркерів

**Файли:** `packages/sdk/src/OrgHierarchyDiagram.ts`

`try/catch` навколо `PixiHost.create`: у `catch` — наявний `instance.destroy()`
(`:1093-1097` уже звільняє `searchService` і `workerPool`), далі кидаємо **обгорнуту** помилку,
яка називає задане значення опції.

- [ ] тест: стаб `PixiHost.create`, що кидає → `dispose` покликано на пошуку й на пулі
- [ ] тест: тричі поспіль — жодного зайвого живого воркера
- [ ] тест: текст помилки містить задане значення `renderer`
- [ ] код

**Закриває рядки:** 11, 11а

## T83.6 [P] — e2e: вибір рушія на машині з GPU

**Файли:** `e2e/renderer-choice.spec.ts` (**єдиний новий файл**),
`packages/sdk/src/render/twoDiagrams.contract.test.ts` (наявний)

- [ ] рядок 1: `getRendererKind() === 'webgl'`; **наявні** бейзлайни `mockups.spec.ts` зелені без перезняття
- [ ] рядок 2: `renderer: 'canvas'` → `'canvas'` **і** `getContext('webgl2') === null`
- [ ] рядок 5: дві діаграми (`'canvas'` + `'auto'`) — у наявному `twoDiagrams.contract.test.ts`
- [ ] рядок 6: **строго послідовне** монтування `'auto'` → `'webgl'`; друга не отримує WebGL тихо
- [ ] рядок 7: `Staff · 1M` під `'canvas'` сходить

**Закриває рядки:** 1, 2, 5, 6, 7

## T83.7 — Бейзлайн канвас-режиму на зумі-аут (рівно один)

**Файли:** `e2e/renderer-choice.spec.ts`, знімок у `*-snapshots/`

- [ ] знімок `Staff · 1M`, зум 0.19, `renderer: 'canvas'` — окремий бейзлайн
- [ ] прогін зелений

**Закриває рядок:** 8
⚠️ Другого повного набору бейзлайнів мокап-вкладок **не заводимо** (§3 К5).

## T83.8 — Прогін у контейнері без GPU

**Файли:** `e2e/renderer-nogpu.spec.ts` (проєкція того ж коду під контейнер)

Середовище: `docker run --platform linux/amd64 mcr.microsoft.com/playwright:v1.62.1-noble`.

- [ ] рядок 3: Firefox без GPU, `Staff · 1M` — сходить, `'canvas'`, ≥30 fps
- [ ] рядок 10: `webgl.disabled` → діаграма сходить на канвасі, не порожній екран
- [ ] рядок 11: `webgl.disabled` + `renderer: 'webgl'` → явна помилка з причиною

**Закриває рядки:** 3, 10, 11

## T83.9 — `docs/USAGE.md`

**Файли:** `docs/USAGE.md`

- [ ] опція та семантика трьох значень
- [ ] `'auto'` — **best-effort**, із причиною (той самий Chromium дав різний вердикт на macOS і в Linux-контейнері)
- [ ] blacklisted-драйвер теж поїде на канвас
- [ ] рушій **не змінюється** після монтування; перемикання потребує перезавантаження сторінки
- [ ] паралельне монтування двох діаграм із різними значеннями — **недетерміноване**

**Закриває:** acceptance criterion 3 і 6 спеки
⚠️ Конституція: цей таск не окремий коміт — док іде **разом** зі зміною сигнатури (T83.2).

---

## Покриття приймальної таблиці

| Рядок | Таск | | Рядок | Таск |
|---|---|---|---|---|
| 1 | T83.6 | | 8 | T83.7 |
| 2 | T83.2, T83.6 | | 9 | T83.1, T83.4 |
| 3 | T83.8 | | 10 | T83.8 |
| 4 | T83.1, T83.2 | | 11 | T83.5, T83.8 |
| 5 | T83.6 | | 11а | T83.5 |
| 6 | T83.6 | | 12 | T83.4 |
| 7 | T83.6 | | | |

**Усі 13 рядків мають таск. Тасків без рядка немає.**
