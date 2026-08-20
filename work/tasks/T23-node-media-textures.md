# T23 — Node media (photo / org symbol textures)

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** T01 Pixi renderer ✅, T13 LOD ✅

---

## Goal

Render `photoUrl` on person cards (near LOD) and theme-resolved org `symbolUrl*` as Pixi sprites, with placeholder fallback on load failure.

---

## TDD

### Success
- [x] `loadNodeTexture` caches by URL
- [x] Person near LOD + photoUrl → visible photo sprite (circular mask)
- [x] Org mid/near/far + symbol URL → visible symbol sprite
- [x] Far person LOD never shows photo sprite

### Failure
- [x] Empty URL → null, no loader call
- [x] Loader error / null → keep graphics placeholder, no hang
- [x] Missing person still shows `—`

---

## API

```ts
loadNodeTexture(url)
configureNodeTextureLoader(fn | null)  // tests / custom CDN
clearNodeTextureCache()
```

Views expose `mediaReady: Promise<void>` so hosts/tests can await async paint.

## Out of scope

- TD07 React promote overlay
- Group `emblemUrl` as separate sprite (org uses `symbolUrl*`)
