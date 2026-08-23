# T53 — Flat orgs / 100k root click: viewport + interaction model

**Пріоритет:** P0  
**Статус:** ✅ closed (2026-08-23) — SDK camera + demo click model + regression test  
**Зв’язок:** T31, T48, T52

---

## Симптом

На вкладках **Flat orgs** і **100k orgs** клік по **root** (або expand через `+`) виглядає як «діаграма зникла» — canvas лишається, але карток не видно.

## Root cause (підтверджено)

| Tab | Що відбувається | Чому «пусто» |
|-----|-----------------|--------------|
| **Flat orgs** | `expandOrg(root)` → matrix → **row-tree**, layout перемальовується | **Камера не оновлюється** — `fitView` лише на `reload()`, після expand viewport лишається на старих координатах matrix-сітки |
| **100k** | Клік по org → **`reload()`** цілого diagram (навіть якщо org уже у вікні) | Flash + зайва робота; при помилці create → `showError` замінює canvas; T52 додав `+/−` chrome, що **суперечить T48** (100k без expand на нодах) |

Layout після expand **не порожній** (`flatOrgRootExpand.test.ts` — row-tree повертає nodes).

## Частковий fix (гілка)

1. **SDK** — `expandOrg` / `collapseOrg` → `panToOrg` після `render`; `collapseAllOrgs` → `fitView`
2. **Demo 100k** — клік по org **у поточному вікні** → `focusNode`, не `reload`; `reload` лише коли index поза window

## Залишилось (acceptance)

- [x] **100k:** прибрати tree `+/−` chrome на org-картках (align T48) — `orgTreeChrome: false` у demo config
- [x] **Flat orgs:** card click vs `+` — collapsed → expand; expanded → focus (chrome hit-test відрізає `+`)
- [x] **Root expand row-tree:** `fitView` при першому matrix→row-tree transition
- [x] Regression: `flatOrgRootViewport.test.ts` — child box intersects viewport after expand
- [x] Manual QA: Flat orgs org-1 `+` і click; 100k org-0 click in-window vs search `org-90000` — `e2e/flat-orgs.spec.ts`, `e2e/scale-100k.spec.ts`

## Verify

```bash
npm test && npm run typecheck
# Demo: Flat orgs → + на Organization 1 → дерево видно, камера на root
# Demo: 100k → click org-0 (in window) → без full reload, focus на картці
```
