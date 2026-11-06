# Emphasis-зріз — EmphasisStore { found, highlight } — spec

**Статус:** spec РЕВ.2 (GATE-2 B1/B2 + scope). Гілка off main `565e7c6` (feat/emphasis-store). Джерело: ROADMAP
D1-деталь (emphasis окремий зріз), симетрія з D1 InteractionStore. Гейт: простіше за GoJS. GATE-1 — з D1-деталі + YAGNI.
**Рішення рев.2 (Open закрито):** зріз ВНУТРІШНІЙ (рефактор, без нового публічного API) → нижче порога. B1: highlight =
STRING-id, не NodeRef. B2: чищення на setData — БЕЗУМОВНЕ (як зараз), НЕ reconcile-з-утриманням.

## Проблема / межа
D1 формалізував **interaction** `{selected, hovered}` у `InteractionStore` (чистий, обидва шари підписані, публічна
`subscribeInteraction`). **Emphasis** `{found, highlight}` свідомо лишили окремим зрізом (D1-деталь: інший власник —
search/host-команда; лайфцикл — `setData` чистить). Зараз emphasis **функціонально працює, але розмазаний**:
`found` = `DiagramRenderer.foundFocus` (:250, dim :291/:1101) + фасад `setFoundFocus` (:1937) + `viewState.foundFocus`;
`highlight` = `viewState.highlightedNode` + `highlightPath` (:1930) → `repaintHighlight(highlightedNode, foundFocus)` (:1085)
→ `reportPath` акцент+dim. Обидва чистяться на `setData` (:1489/:1001). **Немає чистого store, єдиної підписки, і
auto-highlight не відділений від host-driven.**

## Що зріз РОБИТЬ / НЕ робить
- **РОБИТЬ:** чистий `EmphasisStore { found: ReadonlySet<string> | null, highlight: string | null }` (B1: highlight —
  STRING-id, бо ViewStateStore.highlightedNode:11 / highlightPath(nodeId: string):1930 / repaintHighlight(…: string):1085
  усі string, НЕ NodeRef): `setFound`/`setHighlight`/`clearEmphasis()`; фасад `setFoundFocus`/`highlightPath` делегують у
  store **і кличуть наявний `repaintHighlight` НАПРЯМУ** (KISS: emphasis-записи йдуть із фасаду — self-subscription не
  потрібна, на відміну від D1-hover, що походить із views). **auto-highlight (hover→related) = похідне на льоту**
  (`staffDimmedIds`, DiagramRenderer:285), НЕ поле store.
- **НЕ робить:** не змінює видиму поведінку emphasis (той самий dim/accent/foundDimAlpha); не зливає emphasis з
  InteractionStore (два власники, D1-деталь); не чіпає search-логіку (хто кладе `found` — search, лишається);
  **НЕ додає публічного API** (YAGNI — нема host-слухача emphasis; хост лише ПИШЕ setFoundFocus/highlightPath). Публічний
  `subscribeEmphasis` — окремий адитивний follow-on, коли зʼявиться слухач.

## User scenarios
1. Хост кличе `setFoundFocus(ids)` → emphasis-store `found` оновлено → обидва шари приглушують не-found (як зараз).
2. Хост кличе `highlightPath(id)` → store `highlight` → акцент admin-шляху + dim (як зараз).
3. `setData` → emphasis-store `clearEmphasis()` — БЕЗУМОВНО нулить found+highlight (B2: як зараз OrgHierarchyDiagram:1489-1490
   + render нулить foundFocus:1002; НЕ reconcile-з-утриманням — утримання вцілілих id = видима зміна в staff edit-mode).

## Acceptance (рев.2)
- AC1: `setFoundFocus`/`highlightPath` поведінка байт-у-байт (наявні тести/golden зелені; dim/accent/foundDimAlpha ті самі).
- AC2: emphasis у чистому `EmphasisStore` (found + highlight-STRING), не в розмазаному viewState; обидва шари читають звідти.
- AC3: `setData` → `clearEmphasis()` БЕЗУМОВНО нулить found+highlight (B2; НЕ утримує вцілілі id).
- AC4: emphasis ОКРЕМО від InteractionStore (D1 {selected,hovered} не містить found/highlight; два store).
- AC5: auto-highlight — похідне на льоту (staffDimmedIds), не збережене поле (нема десинку).
- AC6: 0 вартості в спокої; emphasis-зміна не робить повного rebuild понад наявний repaintHighlight; `found` — set-рівність
  (та сама множина → без зайвого repaint).

## Out of scope / closed
- search-логіка (джерело `found`) — не чіпаємо.
- ✅ Closed (рев.2): `subscribeEmphasis` НЕ публічний зараз (YAGNI — нема host-слухача; хост лише ПИШЕ). Публічний subscribe —
  окремий адитивний follow-on, коли зʼявиться слухач. Отже зріз ВНУТРІШНІЙ → нижче порога пайплайна (легкий інлайн).
