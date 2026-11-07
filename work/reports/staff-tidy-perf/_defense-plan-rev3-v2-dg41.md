# Defense plan rev.3 (v2, підтверджувальний перепрогін) — dg41

Модель: claude-opus-4-8

ДАЛІ: завантажу скіл plan-defense; прочитаю plan.md (rev.3), попередній захист _defense-plan-rev3-dg41.md, _scale-wasm-dg41.md, _codex-capdiag-dg41.md; звірю §1/§3/§5/A9/A10 проти тексту плану; прогоню 5 адаптованих питань заново.

---
## Перевірка закриттів (v2)

ФАКТ Q1 закрито реально в тексті: §3 D1 рядки 83-90 — інваріант «new model does not regress tolerance to cycle / duplicate-parent / broken-edge input — a cycle yields a visible no-panic result»; D2 додає Tidy panic-тест (дзеркало sibling); повна валідація з Err явно out-of-scope (:90). A9 §6:143. Grounding: sibling-тести існують — staff_layout.rs:2538 `tree_block_cycle_does_not_panic_and_places_all` + :2467 missing-parent+cycle. Tidy: :1295 Result, лише :1643 Ok, жодного продакшн-Err → неявна толерантність, як і стверджує план. CLOSED.

ФАКТ Q3 закрито: §3 D1 :91-96 — вимога «total order on contended edges/corridors» + D2-acceptance «two runs of a scale scene (99) serialize byte-identically»; incremental-кеш явно out-of-scope (:96). A10 §6:144. Grounding: наявні детермінізм-тести лише на фіксованих сценах — :1746 output_is_deterministic, :1896 mock3_astar_deterministic (план цитує точно). CLOSED.

ФАКТ Q4 закрито: §1 :36-37 «Exactly 100 is out of target (the horizon is strictly <100): degradation at 100 is not a regression (Q4)». Явне звуження скоупу. CLOSED.

ФАКТ Q5-харден закрито: §5 :128-130 «regenerated large-scene goldens live in that same D2 commit, so one revert restores code + goldens together (Q5 harden)». A8:142, A6:140. CLOSED.

ФАКТ CI-grounding: ci.yml:40 `cargo test` без `--ignored`; package.json:23 `test:rust`=`cargo test` — план §4 B1 цитує точно.

## Повторний прогін 5 адаптованих питань на поточному тексті
| # | Питання | Закрито рядком | Вердикт |
|---|---|---|---|
| 1 | Malformed (cycle/dup/broken-edge) | §3 D1 :83-90 + out-of-scope :90 + A9 :143 | closed |
| 2 | Dependency (observer-sync/WASM/dist) | §3 D1 :70-74 + A7 :141; §5 :124-126; A4 :138 | closed |
| 3 | Race / детермінізм нового роутера | §3 D1 :91-96 + A10 :144 + out-of-scope incremental :96 | closed |
| 4 | Empty / boundary (0,1,50,99,100) | 0/1 A1 :135 + :2224-2228; 50/99/first-cross A3 :137 + §3 :52-58; 100 §1 :36-37 | closed |
| 5 | Rollback | §5 :128-130 + A8 :142 + A6 :140; незворотність §5 :124-126 | closed |

## Нові прогалини / суперечності
- Перевірено: A9/A10 «added at D2», тоді як D2-скоуп фіксується лише на D1 (:100-103). Не суперечність: план пінить acceptance-критерії, не форму реалізації; будь-який D2 мусить їх вдовольнити. До D2 нема продакшн-змін (A6 revert-proven) → вікна ризику без цих гейтів немає.
- Інваріант Q1 «cycle → visible no-panic» фактично СИЛЬНІШИЙ за статус-кво (зараз Tidy на циклі падає стеком). Це покращення дзеркалом sibling, не регрес-захист, і не конфліктує з «validation out-of-scope» (no-panic ≠ Err-валідація). Закриває прогалину повніше, не вносить нової.
- §7 carry-list (N1/N3/N5) — не-блокуючі пункти з plan-critique, не defense-гейти; коректно поза таблицею.

РІШЕННЯ: PASS — gate GREEN, 0 прогалин. Усі 3 попередні блокери (Q1/Q3/Q4) реально закриті в тексті (не лише в заголовку), code-grounded, внутрішньо несуперечливі; нових прогалин закриття не внесло.
