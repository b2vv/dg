# Бриф по коду `dg` (architecture review)

**Базис:** `b2vv/dg@805efee` (`main`) · **Обсяг:** `packages/sdk/src` + `packages/core/src`  
**Дата brief:** 2026-08-23 · **Статус remediation:** ✅ D1–D7 closed (2026-08-23)  
**Деталі:** [T74](../archive/tasks-2026-09-02.md) · [T75](../archive/tasks-2026-09-02.md) · [T76](../archive/tasks-2026-09-02.md) · [Pocock/GoF](../archive/tasks-2026-09-02.md)

---

## Scorecard

| ID | Було | Статус |
|----|------|--------|
| D1 | full rebuild на select | ✅ `repaintSelection`; LOD/theme rebuild by design (edge ports) |
| D2 | parallel `render` race | ✅ `createRenderCoalesce` + `renderEpoch` |
| D3 | views never destroyed | ✅ `LayerManager.clear` destroy children |
| D4 | god-object `index.ts` | ✅ SelectionStore + ViewStateStore + DataStore |
| D5 | orphan under head | ✅ documented ([D5](./D5-orphan-position-layout.md)) |
| D6 | MediaService defects | ✅ T74 M0–M6 / PR56 review |
| D7 | contextmenu / dead export | ✅ PixiHost detach; `orgsToSingleRootTree` `@deprecated` |

---

## 1. Що зроблено добре (не чіпати)

| Місце | Чому добре |
|---|---|
| `Viewport.ts` | detach* + destroy |
| `nodeMedia.ts:isAllowedNodeMediaUrl` | allowlist; `blob:` ok |
| `PersonNode` photo LOD gate | near only |
| `spineBusEdges.ts` | spine-bus default |
| `packages/core` | Rust/WASM + cargo test |
| `interaction/selection.ts` | pure set ops |
| `worker/` | pool `dispose()` |

## 5. Чого не робити (досі актуально)

- Не додавати персистентний кеш зображень у SDK
- Не прибирати LOD-гейт фото
- Не міняти `spine-bus`
- Не чіпати `Viewport` lifecycle
