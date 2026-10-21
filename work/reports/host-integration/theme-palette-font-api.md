# Гнучкий theme/palette/font API — host керує виглядом canvas-ноди без правки dg

**Status:** 🟡 `design` — дизайн-доку до коду (варіант 1: пін API перед R-dg). Критика-траєкторія: р0 (авторський) → **р1 `plan-critique`+`plan-defense` (ЧЕРВОНІ): B1 font-scope, B2 theme-lockstep, Q1/Q4 кривий інпут — внесено** → **р2 re-gate (ЧЕРВОНІ, збіглись): F1 (DepartmentBlob пропущено), F2 (mergeTheme не протягує `fonts`), parse-граматика alpha-hex/shorthand — внесено нижче**. Збіжність: р2-знахідки — вузька граматика реалізації, 0 концептуальних. **Ця редакція — після внесення р2.**
**Сторони:** host = `cassiopeia-admin-ui` (Cass 1), SDK = `dg`/`@org-hierarchy/sdk` (Cass 2, `bulk-mutations` @ `50fa73d`).
**Контекст:** рішення власника 2026-10-21 — гнучкість = **overlay + ширші theme-knobs**; canvas node-spec DSL НЕ будуємо. Запит: «палітру **перевикористати** і шрифти, щоб не дублювати».
**Пов'язане:** [`_wip-dg-side-state-for-integration.md`](./_wip-dg-side-state-for-integration.md); host-контракт `cass:work/queue/2026-10-12-sprint-13/4311-host-sdk-contract.md`.

---

## Лід

Host має задавати **палітру** й **шрифти** canvas-ноди dg з ОДНОГО вже наявного джерела — `src/modules/positions/lib/positions-theme.ts` (`getPositionsCanvasPalette(mode)` + `POSITIONS_CANVAS_FONTS`, змаповані на cass-adm токени; частину полів тримає CI-guard `tools/ci/positions-palette-guard.mjs`) — так, щоб dg-рендер їх застосовував і **не правився**, коли host міняє вигляд. Стан світу: ці константи вже живлять GoJS-канву (`positions.adapter.ts:369-370` — GoJS теж не читає CSS); у dg проблема дзеркальна, але (а) `NodeTheme` не має font-поля — 8 захардкоджених родин у нодах + ~15 `TextStyle` без `fontFamily` (Pixi-дефолт Arial), і (б) `config.styles` ставиться лише в `create`, сеттера нема → переоновити палітру на фліп теми без remount неможливо. **Виняток:** FontFace (Onest) вантажить host (уже в `cass-fonts.css`); overlay-картка (React, `position-promote-card.tsx`) цим API не керується. canvas-нода тут — degraded far/mid/export-вид (стани розрізняються); pixel-exact — overlay.

---

## Чому (§1)

**Біль.** Власник хоче міняти вигляд ноди (кольори станів, бейджі, шрифт) з host'а як дані/токени, не правлячи бібліотеку щоразу. Canvas-текст dg зараз іншим шрифтом, ніж ШПС-канва admin-ui (Onest) — картинка не збігається, і шрифт неможливо передати.

