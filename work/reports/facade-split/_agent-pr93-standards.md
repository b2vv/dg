# Review PR93 (t106-measure) — вісь Standards

ДАЛІ: прочитати .claude/standards.md (маніфест), work/CODING_STANDARDS.md, AGENTS.md, work/TDD.md

ФАКТ: .claude/standards.md — мірник: CODING_STANDARDS.md діє на packages/sdk, packages/demo (TS). Rust без стандарту. Конституція: тести перед кодом, ієрархія принципів KISS→SOLID→DRY→CleanCode→CleanArch→GoF→Pocock, GoF лише при ≥2-3 повторах, межа WASM/TS явна, публічний API SDK не міняється мовчки, Pocock тільки TS.
ФАКТ: gates green (lint/typecheck/check:docs) — тулінгові знахідки пропускаю.
ФАКТ: диф — 60eacb5: OrgHierarchyDiagram.ts -119, нові media/diagramMedia.ts +138, media/diagramMedia.test.ts +144. Решта — .md (T119 docs).

ДАЛІ: прочитати git diff main...t106-measure по OrgHierarchyDiagram.ts та diagramMedia.ts повністю

ФАКТ: diagramMedia.ts:105-116 — prefetchOpenMedia(input: { data; lodLevel: string; service }). Домен-тип LodLevel = 'far'|'mid'|'near' існує в render/lod.ts:2, експортується, і сам файл викликає resolveLodLevel(): LodLevel (OrgHierarchyDiagram.ts). Виклик у OrgHierarchyDiagram.ts:802 передає this.viewState.lodLevel (типізований LodLevel) у параметр типу string — звуження до primitive на межі нового модуля. Коментар усередині prefetchOpenMedia (рядки 112-115) явно оперує доменним значенням 'far' як магічним рядком, а не членом union.
РІШЕННЯ: Primitive Obsession (judgment call) — lodLevel мав би бути LodLevel, не string. Неhard breach (CODING_STANDARDS не забороняє string буквально), але суперечить духу Pocock-розділу («singular types», «prefer narrow infer») і власному коду файлу, який щойно імпортував LodLevel в сусідньому модулі.

ДАЛІ: прочитати diagramMedia.test.ts і перевірити TDD (success+failure), Data Clumps / Duplicated Code між OrgHierarchyDiagram.ts викликами і файлом

ФАКТ: тести — 12 кейсів, кожна з трьох функцій має success І failure (TDD.md дотримано структурно). Barrel: diagramMedia.ts НЕ ре-експортується з media/index.ts чи sdk/src/index.ts — лишається внутрішнім, публічний API SDK не зачеплений, docs/USAGE.md коректно не чіпали.
ФАКТ: MediaPrefetcher interface (diagramMedia.ts:88-91) — вузький рольовий інтерфейс (ISP), узгоджується з прецедентом DiagramMediaFacade, який хвалить analysis.md.
ФАКТ: options-object з ≤3 логічними полями в усіх трьох функціях — Few arguments дотримано, return types явні скрізь (Pocock library rule).
ФАКТ: жодних нових any/@ts-ignore/enum. Дублювання коду між старим і новим місцем відсутнє (старе видалено повністю, не skarpied).
РІШЕННЯ: єдина знахідка — Primitive Obsession (judgment call) на lodLevel: string замість LodLevel у diagramMedia.ts:107,105 та виклику OrgHierarchyDiagram.ts:802. Твердих порушень задокументованих стандартів не знайдено.

ГОТОВО — фінальна відповідь нижче.
