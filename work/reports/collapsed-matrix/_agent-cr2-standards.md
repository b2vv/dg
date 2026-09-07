# Агент CR2 — Стандарти (T111 diff)

ДАЛІ: прочитати git log 316930f..HEAD та diff --stat, потім джерела стандартів (.claude/standards.md, CODING_STANDARDS.md, TDD.md, AGENTS.md)

ФАКТ: діф 316930f..HEAD = T113 (collapsed-sibling grid), 12 комітів. Файли в скоупі:
docs/USAGE.md, e2e/flat-orgs.spec.ts, packages/core/src/ploeg_layout.rs,
packages/sdk/src/layout/collapsedSiblingGrid.{ts,test.ts}, packages/sdk/src/layout/rowTreeLayout.{ts,test.ts},
scripts/check-docs.mjs, scripts/orgModeDocs.{mjs,test.mjs}.
ДАЛІ: прочитати CODING_STANDARDS.md §0/§1/§1b, TDD.md, потім самі файли діфу.

ФАКТ: Прочитано весь код-діф (collapsedSiblingGrid.ts/.test.ts, rowTreeLayout.ts/.test.ts,
ploeg_layout.rs тести, orgModeDocs.mjs, check-docs.mjs, docs/USAGE.md, e2e/flat-orgs.spec.ts).
РІШЕННЯ: Жодних жорстких порушень задокументованих стандартів не знайдено. Жодного явного смеллу
з бази Fowler теж не знайдено — все відповідає ієрархії §0, Pocock TS (явні return types на
експортах, без enum/any, options-object замість >3 аргументів), TDD (success+failure симетрично
в обох .test.ts), Clean Architecture (правило "хто є грид" — одна правда в TS, Rust лише вкладає
геометрію на chain-вхід, жодного дубля бізнес-правила collapse/grid у Rust).
ФІНАЛ: відповідь дана користувачу, звіт нижче.
