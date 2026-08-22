# Parity `gojs-diagram` → `dg`: вимога → можливість

**Редакція:** 2.1 (синхронізовано з `dg` task IDs T61–T71, 2026-08-22)  
**Ліворуч:** прод `gojs-diagram` / `modules/{org-hierarchy,positions}`  
**Праворуч:** `b2vv/dg`  
**Індекс задач:** [T71-gojs-to-dg-migration-plan.md](./T71-gojs-to-dg-migration-plan.md)

> Порівнюємо **«що зобов’язані показати користувачу»**, не механізм із механізмом.  
> GoJS-обходи → §1 (не мігрують).  
> **Нумерація тікетів `dg`:** T53–T56 уже зайняті зданими тікетами; gaps = **T63–T70**, B8c = **T61**.

**Походження:** 📋 замовник · 🏛 ADR · 🧬 легасі · 🎨 макет · ❓ не встановлено  
**%:** ✅ ≥85 · 🟡 30–80 · 🔴 <30

---

## §1. Обхідні шляхи GoJS — не мігрують

| Що в GoJS-проді | Чому існує | Доля в `dg` |
|---|---|---|
| `formMatrix` / `revertMatrix` / `matrixParents` / `shouldFormMatrix` | TreeLayout володіє розміщенням; підмножину іншому layout — лише через Group | **зникає** — `matrixRow/matrixCol` напряму |
| Структурний лінк батько→група + `GROUP_LINK_KIND` | поставити групу під батька в дереві | **зникає** |
| `go.Group` як зона окремої розкладки | єдиний спосіб дати підмножині свій layout-прохід | **зникає** — `orgBlockLayout` + `StaffTierBand` (SPEC §2.2.1) |
| «Сітка лише коли всі сиблінги схлопнуті» | розгорнутій дитині потрібна вертикаль | **зникає** — anchor child under parent (`orgBlockLayout`) |
| `addChildren` + `expandedKeys` | перф-стеля canvas | **зникає** — LOD + viewport / windowing |
| `allowSelect:false` + редюсер | flaky modifier-click GoJS | **зникає** (вимога multi-select лишається — D2 / T67) |
| `isActionable` / expander click-guard | click після `standardMouseSelect` | **зникає** |
| «Непідпорядкована = ОКРЕМИЙ КОРІНЬ» + Horizontal arrangement | TreeLayout ставить лише top-level | **зникає** — orphan під head лише для WASM root; ребра з `reportLines` |
| `pendingReveal` на LayoutCompleted | async layout без bounds | **зникає** — `focusNode()` async |
| Один `nodeTemplate` | обмеження DiagramAdapter | **зникає** — фіксовані профілі + promote |
| `text-glyph-padding.ts` | GoJS ріже кирилицю | ⚠️ виміряти на Pixi Text |
| Raw-hex §31.2 | canvas ≠ CSS vars | ⚠️ лишається — Pixi `NodeTheme` `0xRRGGBB` |

---

## §2. Вимоги → `dg`

### A. Дані і полотно

| # | Вимога | Дж. | dg | % | Тікет |
|---|---|---|---|---|---|
| A1 | Ієрархія org зі знімка BE | 🧬📋 | `create` + `setData` | ✅ 95 | T01/T12 |
| A2 | Штатка організації | 📋 4245 | `layout/staff` | ✅ 100 | T08 |
| A3 | Новий знімок / фільтр | 📋 | `setData` / `appendData` | ✅ 100 | T12/T21 |
| A4 | Іконки IndexedDB object-URL | 🧬 | URL as-is | ✅ 100 | T23 |

### B. Розміщення

| # | Вимога | Дж. | dg | % | Тікет |
|---|---|---|---|---|---|
| B1 | Дерево згори вниз | 🧬 | WASM row-tree | ✅ 95 | T03/T48 |
| B2 | Підлеглі в сітці за BE coords | 📋 BE | `matrixGrid` + `matrixRow/Col` | ✅ 85 | T03 |
| B3 | Spine: стовбур + шина + райзери | 📋+🧬 | per-link ortho, шини нема | 🔴 15 | **T63** |
| B5 | Три яруси штатки | 📋 4245 | `canvasLayout` | ✅ 100 | T08 |
| B6 | Департамент групує посади | 📋 4245 | DepartmentBlob + G1–G8 | ✅ 90 | T07/T49 |
| B7a | Посади в власній зоні розкладки | 📋 4245 | `orgBlockLayout` локальна СК | ✅ 100 | — |
| B7b | Dept зона всередині блоку org | 📋 4245 §3 | cells всередині блоку | ✅ 90 | — |
| B8 | Іменована **зона відображення** (фон/radius/рамка/підпис) | 🎨📋 4245 §3–4 | `StaffTierBand` пораховано, **не малюється**; dept = blob | 🔴 20 | **T64** |
| B8a | Пунктир навколо сітки | 🧬 | той самий chrome | 🟡 25 | **T64** |
| B8b | Керівник вище людей у зоні | 🏛 ADR-0055 | hybrid по reportLines; рішення на org | 🟡 70 | **T64** |
| B8c | Рекурсія зон груп орг | 📋 4245 §1 | Group = caption на картці | 🔴 10 · **не ціна міграції** | **T61** |
| B9 | Посада без керівника без вигаданого підпорядкування | 📋 модалка | ребра тільки з reportLines ✅; позиція **під head** для WASM root 🟡 | 🟡 65 | **T65** (не блокер) |
| B10 | Подвійна посада → ярус 2 | 📋 | mapper | ✅ n/a | — |

