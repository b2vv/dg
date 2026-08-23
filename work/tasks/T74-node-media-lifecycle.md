# T74 — Node media lifecycle (lazy load + hot refresh)

**Пріоритет:** P0 (M1–M3) / P1 (M4–M6)  
**Статус:** design agreed · skeleton in progress  
**Базис:** `dg@805efee` · еталон: `cassiopeia-admin-ui@gamma`  
**Grilling:** 2026-08-23 (Q1–Q29 closed)

---

## 0. Контракт host ↔ SDK

| Шар | Відповідальність |
|-----|------------------|
| **Host** | байти (HTTP, IndexedDB LRU, `blob:`, cross-tab invalidation) |
| **SDK** | текстури (load, cache, LOD, GPU release, hot refresh, placeholders) |

Персистентність у SDK **не** додаємо.

---

## 1. Термінологія (Q25 · Q27–Q29 closed)

| Термін | Значення в `dg` сьогодні | У T74 |
|--------|--------------------------|-------|
| **`NodeVisualKind`** | `organization` \| `department` \| `person` \| `position` — тип **вузла на canvas** | без змін |
| **`entityType`** | **немає** | вільний `string` з хоста: `military`, `civilian`, **`group`**, … — **підтип org-сутності** + ключ **placeholder SVG** |
| **`DiagramGroup`** | запис у `data.groups[]`; caption на org-картці (`groupIds[0]` → **name text**) | **caption-only** (`id`, `name`); без `media` / `emblemUrl` (Q29) |
| **`groupIds[]` на org** | посилання на групу для **підпису**, не зона | без змін у T74 |
| **T61 group zone** | рекурсивна **зона** tier-3 (майбутнє) | **не** T74 |

**Ризик плутанини:** слово «group» = (a) `entityType: 'group'` — підтип org, (b) `DiagramGroup` — caption record, (c) T61 zone — майбутня зона. T74 закриває (a)/(b); (c) лишається T61.

### 1.1 Рішення (Q27–Q29)

| # | Питання | Відповідь |
|---|---------|-----------|
| **Q27·A** | Що таке `entityType: 'group'`? | **Підвид org-сутності** (taxonomy), не окремий `NodeVisualKind`. Org з `entityType: 'group'` — звичайний org-вузол на canvas. |
| **Q28** | Де малюється symbol/emblem для group-org? | **Як symbol org-ноди** — `DiagramOrganization.media` + той самий `MediaService` / `applySymbol()`, що для `military` / `civilian`. Окремого paint path для `DiagramGroup` немає. |
| **Q29** | `DiagramGroup.emblemUrl` / `DiagramGroup.media`? | **Не розширюємо.** Caption record лише `id` + `name`. Медіа — на org (`media` + `entityType: 'group'`). Legacy `emblemUrl` deprecated; новий код не використовує. |

**Наслідок для M1:** group-org проходить той самий org media pipeline; placeholder key = `entityType` (`group` або host override).

---

## 2. Модель даних

### 2.1 `ThemedMedia` (канон)

```ts
interface ThemedMedia {
  /** Fallback for any themeKey missing in byTheme. */
  fallback?: string;
  byTheme?: Record<string, string>;
  /** Cache-bust when bytes change under same URL (M2). */
  revision?: string | number;
}
```

### 2.2 Поля на сутностях

| Сутність | Нове поле | Legacy (deprecated, `media` wins) |
|----------|-----------|----------------------------------|
| `DiagramOrganization` | `media?: ThemedMedia`, `entityType?: string` | `symbolUrl`, `symbolUrlLight`, `symbolUrlDark` |
| `DiagramPerson` | `media?: ThemedMedia`, `entityType?: string` | `photoUrl` |
| `DiagramPosition` | `media?: ThemedMedia`, `entityType?: string` | — |
| `DiagramGroup` | id, name only (caption) | `emblemUrl` **deprecated** — use org `media` + `entityType: 'group'` (Q29) |

