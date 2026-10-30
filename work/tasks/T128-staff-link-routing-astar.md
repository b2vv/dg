# T128 — staff link-routing: повний A*-орто-роутер ліній ШПС із §10-гарантіями в Rust

**Пріоритет:** P2 · **Статус:** 🟡 spec-flow пройдено (GATE 1 ✅, GATE 2 ✅ PASS) · **код НЕ почато** ·
**ЗАБЛОКОВАНО:** «го» власника на implement + рішення Q2 (доля WIP dg30) · **Під парасолькою:** [T126](T126-staff-layout-anchors-spacing-into-rust.md)
**Гілка:** `feat/t126-staff-rust-geometry` (та сама, рішення власника dg31).

## Мандат
Рішення власника dg31 (дебата V-A/V-B/V-C): **V-A — повний A* у Rust** (не доробка detour, не JS-бібліотека).
Синтез: `work/reports/staff-rust-geometry/_r7-routing-debate-SYNTHESIS-dg31.md`. Мандат T126 O-33/O-48:
маршрути рахує Rust = одна правда. Еталон = мокап `shps-links.js` A* + 3 скріни + §10 (НЕ TS-паритет).

## Scope (рішення власника GATE 2 dg31, B1)
A* як **ФУНДАМЕНТ на Бар-1** (обчислена tree-розкладка, 9 схем §10.1); перевага §10.1 демонстровна на
п.4/п.5. **Бар-2** (довільні позиції) ВІДКЛАДЕНО з edit-mode (Q5); контракт-шов під x/y закладається
адитивно, не будується. §6 повна перебудова layout, бус для не-голови §3.2, matrix-staff — out of scope.

## Артефакти spec-flow (дім: `work/reports/staff-link-routing-astar/`)
- `spec.md` — ЩО/ЧОМУ, AC1-AC11, 5 відкритих питань закрито на GATE 1.
- `plan.md` — ЯК: reuse-first, сайд-ефекти/міграція/rollback, конституція, приймальна таблиця (18 рядків).
- `tasks.md` — T0-T13, red-first, з посиланням на рядки приймальної таблиці.
- `_gate2-VERDICT-dg31.md` / `_gate2-recheck-dg31.md` — GATE 2 PASS після 4 blocking.
- `_plan-prior-art-search-dg31.md` — вже-обговорене (design-v3 variant C, dept-grouping вже в Rust).

## Наступний крок
Перепитати Q2 (WIP dg30: Коміт B / падаючий svgExport.parity) → «го» на implement → T1 (stats()+фікстури RED).