**Вада наявного шляху (на коді, dg HEAD `50fa73d`):**
- **Шрифти захардкоджені + масово відсутні.** Літерали: `PersonNode.ts:133,142`, `OrganizationNode.ts:109` (`'Times New Roman, serif'`), `:139` (`'JetBrains Mono, monospace'`), `DepartmentCardView.ts:61`, `StaffZonesView.ts:72`. 🔴 Понад те, **~15** `new Text(` рендеряться **без** `fontFamily` → Pixi-дефолт Arial — зокрема `PersonNode.ts:112 nameText`/`:113 titleText` (ім'я+посада = головний видимий текст), badge/initials/pending, OrgNode group/period/name, `render/nodeCardChrome.ts` (2 Text), `render/orgNodeChrome.ts` (1 Text), **`render/contour/DepartmentBlob.ts:25,29`** (назва департаменту + «N поз.»). У `NodeTheme` (`render/types.ts:185-195`) жодного font-поля. [critique B1+F1]
- **Палітра — нема сеттера.** `defaultNodeTheme`/`darkNodeTheme` (`render/types.ts:299,353`) — повні hardcoded. Host через `config.styles` (`OrgHierarchyDiagram.ts:115,241`) дає `stylesPartial`; `renderNow` (`:740`) re-resolve'ить `resolveNodeTheme('light'|'dark', stylesPartial)` (із `render/theme.ts:25`; 1-й аргумент — **рядок теми**) на кожен кадр. `stylesPartial` ставиться лише в `create:345` — **сеттера нема**.
- **mergeTheme: top-level — per-key allowlist, не сліпий spread** (`render/types.ts:424-475`): обидві гілки руками реконструюють лише `organization/department/person/canvasBackground/edge/departmentCard/staffZone`. Новий top-level ключ сам не протягнеться — його треба внести в обидві гілки руками. Усередині об'єкта поля таки spread'яться без валідації, тож `NaN`/порожнє проходить у Pixi → валідність мусить гарантувати host-вхід. [critique F2 + defense Q1/Q4]

**Виміряні корекції власної посилки.**
1. Рівень-2 canvas node-spec DSL — **відкинуто** (overlay тримає структуру).
2. **Live-read `getComputedStyle`** (моя попередня пропозиція) — **відкинуто**: admin-ui уже має `getPositionsCanvasPalette`+`POSITIONS_CANVAS_FONTS` (token-змаповані, theme-aware, уже вживані GoJS). Live-read обходив би їх, був би третім патерном і сам генерував би кривий інпут. «Перевикористати» = буквально вжити ці константи для dg.
3. **«mergeTheme — сліпий spread»** (моє формулювання р1) — **хибне** на top-level (там allowlist), виправлено вище; наслідок — F2.

---

## Рішення (§2)

**dg дістає font-поля в темі (+ розширення `mergeTheme`) та `setStyles()`; host будує `NodeThemeOverrides`+шрифти з наявних `getPositionsCanvasPalette(mode)`/`POSITIONS_CANVAS_FONTS` (реюз, нуль нового дублювання) зі строгим парсом і на зміну `data-theme` у lockstep (без await між) кличе `dg.setTheme(mode)`+`dg.setStyles(...)`.** Canvas node-spec DSL не будуємо.

### Механізм

1. **Шрифти в темі (dg).** Додати `NodeTheme.fonts?: { sans?: string; mono?: string; serif?: string }` (ІМЕНА родин+fallback). 🔴 Протягнути в **КОЖЕН** `TextStyle` **усіх** render-файлів — `PersonNode` (вкл. `:112/:113`/badge/initials/pending), `OrganizationNode` (group/period/name/unit-code), `nodeCardChrome.ts`, `orgNodeChrome.ts`, `DepartmentCardView.ts`, `StaffZonesView.ts`, **`contour/DepartmentBlob.ts:25,29`** — а не лише літеральні сайти; де `fontFamily` відсутній, дефолт теж із `fonts.*`. Дефолти `fonts.*` = поточні літерали (fallback). **serif → мапимо на `fonts.sans` (Onest)**: у `POSITIONS_CANVAS_FONTS` serif-запису нема, вигадувати значення = порушити «нуль дублювання»; єдине serif-поле (`OrgNode:109` unit-code) переходить на Onest (або лишаємо dg-дефолт Times New Roman — рішення в impl, але НЕ ad-hoc hex).
2. **`mergeTheme` протягує `fonts` (dg) [F2].** Внести `fonts` в ОБИДВІ гілки `mergeTheme` (`types.ts:424-475`): `base.fonts` ← default, `partial.fonts` перекриває по sub-полях `sans/mono/serif`. Без цього кроку і дефолтні, і host-шрифти мовчки випадуть — увесь font-механізм = no-op.
3. **`setStyles()` (dg).** `async setStyles(partial)`: `this.stylesPartial = partial; await this.render()` (`renderNow:740` сам re-resolve'ить — без подвійного resolve). Симетрично `setTheme`.
4. **Host-адаптер (реюз — нуль нового дублювання).** `cassDiagramStyles(mode): NodeThemeOverrides` + `cassDiagramFonts()` будуються з `getPositionsCanvasPalette(mode)` і `POSITIONS_CANVAS_FONTS`, дзеркалячи `positions.adapter.ts:28,369-370`. **Строгий парс [defense blocking]:**
   - **колір:** приймати рівно `^#[0-9a-f]{6}$` (дзеркалить guard `:41`) → `0xRRGGBB`. Усе інше — 8-значний alpha (`brandTinted '#e84b0a24'`), `rgba()`, `''` — **оміт поля** (падає в dg-base), НІКОЛИ не `0x000000` і не сміттєвий 32-біт. `brandTinted`/alpha-поля на dg-колір **не мапимо**.
   - **шрифт:** `POSITIONS_CANVAS_FONTS` — CSS-шортхенд (`'600 18px Onest, sans-serif'`, `'500 16px "JetBrains Mono", monospace'`); витяг родини = зняти провідний `<weight> <size>px ` (regex), зберегти лапковану родину+comma-fallback; порожнє → оміт (не «present-but-empty»).
5. **Lockstep теми (dg не в 'auto') [B2].** dg для `'auto'` бере `matchMedia` (`theme.ts:14`), host-тема — з `data-theme`: різні сигнали. Host тримає dg **не** в `'auto'` і на зміну `data-theme` кличе `dg.setTheme(mode)`+`dg.setStyles(cassDiagramStyles(mode))` **без await між ними** → `renderCoalesce` (`:298`) злипає в один фінальний кадр (`renderNow` свіжо читає і `themeMode:739`, і `stylesPartial:740`). З await між — видимий транзієнтний кадр «нова база + старі overrides» [defense non-blocking]. (Опц. простіше: комбінований `setThemeAndStyles` у dg.)

### Відкинуті альтернативи та ціна
- **Live-read `getComputedStyle`** — обходить guarded-реюз; 3-й патерн; нерезолвний var→NaN; залежність від DOM (тести/SSR). 
- **Per-theme `styles:{light,dark}` у dg** — ширша поверхня; host усе одно добуває обидві теми.
- **Canvas node-spec DSL** — велика Pixi-робота, дублює overlay (рішення власника).

**Єдиний шов:** через наявний `resolveNodeTheme`; нові — `NodeTheme.fonts` (+`mergeTheme`-крок), `setStyles()`.

### Покриття токенів (чесно, без «parity з GoJS»)
`getPositionsCanvasPalette` = 22 поля; dg `NodeTheme` = ~50. **Мусять мапитись** (головний видимий вигляд): `person` name/title/border/background/vacantLabel/head-brand, `department`/контейнер fill+stroke+label, `canvasBackground`, `edge`. **Решта (~26 dg-полів без cass-токена) свідомо падають у dg-дефолти** (slate/blue, напр. `department.fill 0xdbeafe`, `person.border 0xcbd5e1`) — на canvas far/mid/export це прийнятно (overlay криє робочий зум); GoJS цього не показував, тож «parity» не заявляємо. Guard тримає **10/22** brand/diagram-полів (`positions-palette-guard.mjs:13-24`); решта кольорів і **всі шрифти — негардовані** мірори (можуть розійтись із `cass-adm-theme.css` — ризик дрейфу названо, не прихований). [critique N2, defense Q4]

---

## Поза межами
- Canvas node-spec DSL / host-draw у Pixi; live-read CSS — не робимо.
- Завантаження FontFace — host (Onest у `cass-fonts.css`).
- Overlay-картка (React) — не цим API.
- R-dg-F (path-highlight + found-focus dim) та примітиви (`reveal`-опція, `setData` preserveViewport/selection, `invalidateIcon`, `kind:'lead-org'`) — окремі items ПІСЛЯ.
- Routing — закрито (`50fa73d`).

---

## Форма перевірки (§Verification)
- **Чисті шви (unit, dg):** `mergeTheme` протягує `fonts` з base+partial (sub-поля); `resolveNodeTheme` шарує; `setStyles(partial)`→`stylesPartial`+render; `setStyles(undefined)`→база. **Контракт-тест ітерує ВСІ render-файли generically** (не фіксований список) — кожен `TextStyle` бере `theme.fonts.*` [закриває F1 без фальш-зеленого].
- **Компонентні (замокано шов, host):** `cassDiagramStyles(mode)`/`cassDiagramFonts()` із замоканих констант → очікувана override; **alpha-hex `brandTinted` / rgba / '' → поле ОМІНУТО** (не 0x000000/не сміття); font-шортхенд → лише родина+fallback (вкл. лапковану).
- **Ручний гейт із контрольною пробою:**
  - **Маркер pass-through:** `fonts.sans:'Comic Sans MS'`, `person.nameColor:0xff0000` → ім'я на канві червоне тим шрифтом (інакше шов/`mergeTheme`-крок зламані). Тоді реальні Onest+cass.
  - **Колір з DOM/канви, не на око** (memory `feedback_measure_color_from_dom_not_by_sight`).
  - **Theme-flip lockstep:** light→dark `setTheme`+`setStyles` без await → dark-кольори, один кадр. Контрольні проби: (а) НЕ переподати `setStyles` → stale; (б) await між викликами → видимий mismatched кадр; (в) лишити dg в `'auto'` → розсинхрон.
  - **Onest до 1-го кадру:** без `await document.fonts.load('…Onest')` — fallback; з очікуванням — Onest (Pixi міряє завантаженим; memory `project_storybook_6006_does_not_load_onest`).

---

## Критика (§Critique)
- **р1 `plan-critique`:** B1 (font-scope усі TextStyle) → p1; B2 (lockstep) → p5; +non-blocking (single-resolve p3, оміт порожнього p4, покриття чесно, wording).
- **р1 `plan-defense`:** Q1/Q4 (кривий/граничний) → p4 (оміт) + розворот на guarded-джерело; Q2/Q3/Q5 закрито.
- **р2 re-gate critique:** F1 (DepartmentBlob) → p1+§Форма generic-тест; F2 (mergeTheme не протягує `fonts`) → p2 + §Чому-виправлення; N1–N5 → p4/§Покриття/wording.
- **р2 re-gate defense:** parse-граматика (alpha-hex/shorthand) → p4 (строгий `#rrggbb`→оміт; regex-витяг родини); non-blocking (await-між → p5; parity-wording → §Покриття; serif → p1).
- **Вердикт:** концептуальних дірок 0 (обидва р2 — граматика реалізації, AI-slop лінза чиста). Внесено все.

## 8 секцій
1. **Що** — host-керована палітра+шрифти (реюз `positions-theme.ts`, без DSL). 2–6 — §-ції вище. 7. **Залежності** — `getPositionsCanvasPalette`/`POSITIONS_CANVAS_FONTS`+guard(10/22); Onest у `cass-fonts.css`; dg не в `'auto'`. 8. **Фази** — нижче.

## Фази
- **Ф-A (dg):** `NodeTheme.fonts` + `mergeTheme`-крок + протяг у КОЖЕН TextStyle усіх render-файлів (вкл. DepartmentBlob); `setStyles()`. Unit (generic) + маркер-проба.
- **Ф-B (host):** `cassDiagramStyles(mode)`/`cassDiagramFonts()` зі строгим парсом; lockstep `setTheme`+`setStyles` без await; `fonts.ready`-гейт. Компонентні + ручний гейт.
- **Гейти:** dg package-scoped (`test`/`typecheck`/`oxlint`/`check-docs`); host `tsc -p tsconfig.app.json`+`vitest --project=unit`+`yarn ratchet`.

## Закрито в grilling
- р1 (B1/B2/Q1/Q4) + р2 (F1/F2/parse + N1-5) — внесено. Концептуальних відкритих нема.
