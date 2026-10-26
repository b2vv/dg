# T3a-2 — codex AGENT A working file (створення core-файлів)

Стадія A з A→B→C. Append-only, по кроках.

---
ДАЛІ: Прочитати локальні інструкції та точні байти джерел; створити errors.ts і seatDrop.ts у core/, доповнити барель та виконати заданий TypeScript-гейт. Оригінали не змінювати, тести й форматування не запускати, не комітити.
ФАКТ: Початковий план записано до читання джерел; .ai/README.md прочитано. ДАЛІ: Звірити adapter/workflow та репозиторні обмеження.
ФАКТ: Прочитано локальний pin/adapter та workflow; scope стадії A визначений користувачем і має пріоритет: лише копії core + барель, без запуску тестів. ДАЛІ: Звірити джерела та зафіксувати pre-code рішення перед записом коду.
ФАКТ: Branch bulk-mutations, HEAD 261991c підтверджені. Наявний чужий WIP поза core не змінюю. Прочитані точні блоки positionMove.ts, interaction/types.ts, ContourPainter.ts та стиль core/index.ts.
РІШЕННЯ: Pre-code checkpoint — writer A; scope два нові core-файли й append бареля; acceptance: verbatim, лише data/local imports, tsc exit 0. File fallback: пряме читання трьох джерел. Копіювання суцільних byte-блоків зберігає JSDoc, порядок і обидва assertNever. Тести заборонені дорученням; незалежне ревʼю/подальша міграція належать наступним стадіям B→C.
ДАЛІ: Створити файли через byte slices; оригінали не записувати.
ФАКТ: Створено core/errors.ts і core/seatDrop.ts byte-копіюванням вихідних блоків; до core/index.ts дописано задані експорти. Оригінали не записувалися.
ДАЛІ: Запустити єдиний заданий гейт npx tsc -p tsconfig.check.json у packages/sdk.
ФАКТ: Перший виклик tsc помилково зроблено з кореня репозиторію: TS5058 (tsconfig.check.json відсутній там), exit 1; це не результат SDK-гейта. ДАЛІ: Виконати точну команду з packages/sdk.
ФАКТ: Заданий гейт у packages/sdk: npx tsc -p tsconfig.check.json — exit 0, діагностик немає. ДАЛІ: Остаточно звірити байти, імпорти та незмінність interaction/render.
ФАКТ: Побайтова звірка нових блоків та незмінності трьох джерел пройшла. Загальний import-скан зачепив наявний nodeTestId.test.ts з @rstest/core; це тестовий файл поза змінами A. ДАЛІ: Звірити production core-файли та точний append бареля.
ФАКТ: Production core-purity PASS; барель дорівнює HEAD плюс точний заданий append. Змінені кодові файли лише core/index.ts, нові core/errors.ts та core/seatDrop.ts.
РІШЕННЯ: Стадія A завершена: verbatim-копії з JSDoc та обома assertNever збережено, interaction/render незмінні, заданий SDK tsc exit 0. Тести, форматування й коміти не виконувалися; дублювання навмисно залишене.
ДАЛІ: Передати результат агенту B.
