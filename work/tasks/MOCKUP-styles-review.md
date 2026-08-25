# Mockup style & display rules

**Status:** ✅ **Approved** (2026-08-23 — «Так поїхали»)  
**Branch:** `cursor/gojs-migration-tasks-babc`  
**Demo tabs:** Orgs · Figma / Orgs · GoJS / Staff · Figma / Staff · Magnetic / Staff · GoJS  
**Data:** civilian corporate names only (GH Pages safe)  
**Contract tests:** `packages/demo/src/scenarios/mockupFigma.test.ts`

Tokens use hex for readability (`0x2a323c` → `#2a323c`).

---

## 1. Orgs · Figma

**Figma:** frame `1264:8121` («організації», file `alw0l86pqoZzpO8ofhjWjb`)  
**Theme:** dark (forced)  
**Styles object:** `MOCKUP_FIGMA_STYLES.organization`  
**Layout:** cards `234×110`, gap H40 / V72, edges `spine-bus`  
**Chrome flag:** `orgSiblingGroupChrome: true` (dashed AABB around ≥2 siblings)

### Card tokens
| Token | Value |
|---|---|
| canvas | `#222222` (`styles.canvasBackground`) |
| background | `#121212` (bg/primary) |
| border | `#303030` (bg/tertiary) / 1px / radius 12 |
| name | `#ffffff` / 14px, top-left of the body |
| counts `N [M]` | `#a6a6a6` / 14px, top-right of the body (no chip) |
| body inset | 16px; name row 17px; symbol gap 12px; symbol 116×49 |
| connectors | `styles.edge`: `#a6a6a6`, 1px, corner radius 8, dot terminator (r 2.67) |
| sibling frame | fill `#191f26`, dashed `#3d5067`, radius 12 |

### What must appear
| Element | Rule |
|---|---|
| Brand mark | SVG letter tile on every org, centered under the name row |
| Counts | `filledCount` + `vacantCount` as `N [M]`, top-right |
| Sibling frame | dashed frame around the five peer divisions only |
| Tree | Cedar Lake Group → Northwind Region → 5 divisions |
| Period / unit code / T | **off** on this mockup (Figma screen did not show them) |
| Tree expander | **off** (`orgTreeChrome: false`) — кадр показує голі картки; expand/collapse лишається через контекстне меню та host API |

---

## 2. Orgs · GoJS

**Theme:** light (forced)  
**Styles object:** `MOCKUP_GOJS_STYLES.organization`  
**Layout:** compact cards `200×64`, gap H40 / V44, edges `spine-bus`  
**Chrome flag:** `orgSiblingGroupChrome: false`

### Card tokens
| Token | Value |
|---|---|
| background | `#ffffff` |
| border | `#cbd5e1` / 1.5px / radius 10 |
| name | `#0f172a` / 13px |
| symbol size | 36 |
| period line | `#15803d` |
| meta / unit code | `#64748b` |
| counts badge | `#f1f5f9` / `#334155` |
| temp T badge | `#f59e0b` / white |

### What must appear
| Element | Rule |
|---|---|
| Brand mark | smaller symbol (36) |
| Period line | on HQ + EMEA (`з … по т.ч.` / range) |
| Unit code | on EMEA (`EU-12`) |
| Temp badge | on Lisbon Hub (`isTemporary`) |
| Counts | on all orgs in fixture |
| Sibling dashed frame | **never** |
| Tree | Brightside Holdings → EMEA Operations → 5 hubs |

---

## 3. Staff · Figma

**Figma:** frame `1264:7906` («посади», file `alw0l86pqoZzpO8ofhjWjb`)  
**Theme:** dark (forced)  
**Styles:** `MOCKUP_FIGMA_STYLES.person` + `staffZone` + `departmentCard`  
**Seat size:** chrome-less row `248×44` (40×40 tile left, title + name right)  
**Render:** `staffZoneChrome: true`, `departmentStyle: 'card'`

### Person tokens
| Token | Value |
|---|---|
| canvas | `#222222` (`styles.canvasBackground`) |
| card frame | **none** — `backgroundAlpha: 0`, `borderWidth: 0` |
| avatar tile | `#121212`, 40×40, radius 8 |
| title | `#ffffff` / 16px |
| name (any seat) | `#e8490f` accent/primary / 14px |
| acting marker | `⏳` right after the name (`tempMarkerStyle: 'hourglass'`) |
| period | **off** on the card (`hidePeriodOnCard`) — Figma shows it in a popover |
| vacant seat | title only (`hideVacantLabel`) |

