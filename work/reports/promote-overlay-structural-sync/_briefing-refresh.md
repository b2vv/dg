# Рефреш брифінгу work/CTO-RESEARCH.md — живий лог

ДАЛІ: прочитати шапку (дата/база, ~рядок 3, ~88), визначити базовий коміт останнього рефрешу; потім git log база..HEAD.

ФАКТ: шапка — Дата 2026-09-11, фокусні рефреші до 2026-11-02. Базис `feat/t126-staff-rust-geometry` @ `d9890fc`.
check:docs freshness-гейт: «відстає на 21 з 25».

---
ФАКТ (крок 2): 21 коміт d9890fc..HEAD. Три теми: (1) SDK 1.0.0 стабільна `0e737de` + host-adapter шов `1150ae6`; (2) Б1/Б2 alpha-розкладка «розмір на картку» core/SDK `b601cba`/`a560636`/`5b6cd10`, демо-хром через шов `4830cb2`; (3) #96 breaking `8819327` вроджений прунінг + рольовий дефолт + zoom-floor 0.36 `2ddc7a3`. Плюс roadmap docs (host-anchors A0–A3, D3 spring, SDK-розширюваність R1–R5/D1–D4), TD07 oxlint.

ФАКТ (крок 3 — звірено первинно в host-репо): `cassiopeia-admin-ui` @ `6f1567a36`, гілка `b2w/queue/springs/spring-13/4311-shps-diagram-palette` — АКТИВНА інтеграція dg SDK. `package.json:104` `@org-hierarchy/sdk: link:../../dg/packages/sdk`; `gojs ^3.0.26` досі є (`:112`). Імпорти підтверджено: `make-dg-sdk-factory.ts:1-8` (OrgHierarchyDiagram, createReactPromoteOverlay, StaffChromeGeometry), `staff-chrome-backdrop.tsx:6`, `staff-seat-card.tsx:174` (near-zoom HTML face). near/mid = HTML-overlay (`mountOverlay` mode:'near-visible' `:332-340`), far = Pixi. ⟹ факт №5 «нема ЖОДНОГО споживача» хибне для активної гілки; «нема ПРОД-споживача» лишається (прод на GoJS 3.0.26).

РІШЕННЯ: базис → `c7da0de` (merge #96, на `main`+`origin/main`, behind=0). Дата-рядок +2026-11-04. Факт №5 — додаю оновлення-рядок, історію не стираю.

ДАЛІ: правки CTO-RESEARCH.md (шапка, блок d9890fc, факт №5, черга), потім npm run check:docs.

---
ФАКТ (фінал): правки внесені — шапка (дата+базис c7da0de), новий блок «Що змінилось із d9890fc», оновлення №5 (host активна гілка), 2 пункти черги (PR-кандидат + low-pri mid-Pixi). check:docs ЗЕЛЕНИЙ: «брифінг відстає на 0 комітів з 25». AGENDA.md не чіпав (черга внесена в CTO-RESEARCH — достатньо). Усі path:line звірені первинно. ГОТОВО.
