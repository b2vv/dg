# WIP — відновлення задуму 4-way split бібліотеки dg з транскриптів

ДАЛІ: grep PRIMARY-файлів вузькими патернами (react flow / dagre / elk / оркестратор / міні-бібліот / розбити бібліот), лише номери рядків.

ФАКТ: файли-кандидати існують:
- PRIMARY: 05dec2a8 (11.8MB, dg Claude 21 жовт), 4c3d8c33 (4.7MB, -Users-strelia 24 жовт)
- SECONDARY codex: 10/17 (2.3MB), 10/21 (760KB), 10/23 (1MB)

---
ФАКТ: PRIMARY 05dec2a8 (dg Claude, 21 жовт) = двосесійний (Dg1/Dg2) parity-recheck GoJS→dg swap-seam. react-flow тут = «future React Flow engine, one-class replacement behind the swap-seam interface» (`src/shared/lib/gojs-diagram/tree-diagram-engine.ts:44-52`). Жодного опису 4-way split. dagre=0, elk≈1, pixi=31, оркестратор=агентна оркестрація.

ФАКТ: PRIMARY 4c3d8c33 (24 жовт, cassiopeia-admin-ui) = ШПС engine-swap + ADR-0078 (dg лишається зовнішньою бібліотекою, НЕ під modules/) + вибір рушія ЛІНІЙ: Варіант A (конструктивний layered router, 0 нових deps) vs Варіант B (ELK.js). Усі elk-згадки = ELK.js як кандидат layout/routing для ліній ШПС + ELK-еталон як acceptance-oracle (probe-results.md). Усі USER-повідомлення з elk (1118/1126/1165/1173) = вставлені результати plan-critique/plan-defense про routing. НЕ про поділ бібліотеки.

РІШЕННЯ: Гіпотеза координатора («4-way split у user-меседжах навколо elk у 4c3d8c33») СПРОСТОВАНА прямим витягом: ці меседжі — критика ШПС-routing-плану, elk=ELK.js-роутер, не бібліотечний спліт.

ФАКТ (цінне, codex 10/21): ПОТОЧНА архітектура dg (monorepo packages/):
  - packages/core — Rust→WASM: contours + Ploeg row-tree + алгоритми розкладки (canvas paint — TS)
  - packages/sdk — @org-hierarchy/sdk: Pixi-рендер, воркери, export SVG/PNG/PDF, React context menu
  - packages/demo — Rsbuild demo
  Пакет prebuilt (dist/ .js+.d.ts+.wasm), у admin-ui підключений як vendored tarball (0.6.0, `3e82c0734`). license UNLICENSED; транзитиви pixi.js/eventemitter3 = MIT.
  → Це монолітний packages/sdk, який 4-way vision мав би розкласти на: layout(elkjs-аналог)+react(react-flow-аналог)+webgl/canvas(pixi)+оркестратор.

ФАКТ: Негативні перевірки (вичерпно):
  - dagre/dagrejs = 0 збігів у ВСІХ транскриптах (Claude + весь ~/.codex/sessions tree).
  - «аналог + (react flow|elk|dagre|webgl|pixi|layout)» = 0 у всіх файлах.
  - «розбити/розділити/винести/окрем* + (бібліот|пакет|ліб)» = 0.
  - «велик* зум|багато нод|тисяч* нод» = 0.
  - «чотири/4 + (міні|ліб|пакет|бібліот)» = лише системний промпт («4 напрямки» мапера, «4 - Shared» vault) — шум.
  - оркестратор у codex = опис скілів (interface-review/spec-flow orchestrator) — шум.
  Перевірені файли: PRIMARY 05dec2a8, 4c3d8c33; інші dg-сесії 336fc857, fd6093db, 38dc8f9b, e539b8d0; codex 10/17, 10/21(10:54 і 21:48), 10/23.

ВИСНОВОК: Детального опису задуму 4-way split у наданих транскриптах НЕМАЄ. Є лише інгредієнти (pixi/WebGL, ELK.js-роутер, React-Flow-swap-seam, поточний 3-пакетний monorepo). Імовірно опис або в ще старішій/іншій сесії, або в Obsidian vault / dg-репо (docs/work), не в цих .jsonl.
