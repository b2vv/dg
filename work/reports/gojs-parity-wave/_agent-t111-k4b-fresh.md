
ФАКТ (причина регресії): stash@{0} додає виклики `this.previewCardDisplacement(positionId, drop)`
(DiagramRenderer.ts, previewDrag callback) і `this.restoreCards()` (у deps: `restoreCards: () =>
this.restoreCards()`), АЛЕ жоден із цих двох методів ніде в стеші не визначений — ні в діффі, ні
раніше на HEAD (`grep previewCardDisplacement|restoreCards|displacedCardId` на HEAD — 0 збігів).
Стеш додав лише ПОЛЕ `displacedCardId` і виклики неіснуючих методів, саму логіку displacement
писати не встигли (звідси "9 agent deaths" у назві стешу — попередні агенти помирали до того, як
дійшли до реалізації тіла методів).
Наслідок: rstest не типчекає при білді (esbuild-трансформ, типи не звіряються), тому це не
compile error, а RUNTIME TypeError "this.previewCardDisplacement is not a function" на КОЖЕН
реальний drag-move (personInteractions.ts кличе deps.previewDrag на кожен previewDrag виклик, який
тепер завжди падає) і RUNTIME TypeError на КОЖЕН restoreContours-шлях (кличе тепер deps.restoreCards
теж). Це б'є по всіх чотирьох тестах:
- "a real drag does report a drop" / "at near the card follows the pointer" — обидва роблять
  справжній drag → previewDrag викликається → throw.
- K4a "mid-drag ... resolved swap" — теж робить drag (previewDrag) → той самий throw, хоча сам
  тест перевіряє контур, а не картку.
- K4a "cancelled drag restores ... byte for byte" — cancel-шлях кличе restoreContours() →
  restoreCards() → throw.
Тобто це не логічна помилка в displacement-математиці, а недописаний код: заглушки-виклики без
реалізації. Наступна спроба має дописати тіла `previewCardDisplacement`/аналог і `restoreCards`
ПЕРЕД тим як лишати виклики в previewDrag/restoreContours — інакше кожен existing drag-тест падає
миттєво.
РІШЕННЯ: не застосовувати стеш naosліп. Забрати тести (RED, описані нижче) + сітку-математику
(розвилка з брифінгу), але писати deps/реалізацію сам, з нуля, тілом одразу, а не поетапно
залишаючи виклик без реалізації.

# --- K4b attempt 5 (implement, sonnet) ---
ДАЛІ: прочитати DiagramRenderer.ts (previewDrag/restoreContours ділянку), personInteractions.ts,
ContourPainter.previewDrag, і вміст stash@{0} (diff) для тестів/хелперів, перш ніж писати код.