### Zone / dept tokens
| Token | Value |
|---|---|
| zone fill | `#191f26` (opaque) |
| zone stroke | `#3d5067` **dashed**, radius 12 |
| zone label | right-aligned `#a6a6a6` / 14px, 16px inset |
| dept card | fill `#242f3d`, dashed `#3d5067`, radius 8, 16px padding |
| connectors | `styles.edge`: `#a6a6a6`, 1px, corner radius 8, dot terminator (r 2.67) |
| edge ports | on the **40px avatar tile**, not the 248px text row (the row stays a router obstacle) |

### What must appear
| Element | Rule |
|---|---|
| Seat | avatar tile + text column only — no card background or border |
| Photo / avatar | left; initials over the `#121212` tile if missing |
| Name color | accent `#e8490f` for every filled seat |
| Acting seat | `⏳` after the name (no «T» pill, no inline period chip) |
| Vacant seat | title only, no `(вакансія)` line |
| Zones | dashed named bands per staff block, label top-right |
| Dept cards | dashed card chrome around department clusters |
| Edges | solid **admin**; **cross-tier** managing head → current head (SDK, SPEC §2.2); **dotted** managing deputy → current head (frame draws the zone-to-zone line from the deputy) |
| Topology | Lumen Holdings (managing tier — command dept) → Pacific Region (focus — command dept + Supply service + People operations) |
| Tier 1 | **Керівний склад**: managing head **+ its direct admin reports** (SPEC §2.2) — not the head alone |
| Tier 3 | **off** on this tab. Кадр показує лише дві зони, тому ярус 3 зі SPEC §2.2 («підпорядковані організації») тут **свідомо не демонструється** — expand-in-place лишився на Staff · GoJS. Це послаблення затвердженого правила §3, а не його переформулювання. |

---

## 3b. Staff · Magnetic (копія Staff · Figma)

**Figma:** та сама сцена `1264:7906`, але pre-T64 chrome  
**Theme:** dark (forced)  
**Data:** `buildMockupStaffMagneticData()` — ті самі посади/відділи/звʼязки, що і в Staff · Figma, плюс `gridCell` на кожній посаді (matrix mode)  
**Styles:** `MOCKUP_MAGNETIC_STYLES` (seat / edge / zone від Figma, `department` — blob)  
**Render:** `departmentStyle: 'blob'`, `magnetRadius: 1.5`, `minContourMembers: 1`, `staffZoneChrome: true`, `cell = refCell = 304×120`

### Що змінюється проти Staff · Figma
| Елемент | Staff · Figma | Staff · Magnetic |
|---|---|---|
| Департамент | прямокутна dashed-картка (T64) | **магнітний контур**: own cells з Manhattan ≤ 1.5 зливаються в одну компоненту, по одному blob на компоненту |
| Організація | dashed-зона | **суцільний блок** `#191f26` — містить лише свої ноди, чужі лишаються поза ним |
| Підпис відділу | top-right картки | top-right контуру (`department.labelAlign: 'right'`) |
| Sliders padding / smooth | вимкнені | **увімкнені** — керують paint контуру |

Сітка (локальна для кожного org-блоку):

```text
        col 0            col 1            col 2
row 0                    керівник
row 1   1-й заступник    заступник        нач. штабу
row 2   supply           people ·1        people ·2
```

Кластери: `exec` = 4 клітини (row 0 + row 1) → один контур; `people` = 2 сусідні → один; `supply` = одна клітина → свій.

⚠️ **Відоме розходження документів.** Paint-шлях малює «button-group contour» — округлений прямокутник навколо карток компоненти (`CONTEXT.md`, санкціонований полиш). `docs/REQUIREMENTS.md` §4.6.1 натомість відносить «Bounding box усіх pos dept» до «Що НЕ є контуром» і вимагає G2/M2 (обхід foreign з коридором). У цій сцені чужих посад усередині компонент немає, тож різниця не видно — але для сцени з foreign всередині bbox потрібен Rust-перiметр, не полиш.

---

## 4. Staff · GoJS

**Theme:** light (forced)  
**Styles:** `MOCKUP_GOJS_STYLES.person` + `staffZone` + `departmentCard`  
**Seat size:** portrait `136×156`  
**Render:** `staffZoneChrome: true`, `departmentStyle: 'blob'`, magnet contour (Variant B–like)

### Person tokens
| Token | Value |
|---|---|
| card bg/border | `#ffffff` / `#cbd5e1` / 1.5 / radius 10 |
| permanent name | `#0f172a` |
| temporary name | `#ea580c` |
| title | `#475569` |
| period chip | bg `#dcfce7` / text `#15803d` |
| vacant | `#64748b` |

