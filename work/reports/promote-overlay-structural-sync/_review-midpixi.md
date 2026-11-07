claude-opus-4-8

ДАЛІ: читаю diff трьох файлів vs main; потім перевіряю споживачів this.lod, гейт staffReactChrome, межі LOD, promoted-сіти, тест, SOLID.

ФАКТ (diff): PersonNode.ts — новий опт markAtMid; coercion effectiveLod = markAtMid && lod==='mid' ? 'far' : lod у create (рядок 234), і effectiveLod прокинуто в конструктор (this.lod), updateContent, applyChrome, applyPhoto (235,241-243). DiagramRenderer — markAtMid: config.staffReactChrome===true на 2 staff-create (896, 1024). Тест — новий кейс із контролем plainMid.

ФАКТ (споживачі this.lod): єдиний зовнішній/внутрішній читач this.lod у PersonNode — setHovered:339 (far → hoverRing off). reloadMedia:255 → applyPhoto(this.lod); для far applyPhoto:602 робить hidePhoto (мітка без фото — коректно). hitArea у drawCard:385 (гілка far → дот). Жоден зовнішній код у DiagramRenderer не читає node.lod (grep: лише PersonNode.ts:339 і OrganizationNode.ts:583 — окремий клас). Оскільки effectiveLod зберігається в this.lod, уся в'юшка послідовно «far» — немає місця, де очікується mid, а приходить far.

ФАКТ (гейт): PersonNodeView.create має РІВНО 2 виклики (DiagramRenderer 871, 1012) — обидва staff-шлях. Org-діаграма PersonNodeView не використовує. staffReactChrome default=false (types.ts:537), host ставить true лише коли змонтований backdrop (коментар 704). Demo/overlay-less споживачі лишаються на false → mid тримає картку. Гейт не зачіпає org і не зачіпає Pixi-споживачів без overlay.

ФАКТ (межі LOD): coercion спрацьовує лише при lod==='mid'; near→near, far→far. Тест markNear підтверджує, що near лишається карткою (name visible). near-гілки (avatar-tile/photo) не зачеплені.

ФАКТ (promoted): коментар 707-708 — promote overlay ховає сіти, які малює в React (view.visible=false). Для прихованих рендер moot; coercion будує far-контент, але він невидимий. Не впливає.

ФАКТ (тест): контроль справжній — plainMid (lod='mid', без прапора) показує nameText ('Іваненко Іван' visible через layoutCompactContent), markMid ховає (far: nameText.visible=false рядок 482), markNear показує. findText перевіряє visible && text. Дискримінує, не тавтологія. Запуск rstest: усі тести PersonNode.test.ts PASS, 0 failures, у т.ч. новий кейс.

ФАКТ (SOLID/KISS): coercion — один рядок у create, централізує правило mid→far в одному місці (краще за дублювання на 2 call-site). Прапор markAtMid не дублює staffReactChrome (різні рівні: config «host володіє chrome» vs per-node інструкція). Чисто.

NON-BLOCKING note: непіднятий mid-сіт як far-дот втрачає expand-chevron і context-menu кнопку (applyChrome:283 far → early return). Це inherent для far-мітки й збігається з рішенням власника «far-крапка, не картка» — поведінка свідома, не регресія в обсязі рішення. Варто знати хосту: fallback-сіт на mid некерований з канви (очікується, що host-overlay володіє взаємодією).

РІШЕННЯ: PASS. Блокерів немає.
