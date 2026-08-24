# T74 — Node media lifecycle (lazy load + hot refresh)

**Пріоритет:** P0 (M0–M3) / P1 (M4–M6)  
**Статус:** ✅ done  
**Базис:** `dg@805efee` · еталон: `cassiopeia-admin-ui@gamma`  
**Grilling:** 2026-08-23 (Q1–Q29 closed)  
**Арх. review:** [REVIEW-dg-805efee](../tech-debt/REVIEW-dg-805efee-architecture.md) D6 · [PR56](./REVIEW-dg-pr56-media-and-abstraction.md) · [Pocock/GoF](./REVIEW-t74-t76-pocock-gof.md)

---

## 0. Контракт host ↔ SDK

| Шар | Відповідальність |
|-----|------------------|
| **Host** | байти (HTTP, IndexedDB LRU, `blob:`, cross-tab invalidation) |
| **SDK** | текстури (load, cache, LOD, GPU release, hot refresh, placeholders) |

Персистентність у SDK **не** додаємо.

---

## 1. Термінологія (Q27–Q29)

- `entityType: 'group'` = підтип org; symbol на org-ноді через `org.media`
- `DiagramGroup` = caption-only; `emblemUrl` deprecated

---

## 2–3. Модель + MediaService

Див. код: `packages/sdk/src/media/*`, `diagram.media`.

Cache key: `${url}::${revision ?? 0}`. Refcount ownership. Point refresh via `reloadMedia`.

---

## 4. Milestones

| ID | Статус |
|----|--------|
| M0 D6 cache/revision/refcount | ✅ |
| M1 load path + point invalidate | ✅ |
| M2 revision keys | ✅ |
| M3 destroy refcount | ✅ |
| M4 prefetchMediaThemeKeys | ✅ |
| M5 host revoke docs (§3.6) | ✅ |
| M6 far LOD skip symbol load | ✅ |
| M7 viewport prefetch | out of scope |

---

## 5. Acceptance

- [x] M-A/B/C (evict global, revision in loader, refcount)
- [x] `invalidate` → point sprite update without full render
- [x] Same URL + new revision → new load
- [x] Two diagrams: destroy first ≠ unload while second holds
- [x] Far LOD: no load for org symbol
- [x] Placeholders: `DEFAULT_MEDIA_PLACEHOLDERS` (`default` + host merge)
- [x] Host blob revoke documented (§3.6 / M5)
- [x] typecheck + unit tests (verify у CI)

Revoked-blob retry storm: one fail → null texture → caller placeholder (no requeue).

---

## 6. Не робити

- IndexedDB in SDK · remove person near LOD gate · T61 zones · DiagramGroup.media · full render as media refresh

## 8. Related

[T75](./T75-rebuild-vs-repaint.md) · [T76](./T76-diagram-facade-stores.md) · [T61](./T61-group-recursion-tier3.md)
