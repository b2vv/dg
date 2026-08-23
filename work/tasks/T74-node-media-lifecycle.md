# T74 — Node media lifecycle (lazy load + hot refresh)

**Пріоритет:** P0 (M0–M3) / P1 (M4–M6)  
**Статус:** design agreed · skeleton remediating D6  
**Базис:** `dg@805efee` · еталон: `cassiopeia-admin-ui@gamma`  
**Grilling:** 2026-08-23 (Q1–Q29 closed)  
**Арх. review:** [REVIEW-dg-805efee](../tech-debt/REVIEW-dg-805efee-architecture.md) D6 · [PR56 media review](./REVIEW-dg-pr56-media-and-abstraction.md)

**Паралельно з [T75](./T75-rebuild-vs-repaint.md)** (D2→D1+D3). M1 **не** кличе повний `render()`.

---

## 0. Контракт host ↔ SDK

| Шар | Відповідальність |
|-----|------------------|
| **Host** | байти (HTTP, IndexedDB LRU, `blob:`, cross-tab invalidation) |
| **SDK** | текстури (load, cache, LOD, GPU release, hot refresh, placeholders) |

Персистентність у SDK **не** додаємо (brief §5).

---

## 1. Термінологія (Q25 · Q27–Q29 closed)

| Термін | Значення в `dg` сьогодні | У T74 |
|--------|--------------------------|-------|
| **`NodeVisualKind`** | `organization` \| `department` \| `person` \| `position` | без змін |
| **`entityType`** | **немає** | підтип org + ключ placeholder (`military` \| `civilian` \| **`group`** \| …) |
| **`DiagramGroup`** | caption на org (`groupIds[0]` → name) | **caption-only**; без media (Q29) |
| **`groupIds[]` на org** | підпис, не зона | без змін |
| **T61 group zone** | рекурсивна зона | **не** T74 |

### 1.1 Рішення (Q27–Q29)

| # | Відповідь |
|---|-----------|
| **Q27·A** | `entityType: 'group'` = **підвид org**, не окремий visual kind |
| **Q28** | Symbol на **org-ноді** через `org.media` + той самий `MediaService` |
| **Q29** | `DiagramGroup` = `id`+`name`; legacy `emblemUrl` deprecated |

---

## 2. Модель даних

### 2.1 `ThemedMedia`

```ts
interface ThemedMedia {
  fallback?: string;
  byTheme?: Record<string, string>;
  revision?: string | number;
}
```

### 2.2 Поля

| Сутність | Нове | Legacy (`media` wins) |
|----------|------|------------------------|
| `DiagramOrganization` | `media?`, `entityType?` | `symbolUrl*` |
| `DiagramPerson` | `media?`, `entityType?` | `photoUrl` |
| `DiagramPosition` | `media?`, `entityType?` | — |
| `DiagramGroup` | id, name | `emblemUrl` deprecated |

### 2.3 Теми (Q9·A)

`themeKey: string`; resolve: `byTheme[themeKey] ?? fallback`.

---

## 3. `MediaService` (per diagram)

Public: `diagram.media`.

### 3.0 D6 remediation (M0 — обовʼязково до/разом із M1)

| ID | Дефект | Fix |
|----|--------|-----|
| **M-A** | Global `nodeMedia` cache не чиститься → destroyed Texture | `evictNodeTextureCache` з `invalidate`/`release` |
| **M-B** | `revision` не в loader | `loadNodeTexture(url, revision)`; ключ завжди `url::${revision??0}` |
| **M-C** | `ownedUrls` без exclusive ownership | refcount `acquire`/`release`; unload лише при 0 |

Єдиний production load path після M1: **`diagram.media.loadTexture`**. Прямий `loadNodeTexture` у нодах — прибрати.

### 3.1 Cache key

```
${url}::${revision ?? 0}
```

Pixi `Assets`: unload by **raw URL** (Assets unaware of revision). Зміна revision → invalidate URL → load.

### 3.2 API (P0)

```ts
interface DiagramMediaFacade {
  resolveUrl(media: ThemedMedia | undefined, themeKey: string): string | undefined;
  loadTexture(url: string, revision?: string | number): Promise<Texture | null>;
  invalidate(url: string | readonly string[]): Promise<void>;
  refresh(ref: NodeRef): Promise<void>;
  prefetchThemeKeys(keys: readonly string[]): void;
  destroy(): Promise<void>;
}
```

### 3.3 Placeholders (Q15·B, Q17·C, Q20·A)

`loading` \| `error` \| `far` keyed by `entityType` + `default`.  
Person defaults → initials. Far LOD (M6): skip load, show `far`. **Не** прибирати person `near` gate (`PersonNode.ts:273`).

### 3.4 Invalidate / hot refresh (M1)

1. instance cache delete + **global evict** + `Assets.unload` (через refcount release→0 або force invalidate)
2. Live views → `applySymbol` / `applyPhoto` (**point update**)
3. **Заборонено** як primary: `DiagramRenderer.render()` / full rebuild (D1). Emergency only.

### 3.5 Destroy (M3)

`release` усіх URL цього інстансу; unload+evict лише якщо refcount = 0 (інші діаграми живі).

### 3.6 Blob / revoked (M5, Q7)

One attempt → failure cached → error placeholder; no retry storm.

---

## 4. Milestones

| ID | Pri | Опис |
|----|-----|------|
| **M0** | P0 | D6 fix: evict global + revision in loader + refcount ownership |
| **M1** | P0 | Nodes → `diagram.media`; invalidate + point sprite refresh |
| **M2** | P0 | revision end-to-end (covered largely by M0; API polish) |
| **M3** | P0 | `destroy()` via refcount |
| **M4** | P1 | `prefetchMediaThemeKeys` (Q12·B) |
| **M5** | P1 | Docs: host revoke after `destroy()` |
| **M6** | P1 | Far LOD skip load + far placeholder |
| **M7** | — | Out of scope |

**Не в T74:** general chrome `patchNode` → окремо після T75; god-object → T76.

---

## 5. Acceptance

- [ ] M-A/B/C з [PR56 review](./REVIEW-dg-pr56-media-and-abstraction.md)
- [ ] `invalidate(url)` → instance + global + Assets; sprite update **without** `setData` / full render
- [ ] Same URL + new `revision` → new load
- [ ] Two diagrams, same URL: destroy first ≠ unload while second holds
- [ ] Far LOD: no load for org symbol (M6)
- [ ] Revoked blob → one fail, error placeholder
- [ ] Placeholders per `entityType` (+ `default`)
- [ ] `npm run typecheck`, `npm test`, `npm run test:verify`

---

## 6. Не робити

- IndexedDB / persistent cache in SDK
- Change URL allowlist (`blob:` stays)
- Remove person photo LOD gate at `near`
- T61 group zone paint
- M7 viewport prefetch
- `DiagramGroup.media` / expand `emblemUrl`
- Full-scene `render()` as media refresh path (D1)

---

## 7. Verify

```bash
npm run typecheck
npm test
npm run test:verify
```

---

## 8. Related

- [T75](./T75-rebuild-vs-repaint.md) rebuild/repaint/queue (D1–D3)
- [T76](./T76-diagram-facade-stores.md) facade stores (D4)
- [T61](./T61-group-recursion-tier3.md) group zones ≠ `entityType: 'group'`
- [T73](./T73-remaining-agreements.md) E11 prefetch
