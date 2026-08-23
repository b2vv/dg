# REVIEW — T74–T76 vs Matt Pocock + GoF / CODING_STANDARDS

**Дата:** 2026-08-23  
**Обсяг:** `media/`, `state/`, `render/renderCoalesce.ts`, `DiagramRenderer` D1–D3, `OrgHierarchyDiagram` wiring  
**Канон:** [CODING_STANDARDS.md](../CODING_STANDARDS.md) §1b Pocock · §6 GoF · §9 DoD

---

## Вердикт

**Pass** після remediation у цьому коміті. Критичних порушень Dependency Rule / `any` / нових `enum` немає.

---

## Pocock (Total TypeScript)

| Правило | Статус | Нотатка |
|---------|--------|---------|
| Library export + explicit types | ✅ | `DiagramMediaFacade`, store public methods typed; `RenderCoalesce` named type |
| Без `any` / `@ts-ignore` | ✅ | у зачеплених файлах |
| Без `enum` | ✅ | LOD лишається string union |
| `import type` | ✅ | media/types, stores |
| Уникати duck `as` | ✅ | **прибрано** `resolveThemedMediaFromLegacy` (M-E) |
| `satisfies` / inference | ✅ | placeholders const object |
| Singular type names | ✅ | `ThemedMedia`, `SelectionStore` |

## GoF / SOLID / KISS

| Патерн / принцип | Застосування | Ок? |
|------------------|--------------|-----|
| **Facade** | `OrgHierarchyDiagram` + `diagram.media` | ✅ |
| **Strategy** | `loadTexture` inject у node views | ✅ |
| **Observer** | `SelectionStore.onChange`, `onInvalidateViews` | ✅ (прості callbacks, не EventEmitter) |
| **Null Object / defaults** | `DEFAULT_MEDIA_PLACEHOLDERS` | ✅ |
| **Scheduler (coalesce)** | `createRenderCoalesce` — не Command bus | ✅ KISS |
| **SRP** | stores винесені з god-object (D4) | ✅ |
| Не Singleton global texture | refcount + per-diagram `MediaService` | ✅ |

## Закриті дефекти review

- M-A/B/C (triple cache / revision / ownership) — T74 M0  
- M-E duck legacy — removed  
- D1 selection hot path — `repaintSelection`  
- D2 race — coalesce + epoch  
- D3 GPU leak — layer destroy  
- D4 stores — T76  
- D5 documented · D7 contextmenu detach + `orgsToSingleRootTree` `@deprecated`

## Свідомий residual (не блокує DoD)

- LOD/theme → full `render()` (edge ports / palette). Selection не rebuild. Див. T75.
- Placeholders SVG ще не малюються як live sprite UX на кожному load — registry + `getPlaceholder` готові для host/M later paint.

## DoD checklist (§9)

- [x] success + failure тести (media, coalesce, stores, D1 select, far skip)
- [x] Dependency Rule: domain `data/types` ← media types; render не в data
- [x] немає `any` / `@ts-ignore`
- [x] немає нового `enum`
- [x] публічний media API з типами
- [x] god-object зменшено stores
- [x] GoF лише під наявну проблему (2+ споживачі / race / ownership)