### 2.3 Теми (Q9·A)

- `themeKey: string` — довільний (`light`, `dark`, `high-contrast`, …).
- Active key з діаграми після resolve `auto`.
- Resolve: `byTheme[themeKey] ?? fallback ?? undefined`.

### 2.4 Legacy bridge (Q19·C, **deprecated**)

`resolveThemedMediaFromOrg/Person/Group/Position` — map legacy URLs → `ThemedMedia`; `@deprecated` use `media` on entity.

---

## 3. `MediaService` (per diagram, Q11·A)

Instance on `OrgHierarchyDiagram`; public via `diagram.media`.

### 3.1 Cache key

```
${url}::${revision ?? 0}
```

Pixi `Assets`: unload by **raw URL** on invalidate (Assets unaware of revision).

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

### 3.3 Placeholders (Q15·B, Q16 entityType, Q17·C, Q20·A)

```ts
type MediaPlaceholderKind = 'loading' | 'error' | 'far';

placeholders: Record<string /* entityType | 'default' */, Partial<Record<MediaPlaceholderKind, string>>>
```

- **Org/position:** SDK default SVG data-URIs; host override per `entityType`.
- **Person:** defaults → **initials**; optional SVG override per `entityType`.
- **Loading:** show immediately (Q20·A), swap to texture or error.
- **Far LOD (M6/Q4·A):** skip network load; show `far` placeholder (Q14).

### 3.4 Invalidate flow (M1, Q6·C)

1. `cache.delete` all keys with URL prefix + `Assets.unload(url)`
2. Find live views bound to URL → `applyMedia()` / `applySymbol()` / `applyPhoto()`
3. Fallback: `DiagramRenderer.render()` if view not found

### 3.5 Destroy (M3)

Track URLs loaded by **this** instance → unload on `destroy()`; do not touch other diagrams.

### 3.6 Blob / revoked URL (M5, Q7)

One attempt → cache failure → error placeholder; no retry/prefetch requeue.

---

## 4. Milestones

| ID | Pri | Опис |
|----|-----|------|
| **M1** | P0 | Dual cache invalidate + point sprite refresh |
| **M2** | P0 | `ThemedMedia.revision` in cache key + invalidate API |
| **M3** | P0 | `destroy()` owned URL cleanup |
| **M4** | P1 | Default prefetch via `prefetchMediaThemeKeys` (Q12·B) |
| **M5** | P1 | Docs: host revoke after `destroy()` |
| **M6** | P1 | Far LOD skip load + far placeholder |
| **M7** | — | Out of scope (viewport prefetch) |

**Не в T74:** `patchNode` general chrome → **T75** (Q1b·C).

---

## 5. Acceptance

- [ ] `invalidate(url)` clears SDK map + Pixi Assets; sprite updates without `setData`
- [ ] Same URL + new `revision` → new load
- [ ] `destroy()` → instance cache empty; second diagram unaffected
- [ ] Theme flip with `prefetchMediaThemeKeys: ['light','dark']` → no network
- [ ] Far LOD: no `loadTexture` for org symbol
- [ ] Revoked blob → one fail, error placeholder
- [ ] Loading/error/far placeholders per `entityType` (+ `default`)
- [ ] `npm run typecheck`, `npm test`, `npm run test:verify`

---

## 6. Не робити

- IndexedDB / persistent cache in SDK
- Change URL allowlist (`blob:` stays)
- Remove person photo LOD gate at `near`
- T61 group zone paint (until mockup)
- M7 viewport prefetch
- `DiagramGroup.emblemUrl` / `DiagramGroup.media` — **не розширювати**; org `media` only (Q29)

---

## 7. Verify

```bash
npm run typecheck
npm test
npm run test:verify
```

---

## 8. Related

- [T73](./T73-remaining-agreements.md) E11 prefetch
- [T61](./T61-group-recursion-tier3.md) group zones (окремо від `entityType: 'group'`, Q27)
- Host brief: media lazy + hot update (2026-08-23)