### C. Розкриття

| # | Вимога | Дж. | dg | % | Тікет |
|---|---|---|---|---|---|
| C1 | Expand/collapse org | 📋 | `expandOrg` / … | ✅ 100 | T03 |
| C2 | Expand/collapse **посади** | 📋 замовник | лише `toggleStaffOrgExpand` | 🔴 20 | **T66** |
| C3 | Початкова глибина N | 📋 замовник | нема `expandToDepth` | 🟡 40 | **T66** |
| C4 | Чужий блок згорнутий | 🧬📋 | `collapsed` | ✅ 90 | T03 |
| C5 | Афорданс на картці | 🎨 | +/− ▼/▲ ⋮ | ✅ 90 | T52 |

### D. Взаємодія

| # | Вимога | Дж. | dg | % | Тікет |
|---|---|---|---|---|---|
| D1 | Click → sidebar | 📋 | `onNodeClick` | ✅ 100 | T04 |
| D2 | Multi-select → bulk | 📋 наступні задачі | selection одиничне | 🔴 10 | **T67** |
| D3 | Context menu | 📋 | React host | ✅ 100 | T10/T52 |
| D4 | Період підпорядкування **на організації** (відображення; не edge-click) | 📋 замовник | полів/paint нема | 🔴 0 | **T68** |
| D5 | Dblclick → sidebar | 📋 замовник | `onNodeDoubleClick` wired (demo + tests); host must subscribe | ✅ 100 | **T69** |
| D6 | Search + focus | 📋 | worker + revealPath | ✅ 100 | T18 |
| D7–D8 | Fullscreen / timeline | 📋🧬 | host | ✅ n/a | — |
| D9 | D&D reparent | ❓ мертвий у GoJS | ✅ у `dg` | ✅ 100 | T04/T17 |

### E. Вигляд картки (+ §4 зображення)

| # | Вимога | Дж. | dg | % | Тікет |
|---|---|---|---|---|---|
| E1 | Лише знак, без підпису | 📋 4231 | фіксований профіль | 🟡 30 | **T70** |
| E2 | Однаковий розмір вузла з/без підпису | 📋 4231 | ❓ виміряти | ❓ | **T70** |
| E3 | Без знака → `fullName` | 📋 4231 №2 | нема | 🔴 0 | **T70** |
| E4 | Годинник тимчасової на org | 📋 4231 | лише PersonNode | 🟡 30 | **T70** |
| E5 | Бейдж `N [M]` | 🧬 скріни | нема | 🔴 15 | **T70** |
| E6 | Unit-code | 🎨 | нема | 🔴 0 | **T70** |
| E7 | Вакансія / чип періоду / detached | 📋 4245 | частково | 🟡 40 | **T70** |
| E8 | Theme + symbol light/dark | 📋 | `setTheme` + URLs | ✅ 100 | T28 |
| E9 | HTML/React overlay | — | promote | ✅ бонус | T26 |
| **E10** | Знак org: **contain**, не розтяг; 3 режими коробки; intrinsic 400×200 | 📋 4231 №3 | `showSymbol` ставить `width=height=size` 🔴 | 🔴 0 | **T70** (Phase 0) |
| E11 | Прелоад light+dark → миттєвий theme flip | 🧬 | кеш по URL, без прелоаду другої | 🟡 70 | **T70** |

### F / G

| # | Вимога | % | Тікет |
|---|---|---|---|
| F1–F2 | Zoom / export | ✅ 100 | T15/T05 |
| G1 | Playwright адресація | ✅ ~90 | **T55 done** (`testId` + anchors + e2e) — не `getTestID()`, еквівалент |

---

## §3. Підсумок

| | к-сть |
|---|---|
| ✅ | **~24** (+ G1 після T55) |
| 🟡 | **~9** |
| 🔴 міграційні | **~7–8** |
| 🔴 не міграція (B8c) | 1 → T61 |
| ❓ | E2 |

**Cutover P0:** T64 (B8 paint), T66 (C2/C3).  
**P0 візуал 4231:** T70 Phase 0 — `showSymbol` contain.  
**Не блокер:** T65 (B9 🟡65), T61 (B8c).

### Mapping «нов. T5x» з чернеток → `dg`

| Чернетка | Файл у `dg` |
|---|---|
| T53 spine | **T63** |
| T54 зони | **T64** |
| T55 orphan placement | **T65** |
| T56 expand position | **T66** |
| T57 multi-select | **T67** |
| T58 period | **T68** |
| T59 dblclick | **T69** |
| T60 chrome + images | **T70** |
| T61 groups recursion | **T61** |

---

## §4. Зображення (стисло)

**Сумісно:** object-URL / IndexedDB, `symbolUrlLight/Dark`, person initials + LOD hide photo (бонус).  
**Діра:** `OrganizationNode.showSymbol` — квадратний stretch (суперечить 4231 №3); немає 3 режимів коробки / intrinsic detect / fullName fallback. Деталі й acceptance → [T70](./T70-position-card-chrome.md).
