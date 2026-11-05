# Extensibility R1–R5 + R11 — master ledger

**Мандат власника (2026-11-06):** зробити ВЕСЬ названий реєстр роадмапу (R1–R5, R11) автономно, multi-agent
за AI Factory (spec-flow → гейти → ledger → Codex-кодери + gate-reviewer), мульти-виконання дозволено.
**Пуш у main — ЛИШЕ коли весь план готовий.** Гілка `feat/extensibility` off main `da0e184` (D3+D1 злиті).
GATE-1-рішення беру з роадмапу (там багато вирішено); зупиняюсь на справді відкритих/блокерах.

## Фічі, порядок, залежності (джерело: work/ROADMAP-extensibility.md)

| # | Фіча | Залежить | Статус | Теки |
|---|---|---|---|---|
| R1 | Pixi hover hit-test (far-LOD): pointermove→нода→related→акцент; через D1-store | D1 ✓ | TODO | reports/extensibility/r1/ |
| R5 | Мультивибір: shift-клік toggle + marquee (hit-test за геометрією); SDK-логіка, хост-стиль гумки | D1 ✓ | TODO | r5/ |
| R4 | Зум wheel/button конфіг: behavior/gestures opt-out, Mac→meta, hint, клавіатурний, анімована кнопка | — | TODO | r4/ |
| R3 | Pixi зовнішні view-фабрики (D2: дві моделі інжекції; гола функція + create/update/destroy retained) | R1(hit-test) | TODO | r3/ |
| R2 | React-шар DX: багатший контракт інжекції (анімація переходів = D3, вже є) | — | TODO | r2/ |
| R11 | Правила ліній з обгортками: уніфіковані obstacle-регіони (повʼязано зі staff-link-routing astar) | — | TODO | r11/ |

**Порядок виконання:** R1 → R5 → R4 → R3 → R2 → R11 (залежності + ризик; R1 розблоковує R3-hit-test).
Фічі здебільшого послідовно; паралель — кодери ВСЕРЕДИНІ фічі (неперетинні файли), як D1-B∥C.

## Правила (AI Factory + проєкт)
- Codex exec `< /dev/null` (пам'ять codex-background-needs-stdin-closed); код пише Codex, Claude рев'юнить.
- Кожна фіча: spec → GATE 1 (роадмап-рішення) → plan → GATE 2 (critique∥defense, gate-reviewer Opus 4.8) →
  tasks → implement (Codex, неперетинні файли) → координаторська перевірка (тести+мутації) → інтегроване рев'ю
  (Standards∥Spec) → коміт. Конституція inline. Durable ledger на фічу.
- dist спільний: важкі гейти (root typecheck/build) НЕ чіпати до кінця; demo-typecheck може чекати dist.
- Пуш у main — раз, у кінці всього плану, після «ок» cass на фінальну збірку.

## Журнал (додавати по ходу)
- Старт: гілка feat/extensibility @ da0e184. Майстер-ledger створено. Починаю R1.

## R1 (у роботі)
- spec+plan написано. GATE-1 з роадмапу. Конституція inline PASS. Нарізка: R1-A (DiagramRenderer+PersonNode+OrganizationNode, зняти far-виняток hover).
- GATE 2 (combined critique+defense, 1 gate-reviewer — мала фіча): dispatched → r1/_gate2.md.
- R1 GATE 2: RED (B1 неназваний перевернутий тест; B2 setHovered-правка протікає в legacy-не-opt-in → AC3) → plan рев.2 **DIM-ONLY** (зняти лише :254-виняток, setHovered не чіпати; файли → лише DiagramRenderer.ts). B1: названо interaction.test:186-206 + нові far [1,1,0.45] + null-source тест. Re-check тим самим рев'юером: dispatched.
- R1 GATE 2 re-check: **GREEN** (B1/B2 closed, non-blocking handled). → tasks(R1-A) + implement.
- R1-A: dispatched (Codex `< /dev/null`, dim-only, файли лише DiagramRenderer.ts+test) → r1/_impl-R1-A.md
