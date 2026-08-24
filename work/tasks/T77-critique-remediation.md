# T77 — Critique remediation (`CRITIQUE-dg_907f`)

**Пріоритет:** P0 → P2 (див. мікрозадачі)  
**Статус:** ✅ M10 remaining silent lies  
**Базис:** `dg@1fdb608` (`main` після #56) · critique на `805efee`  
**Джерело:** [CRITIQUE-dg_907f.md](../tech-debt/CRITIQUE-dg_907f.md)

Чотири незалежні огляди звелися до одного патерну: важкі підсистеми пораховані й не підключені, плюс P0 аварії UX/worker/WebGL і брехливі тести.

---

## Мікрозадачі

| ID | Файл | Пріоритет | Статус |
|----|------|-----------|--------|
| **M01** | [T77-M01-contour-wire-or-delete.md](./T77-M01-contour-wire-or-delete.md) | P0 decision | ✅ B |
| **M02** | [T77-M02-worker-error-listeners.md](./T77-M02-worker-error-listeners.md) | P0 | ✅ |
| **M03** | [T77-M03-pixihost-destroy-during-create.md](./T77-M03-pixihost-destroy-during-create.md) | P0 | ✅ |
| **M04** | [T77-M04-appenddata-dedupe.md](./T77-M04-appenddata-dedupe.md) | P0 | ✅ |
| **M05** | [T77-M05-drag-grab-offset-grid-pitch.md](./T77-M05-drag-grab-offset-grid-pitch.md) | P0 | ✅ |
| **M06** | [T77-M06-expand-nonroot-forest.md](./T77-M06-expand-nonroot-forest.md) | P0 | ✅ |
| **M07** | [T77-M07-lying-tests.md](./T77-M07-lying-tests.md) | P1 | ✅ |
| **M08** | [T77-M08-validate-search-perf.md](./T77-M08-validate-search-perf.md) | P1 | ✅ |
| **M09** | [T77-M09-dead-code-purge.md](./T77-M09-dead-code-purge.md) | P1 | ✅ |
| **M10** | [T77-M10-silent-lies.md](./T77-M10-silent-lies.md) | P2 | ✅ |
| **M11** | [T77-M11-crash-hardening.md](./T77-M11-crash-hardening.md) | P1 | ✅ |

---

## Порядок (з critique §7)

1. **M01** — wire `_results` **або** delete contour pipeline (розблоковує M09).
2. **M02–M06** — аварії з найгіршим продакшн-симптомом.
3. **M07** — тести, що зеленіють на зіпсованому виході.
4. **M08** — O(n²) validate + search.
5. **M09** — ~4.4k LOC delete після M01.
6. **M10–M11** — тихі неправди + wasm/cycle hardening.

---

## Acceptance (епік)

- [x] M01 закрито рішенням + кодом (wire **або** delete).
- [x] M02–M06 зелені (unit + failure-кейси).
- [x] M07: PNG/layout/incremental/worker тести здатні падати.
- [x] Critique scorecard у [CRITIQUE-dg_907f.md](../tech-debt/CRITIQUE-dg_907f.md) оновлено статусами.
