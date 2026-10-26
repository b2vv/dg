claude-opus-4-8

ДАЛІ: прочитати план T3a + код positionMove/types/ContourPainter/DiagramRenderer/OrgHierarchyDiagram/positionReparent/index. Фокус: 0-behavior, байт-незмінність публічного API, межа T3a-2/T3c, staging, InteractionError-цикл.

СТАН РЕПО: T3a-1 (словник A) ВЖЕ застосований у робочому дереві (uncommitted; core/nodeKey,nodeRefs,nodeTestId перенесені, core/types.ts+index.ts додані, A-сайти репойнтнуті). T3a-2 (drop-pipeline C) ЩЕ НЕ застосований: positionMove.ts цілий у interaction, InteractionError ще в interaction/types.ts:8. Критикую T3a-2 перед імплементацією.

ФАКТ (0-behavior ядра C):
- positionMove.ts — жодного module-level стану; resolveSeatDrop/applySeatDrop/isValidGridCell/movePositionToCell/sameCell/assertNever — чисті, залежать лише від DiagramPosition/GridCell (data/types) + InteractionError. Verbatim-перенос = 0 behavior. ✓
- projectedOccupantMove+assertNeverSeatDrop (ContourPainter:394-413) чисті; ContourPainter ВИКЛИКАЄ projectedOccupantMove внутрішньо (:328) → re-import з core коректний (render→core downward). План L109 вірний. ✓
- assertNever (positionMove:127 `${String(x)}`) vs assertNeverSeatDrop (ContourPainter:412 `${String((x as SeatDrop).kind)}`) — РІЗНІ рядки, але обидва на НЕДОСЯЖНОМУ (never) шляху вичерпних switch. Dedup у спільну = 0 observable behavior. План §4 L65 вірно: опційно. ✓

ФАКТ (цикл/подвійний споживач InteractionError):
- core/errors.ts (InteractionError) — leaf, extends Error, 0 deps. core/seatDrop імпортує з core/errors (intra-core). positionReparent.ts:2 + positionMove.ts:2 (shiftPositionBlock-залишок) імпортують InteractionError з core = downward. Жодного core→interaction. Циклу НЕМА. ✓
- grep core/ на upward — ПОРОЖНІЙ (T3a-1 чистий). ✓

ФАКТ (межа T3a-2 vs T3c):
- Залишаються в interaction/positionMove.ts: snapToGrid, snapWorldToCell, shiftPositionBlock, GridSnap. snap* — без moving-deps; shiftPositionBlock лише тягне InteractionError ВНИЗ у core. GridSnap локальний. Жоден не тягне moved-символів UPWARD. Межа чиста. ✓
- personInteractions.ts:3 імпортує snapToGrid/snapWorldToCell (stayers) — репойнт НЕ потрібен; план їх не перелічує, але це коректний no-op. (не gap)

ФАКТ (публічний API байт-незмінність §5):
- Символ-сет public src/index.ts: HEAD vs поточний = 240 vs 240, 0 розбіжностей (T3a-1 вже довів патерн). ✓
- Єдині moved-символи в ПУБЛІЧНОМУ барелі — movePositionToCell (:201) + InteractionError (:203), обидва у value-блоці `export {}` з './interaction/index.js'. SeatDrop/resolveSeatDrop/applySeatDrop/isValidGridCell у публічному барелі ВІДСУТНІ (внутрішні). Для T3a-2 репойнт лише цих двох на core = та сама назва, та сама value-форма → байт-незмінно. РИЗИК-дисципліни: лишити їх VALUE-експортом, не демотувати в `export type` (InteractionError = клас, instanceof/new; movePositionToCell = функція). Non-blocking.
- Line-drift плану (писаний до T3a-1): DiagramRenderer :54→реально :52; public :195/196/200→реально :201/203. Harmless, писарю перескан.
- callbacks.ts `SeatDrop`/`resolveSeatDrop` — лише в КОМЕНТАРЯХ + локальний тип `SeatDropChoice` (callbacks.ts:66). НЕ імпорт. Не gap.

🔴 BLOCKING (staging / §1 хибне твердження): InteractionError залишає types.ts (§0) І interaction/index.ts барель (§5 no-shim), але план пропускає/заперечує 3 тест-сайти, що імпортують InteractionError і ВИКОРИСТОВУЮТЬ його:
  1. render/OrgHierarchyDiagram.interactions.test.ts:4 `import { InteractionError } from '../interaction/index.js'` (8 вжитків). План §1 L119 ПРЯМО каже «НЕ імпортують moved-символи напряму ... репойнт не потрібен» — ХИБНО. §5 знімає InteractionError з барелю → TS2305, тест не компілюється.
  2. interaction/positionMove.test.ts:4 `import { InteractionError } from './types.js'` (3 вжитки). План §1 L116 перелічує лише 3 seatDrop-символи, InteractionError-рядок пропущено.
  3. interaction/positionReparent.test.ts:10 `import { InteractionError } from './types.js'` (3 вжитки). Файл у плані ВІДСУТНІЙ.
  Наслідок: §6 «T3a-2 самодостатній і зелений окремо» НЕ виконується як написано — 3 тести падають на typecheck. interaction.test.ts:6 — покрито (§1 L117). Фікс дешевий: репойнт 3 сайтів на core АБО лишити shim `export { InteractionError } from '../core/index.js'` у interaction/index.ts. Але має бути усунено/визнано ДО імплементації → гейт ЧЕРВОНИЙ.

ВЕРДИКТ: архітектура T3a-2 витримує (0-behavior, no-cycle, чиста межа, байт-незмінний публічний API); 1 BLOCKING на повноті staging (3 пропущені InteractionError-репойнти, одне хибне твердження §1 L119).
