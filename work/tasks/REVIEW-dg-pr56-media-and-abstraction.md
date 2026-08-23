# REVIEW — PR #56 media (`MediaService`) + abstraction risks

**Базис:** `cursor/t74-media-service-skeleton-babc` поверх `805efee`  
**Контекст:** [T74](./T74-node-media-lifecycle.md) · [architecture brief](../tech-debt/REVIEW-dg-805efee-architecture.md) D6  
**Статус:** defects accepted · remediation in T74 M0/M1

---

## Критичні дефекти скелета (P0 для M1)

### M-A 🔴 Потрійний кеш — третій не скидaється і роздає знищену текстуру

Шари:

1. `MediaService.instanceCache` — `Map<key, Promise<Texture|null>>`
2. **Глобальний** `nodeMedia.ts` `cache` — той самий URL без revision
3. Pixi `Assets` — cache by raw URL

`MediaService.invalidate` чистить (1) і кличе `Assets.unload` (3), але **не** чистить (2).
Після unload Promise у (2) лишається і наступний `loadNodeTexture(url)` повертає
**знищену** `Texture`.

**Fix:** `evictNodeTextureCache(urls)` у `nodeMedia`; `invalidate` / `destroy` обовʼязково
кличуть її. Довгостроково — єдиний load path через `MediaService` (ноди не кличуть
`loadNodeTexture` напряму).

### M-B 🔴 `revision` не доходить до завантажувача

`loadTexture(url, revision)` ключує instance cache як `url::rev`, але кличе
`loadNodeTexture(trimmed)` **без** revision → global Map віддає стару текстуру для того ж URL.

**Fix:** `loadNodeTexture(url, revision?)` з тим самим `mediaCacheKey`; при зміні revision
під тим самим URL — спочатку `invalidate(url)` (unload Assets), потім load.

Правило ключа (узгоджено): завжди `${url}::${revision ?? 0}` (absent ≡ `0`).

### M-C 🔴 `ownedUrls` не дає виключного володіння

Дві діаграми → спільні Assets + global Map. `diagramA.media.destroy()` робить
`Assets.unload` URL, які ще показує `diagramB` → зламані спрайти / GPU use-after-free.

**Fix:** refcount per URL у `nodeMedia` (`acquire` / `release`). `destroy` лише
`release`; unload Assets + evict лише коли лічильник → 0.

---

## Major (P1)

| ID | Проблема | Fix |
|----|----------|-----|
| M-D | Middle Man: ноди ще кличуть `loadNodeTexture` | M1: org/person → `diagram.media.loadTexture` |
| M-E | `resolveThemedMediaFromLegacy` duck typing | прибрати або звузити; entity-specific only |
| M-F | `refresh(ref)` stub | реалізувати: resolve media → invalidate URLs → point sprite update |
| M-G | Fallback `DiagramRenderer.render()` після invalidate | **заборонено** як primary path (див. D1); лише emergency |

---

## Звʼязок з D1/D2/D3

Hot refresh **не** повинен кликати повний `render()`. Point update спрайта
(`applySymbol` / `applyPhoto`) — єдиний прийнятний M1 шлях. Повний rebuild лишається
для `setData` / layout (після T75 — `rebuild()`).

---

## Acceptance (додатково до T74 §5)

- [ ] `invalidate(url)` чистить instance + **global** `nodeMedia` cache + Assets
- [ ] Після `Assets.unload` жоден cache hit не повертає ту ж Texture-інстанцію
- [ ] `loadTexture(url, 2)` після `loadTexture(url, 1)` вантажить заново (не global hit v1)
- [ ] Дві діаграми з тим самим URL: `destroy()` першої **не** unload-ить, поки друга жива
- [ ] Ноди org/person не імпортують `loadNodeTexture` для production path (тести — ok)
