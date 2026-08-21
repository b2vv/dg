# T48 — 100k orgs: row-tree by default, matrix when all collapsed

**Пріоритет:** P1 (demo scale UX)  
**Статус:** ✅ done  
**Джерело:** «100к має бути tree; якщо всі collapsed — matrix; немає expand/collapse на нодах»

---

## Правила (вже в SPEC §2.1)

| Стан | Режим |
|------|--------|
| ≥1 org expanded | **row-tree** |
| Усі collapsed | **matrix** |

## Фікс demo 100k

1. `buildScaleOrgsWindow` — `revealOrgPath(focus)` за замовчуванням → старт у **row-tree**.
2. `expandFocusPath: false` або **Collapse all** → **matrix**.
3. На org-картках Pixi і так немає chevron; у 100k з context menu прибрано Expand/Collapse (лишаються focus / copy).

## Навігація

- Click / search `org-N` — нове вікно + знову expand path (tree).
- Collapse all — matrix у поточному вікні.
