# REVIEW — PR #56 media (`MediaService`) + abstraction

**Базис:** T74 branch  
**Статус:** ✅ remediated (M-A/B/C/E)  
**Див. також:** [REVIEW-t74-t76-pocock-gof.md](./REVIEW-t74-t76-pocock-gof.md)

| ID | Було | Fix |
|----|------|-----|
| M-A | global `nodeMedia` cache після unload | `evictNodeTextureCache` |
| M-B | revision не в loader | `loadNodeTexture(url, revision)` + `url::rev` |
| M-C | destroy unload чужі діаграми | `acquire`/`release` refcount |
| M-D | ноди → `loadNodeTexture` напряму | `RenderOptions.loadTexture` → `MediaService` |
| M-E | duck `resolveThemedMediaFromLegacy` | **removed** |
| M-F | `refresh(ref)` stub | `resolveNodeUrls` + invalidate |
| M-G | full render як media path | заборонено; `reloadMedia` point update |
