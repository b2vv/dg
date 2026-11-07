# Критика плану rev.3 — staff tidy routing redesign (dg41)

Модель: claude-opus-4-8

ДАЛІ: завантажити скіл plan-critique, прочитати plan.md (rev.3) та заземлення (_scale-wasm, _codex-capdiag, _research-ds-hybrid), потім код staff_tidy_layout.rs.

## ФАКТИ (звірено з кодом/CI)
- `tidy_scale_row` (staff_tidy_layout.rs:2000-2040) — `#[ignore]`, лише `println!`, ЖОДНОГО assert якості/часу.
- Єдиний якісний гейт за замовчуванням: `mock3_astar_zero_crossings_and_card_hits` (:1842-1856) — сцена mock3 (~11 посад).
- Великі goldens `golden_large_realistic`/`det_only` (:2197-2212) теж `#[ignore]` — НЕ CI-гейт уже зараз (ручний прогін на слайс).
- CI (.github/workflows/ci.yml:39-40) та `npm run test:rust` = `cargo test` БЕЗ `--ignored` → жоден scale/large тест у CI не біжить.
- astar cap = 250_000 iter (:872), fallback = пряма L-лінія по mid-y (:839-842) → джерело перетинів (узгоджено з capdiag).
- A6 owner-gate реальний: revert-proof прецедент у capdiag (revert-proof.txt, SHA-256, git status чистий).
- capdiag: a/b/c=0 (жодної недосяжності), BFS-свідки існують → «layout too tight» майже виключено ще на 491.

## ВЕРДИКТ: RED — 1 blocking
