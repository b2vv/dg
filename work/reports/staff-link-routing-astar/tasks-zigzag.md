# tasks-zigzag.md — ШПС фікс зигзагів (T128 крок 2, dg37)

Реалізація plan-zigzag.md (GATE 2 🟢 критика+захист). TDD red→green, R6 critic-before+review-after на слайс.
**Код пише Codex (exec), Claude тримає дисципліну/гейти/звірку.** Кожен таск — окремий локальний коміт.

Гейт per-task: `cargo test` + `cargo clippy -D warnings` + `cargo fmt --check` зелені; detector mock3 НЕ зростає
(🔴 baseline cross=9, НЕ 0 — ціль циклу гнати cross→0; over/card/near/dept=0 лишаються); сумарні true-turns не
зростають (падіння — T-C); власний AC таску. Цілі фіналу: cross=0 + excess_turns=0 (baseline 22). Візуал — власник.

---

## T-A0 — метрик excess_turns + baseline (AC-0, S0) [ПЕРШИЙ — решта залежить]
**Файли:** packages/core/src/staff_routes.rs (поруч зі stats :667-672), + HUD-рядок `A*:`.
**Робити:**
1. `fn true_turns(points) -> usize` — рахує СПРАВЖНІ зміни напрямку (dedupe колінеар), НЕ points.len()−2.
2. `fn turn_limit(внутр/міждеп) -> usize` (2/4). Класифікація за належністю КІНЦІВ. ⚠️ (R2) `is_internal` —
   приватна fn staff_router.rs:889 іншого модуля → або `pub(crate)`, або вивести класифікацію локально з
   `member_of` (тривіально). Обрати простіше.
3. `excess_turns = Σ max(0, true_turns − limit)` ЛИШЕ по успішних ребрах (не `failed`/best-effort `marked`).
4. Виправити `bends` → true_turns (один підрахунок для HUD і тестів). Додати `turns`/`excess` у рядок `A*:`.
**TDD:** red-тест із колінеар-контрприкладом (Z-fallback ~staff_router.rs:1761: 4 колінеарні точки → true_turns=0,
а старий bends=2); success+failure. **Done:** тести зелені; вивести baseline true-turns/excess_turns на mock3 D
(ФАКТ у живу ноту — не припускати, що 126 роздутий). **Закриває:** S0.

## T-B — routing_order за ціллю (AC-B1, S2) [після T-A0]
**Файл:** packages/core/src/staff_router.rs:794-805 (`routing_order`).
**Робити:** ключ `(secondary, start.1, start.0, idx)` → `(secondary, target.x, target.y, idx)`. `secondary`
лишається первинним, `idx`-tiebreak лишається (детермінізм).
**TDD:** red-тест на §10.1.4-фікстурі (2 керівники → 1 деп C): доріжки монотонні за target.x, 0 перетинів.
**Done:** тест зелений; виміряти excess_turns після B (ФАКТ у ноту). **Закриває:** S2. **[P з T-D]**

## T-A — bus-консолідація cross-dept (AC-A1/A2, S1, S1b) [після T-A0; виміряти після T-B]
**Файл:** packages/core/src/staff_routes.rs:571 (де будуються per-edge specs).
**Робити:** групувати cross-dept edge-specs за (from_id, target_dept) → ОДИН deptTop-вхід, далі розгалуження
НАЯВНИМ tree-builder'ом §3.1 (N3 — не другий bus-рушій). ⚠️ ВИКЛЮЧИТИ `secondary`-ребра (N4). ⚠️ `target_dept=None`
→ не групувати (N5). N=1 → вироджений вхід без шини (N6). Групувати ПІСЛЯ скіпів self-loop/dangling.
**TDD:** red — S1 (keruvnyk→N підлеглих: РІВНО 1 перетин верху рамки + шина), S1b (N=1 / no-dept / secondary).
🔴 ГЕЙТ (N10): svgExport.parity + entry-dot/endsOnDeptTop тести зелені; якщо число entry-dot змінилось —
оновити асерти СВІДОМО. **Done:** S1/S1b зелені, parity зелений/свідомо оновлений. **Закриває:** S1, S1b, S7(parity).

## T-C — post-simplify (AC-C1, S3, S4, S8) [після T-A+T-B]
⚠️ SKIP-ГЕЙТ (N8): СПЕРШУ виміряти excess_turns після T-A+T-B. Якщо вже `=0` на mock3 — T-C НЕ потрібен, пропустити
(зафіксувати ФАКТ у ноту). Інакше:
**Файл:** packages/core/src/staff_router.rs (розширити `simplify_points` :586-608).
**Робити:** прибирати зайві сходинки з урахуванням заборонених зон І ІНШИХ ліній (§5.3), не лише карток. `failed`/
best-effort маршрути НЕ чіпати.
**TDD:** red — S3 («зайва сходинка прибрана» → ≤2/≤4, excess_turns=0), S4 («необхідний обхід ЗБЕРЕЖЕНО»),
S8 (best-effort `failed`-ребро: не паніка, виключене з excess_turns, C не чіпає).
**Done:** S3/S4/S8 зелені; сумарні true-turns ПАДАЮТЬ; excess_turns=0 на визначених категоріях. **Закриває:** S3,S4,S8.

## T-D — spacing рамок (AC-D1, S5) [П — паралельно, незалежно]
**Файл:** packages/core/src/staff_layout.rs — pack_tree_block: `subtree_width` (:876+) + `place` (крок 6).
**Робити:** збільшити горизонт. зазор між блоками так, щоб РАМКИ стояли ≥28px: `gap ≥ 28 + 2·content_padding`
(рамка виступає padding з КОЖНОГО боку, N2). ⚠️ НЕ плаский region-loop :655-706 (мертвий для mock3).
**TDD:** red-тест на межах рамок сусідніх департаментів у pack_tree_block ≥28px. **Done:** тест зелений;
візуал — департаменти розділені. Падіння bends НЕ вимагається (D — власна користь). **Закриває:** S5. **[P з T-B]**

---

## Крос-таскові (кожен таск)
- **S6 детермінізм:** golden-determinism-тест лишається зеленим (2 прогони ідентичні).
- **S7 регресія:** rust/SDK/demo/typecheck/clippy/fmt зелені; golden інших табів не змінено (mock3 виключений).
- **R6:** critic-before на пастки слайса + review-after (незалежний) перед комітом кожного.

## Послідовність і залежності
```
T-A0 (метрик+baseline) ─┬─> T-B (order) ─┬─> T-A (bus) ─> T-C (simplify, якщо треба)
                        └─> T-D (spacing, [P])
```
T-A0 перший (решта читає метрик). T-D незалежний ([P]). T-C лише якщо excess_turns≠0 після A+B.
Rollback: revert окремого слайс-коміту; AC-0(T-A0) відкочувати ОСТАННІМ (C-тести залежать від метрика).
