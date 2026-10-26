# Report — спліт dg: T1 + T0 + T2 (2026-10-25)

**Репо:** `~/projects/dg`, гілка `bulk-mutations`. База сесії `a54468…`(admin-ui)/`fe48991`(dg) → HEAD dg **`17b237e`**.
**Дельта до плану:** постановка `diagram-hierarchy/…/2026-10-25 dg — спліт на 4 міні-бібліотеки` §20 (T0–T6).
Пройдено plan-defense (§19, 0 дірок). Це звіт про перші 4 кроки; код push-hold знято лише на них (owner go).

## 1. Зроблено (4 коміти, кожен writer=Claude + 2 незалежні рев'ювери Cass rev/Cass 1)
- **`1a34034` T1** — фокусний коміт Ф1 per-node w×h у #1 layout (канал `OrgFlatInput.width/height`→tidy; `positionSize` з geom-fallback) + gap#6 sibling-order (`org_tree .rev()`), за owner-рішенням «разом». Проба parent-centering, packaging(0.6.0), .ai/ — свідомо поза комітом (лишились у дереві).
- **`f67731c` T0** — `renderNow` (138 LOC/25 `this`) → тонкий orchestrator (18 рядків) + 5 приватних методів (`applyRenderTheme`/`bindCanReparent`/`captureDrawingState`/`buildRenderOptions:RenderOptions`/`afterRender`). 0 зміни поведінки.
- **`19e865b` T2a** — ORG-layout compute піднято з `DiagramRenderer` у фасад (#4). `render()` +6-й param `orgLayoutResult?`; fallback-compute лишається для renderer-direct callerів.
- **`17b237e` T2b** — STAFF-layout compute піднято у #4. Новий `render/staffLayoutInputs.ts` (спільний source: `resolveStaffZoneStyle`[перенесено]/`resolveStaffCurrentOrgId`/`buildStaffLayoutOptions`); `render()` +7-й param `staffCanvasResult?`; fallback-compute лишається.

**Наслідок T2:** шов render→layout (×32) розрізано для ОБОХ гілок — рендер приймає вже позиціоноване. Передумова T3 (renderer-інтерфейс) виконана. In-renderer compute лишається ТРАНЗИЦІЙНИМ fallback (прибирається пізнішим cut, коли всі caller'и передають).

## 2. Протестовані сценарії (гейти — writer сам, не на віру)
- Повний `npx rstest run`: T0 1121/0 → T2a 1122/0 (+T97 compute-throw тест) → T2b **1128/0** (+6 unit staffLayoutInputs).
- `npx tsc -p tsconfig.check.json` 0 на кожному кроці; `oxlint` 0; `cargo test` (core) 25/0 незмінний (Rust не чіпали після T1).
- **Контрольні проби живого шва (а не лише зелений suite):**
  - T2a: саботаж переданого `orgLayoutResult.nodes=[]` → 3 org-тести червоніють (рендер споживає переданий, fallback не маскує).
  - T2b: саботаж `staffCanvasResult.positionNodes=[]` → 15 staff-тестів червоніють.
  - T2b unit-замок: band=`options.zoneLabelBand` → падає рівно override-тест.
  - T0: highlight.test «facade request deferred to renderNow tail» зелений (сторож хвоста).

## 3. Неочевидні знахідки
- **T2a — Cass 1 упіймав BLOCKING, якого Cass rev не побачив:** перенесений compute опинився ПОЗА `reportIfRenderFails` → `computeOrgLayout`-throw (`validateOrgHierarchy`: дубль/цикл/unknown root) обминав би публічний T97-контракт `onRenderFailed`/`getLastRenderFailure`. Підтверджено по коду, виправлено (compute+render у ОДНОМУ promise під обгорткою), + регресійний тест (control: без фіксу падає рівно він). **Урок: два незалежні рев'ювери виправдані — одна лінза проґавила error-path.**
- **T2b zoneLabelBand-пастка:** `lastZoneLabelBand` = band ОБЧИСЛЕНИЙ ДО spread `...staff.layout`, а `staffOpts.zoneLabelBand` міг бути перекритий. Наївний extract зрівняв би їх → тиха регресія лише коли `staff.layout.zoneLabelBand` заданий (жоден інтеграційний тест не покриває). `buildStaffLayoutOptions` повертає обидва окремо; unit-замок пінить асиметрію.
- **T2b divergence-ризик:** staffOpts/currentOrgId у фасаді мусять бути ІДЕНТИЧНІ рендеровим, інакше pre-computed canvas і renderer-geom (dragGrid/insets) розійшлися б. Рішення: спільний модуль (один source), не дубль. svgExport має власну (іншу) currentOrgId-логіку — НЕ брали її.

## 4. Ризики / обмеження
- **In-renderer fallback compute лишається** (org+staff) — технічно залежність render→layout (import) ще є; повний різ ×32 завершиться пізнішим cut, коли всі caller'и (включно з тестами, що кличуть render() напряму) передаватимуть результат. Свідомий транзиційний стан, не борг.
- Робоче дерево dg містить НЕ-split зміни (проба parent-centering `orgBlockLayout.ts`+`_recenterProbe.test.ts`, packaging `package.json` 0.6.0, `.gitignore`/`AGENTS.md`) — лишені поза всіма 4 комітами, у дереві. Їх доля — окреме рішення власника.
- Нічого не запушено; гілка локальна. T3+ ще попереду (renderer-інтерфейс, #2 DOM, LOD-switch, boundary-gate) — найбільший ризик/greenfield у T4 (#2 DOM + віконність + калібр-гейт).

## 5. Наступні кроки (§20)
- **T3** — RendererPort: винести камеру з `render/Viewport.ts` у #4; `DiagramRenderer` реалізує порт; фасад кличе через порт; `InteractionInput` driving-port (Observer). Спец ще не писана.
- Потім T4 (#2 DOM віконний + classHeight + Playwright калібр-гейт), T5 (#4 LOD-switch zoom-T+гістерезис + T119), T6 (boundary-gate + контракт-тести + CHANGELOG/мажор).

## 6. Процес
Writer=Claude(opus) — codex-субагент заблокований сандбоксом admin-ui на запис у `~/projects/dg` (дві спроби: safeguard Sonnet, тоді permission). Owner обрав «я writer + рев'ю Cass 1/Cass rev». Кожна знахідка рев'ювера перевірена по коду перед прийняттям. Спеки кроків — `work/reports/library-split-4/T0-*.md`, `T2-*.md`, `T2b-*.md`; recon — `_wip-*-recon.md`; рев'ю — `_wip-*-review-*.md`.