### Zone / contour tokens
| Token | Value |
|---|---|
| zone fill | `#f8fafc` @ 0.85 |
| zone stroke | `#94a3b8` **solid** |
| zone label | left-aligned `#334155` |
| dept | **blob** wash (not card); padding/smooth sliders enabled |

### What must appear
| Element | Rule |
|---|---|
| Portrait seat | photo/initials top, name + title below |
| Temp name | orange when `isTemporary` |
| Period chip | green chip on acting window |
| Zones | solid (not dashed) |
| Dept grouping | magnetic blob contour (min 2 members) |
| Topology | keeps the original fixture (Lumen Holdings → Pacific Region → Current Business Unit) incl. the tier-3 expand-in-place demo. ⚠️ Затверджене правило «same people/topology as Staff · Figma, only chrome differs» **більше не діє**: Staff · Figma перебудовано під кадр 1264:7906, тож дві сцени тепер розходяться навмисно |

---

## Відкладено (не блокує роботу з табами)

**Візуальні бейзлайни Playwright.** Після редизайну Figma-табів, зміни роутингу ребер і нового таба Staff · Magnetic усі 5 знімків у `e2e/mockups.spec.ts-snapshots/` (`mockup-orgs-figma`, `mockup-orgs-gojs`, `mockup-staff-figma`, `mockup-staff-magnetic`, `mockup-staff-gojs`) застарілі, і `mockup-staff-magnetic-linux.png` ще не існує. Перегенерувати **на Linux** (macOS дає інші шрифти):

```bash
npx playwright test e2e/mockups.spec.ts --update-snapshots
npm run compare:nodes   # галерея work/tasks/node-compare/ — теж Linux-артефакт
```

До того часу CI-джоба `e2e` на цих тестах червона; решта (typecheck, unit, решта e2e) зелена.

---

## Cross-cutting rules (all four)

1. **No military / tactical naming** in labels, titles, or symbols.  
2. Mockup tabs **pin theme** (Figma→dark, GoJS→light); user theme toggle still reloads but tab re-entry re-pins.  
3. Symbol URLs are inline SVG data-URIs (letter tiles) or demo PNG — no external mil assets.  
4. Style correction loop: change tokens in `MOCKUP_FIGMA_STYLES` / `MOCKUP_GOJS_STYLES` or the display rules above, then re-check the matching tab.

---

## Change log

| Date | Action |
|---|---|
| 2026-08-23 | Draft issued for review |
| 2026-08-23 | **Approved** — proceed with demo + contract tests |
| 2026-08-25 | Жести: зум лише на `Ctrl`/`⌘` + scroll (та pinch), звичайний scroll панорамує; `Shift`+click — мультивибір із bulk bar у демо. |
| 2026-08-25 | Код-рев'ю (Standards + Spec): прибрано мертвий `hasPeriodTooltip`, сигнатури edge-view зведені до одного `EdgeStyle`, `paintDashedFrame` тепер малює пунктир по скругленому периметру, sibling-рамка керується явним `orgSiblingGroupStyle`, `orgTreeChrome: false` на Orgs · Figma, layout-константи табів мають одне джерело. |
| 2026-08-25 | Повернуто пунктирний звʼязок «заступник керуючої org → керівник поточної» на Staff · Figma (і в магнітну копію) — окремо від SPEC-івського cross-tier. |
| 2026-08-25 | Додано таб **Staff · Magnetic** — копія сцени Staff · Figma з pre-T64 семантикою: департамент = магнітний контур, організація = блок-зона без чужих нод. |
| 2026-08-24 | Connectors reworked to the frames: `NodeTheme.edge` (color / width / corner radius / dot terminator), ports docked on the Figma seat's avatar tile, and cross-tier routes now respect obstacles — staff census dirty 5 → 0. |
| 2026-08-24 | Staff · Figma scene re-shaped to frame `1264:7906`: managing tier now carries a command department (SDK tier 1 = head + direct reports, SPEC §2.2), current tier = command department + two service departments in one row; tier-3 expand demo moved to Staff · GoJS. |
| 2026-08-24 | Figma tabs re-synced to frames `1264:7906` / `1264:8121`: chrome-less seats, 234×110 org cards, `#222222` canvas, `#a6a6a6` connectors, dashed sibling frame back on. Rule 1 (no military naming) keeps the civilian fixture — the frames' Ukrainian military labels are **not** copied into the demo data. |
