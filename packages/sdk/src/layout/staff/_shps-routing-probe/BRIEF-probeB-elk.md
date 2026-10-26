# Бриф: probe B (ELK.js) — рушій-кандидат B для рішення ШПС-роутера

Throwaway probe (plan `work/reports/shps-routing/plan.md`). Побудуй ОДИН файл:
`packages/sdk/src/layout/staff/_shps-routing-probe/probeB.elk.ts`, що експортує
`export const engine: ProbeEngine` (тип з `./probeTypes.js`).

## Контракт (строго)
Прочитай і дотримуйся:
- `./probeTypes.ts` — `RouteInput` → `RouteOutput`. Рушій САМ робить layout+routing.
- `./crossingDetector.ts` і `./clearance.ts` — чим вихід мірятимуть (НЕ редагуй їх).
- `./fixtures.ts` — вхідні схеми §10.1 (scheme2/scheme4/scheme5/perfScheme).

`RouteOutput`: `nodes[{id,x,y,w,h}]` (усі pos/positions з input, з координатами від ELK),
`deptFrames[{id,x,y,w,h}]` (bbox членів департаменту + padding), `edges[{fromId,toId,kind,
points[],marked?}]` (орто-полілінії; kind: 'admin' для внутрішньодеп. reportLine
parentId, 'inter-dept' якщо from/to у різних департаментах, 'lead-org' не потрібен тут).

## Вимоги поведінки (req 4311-shps-line-routing-requirements §2/§5/§6/§12)
- Дерево підпорядкування: `position.parentId` (null=корінь). Департамент: `deptId`;
  `department.parentPositionId` — керівна посада департаменту.
- Орто-маршрутизація (ELK `elk.edgeRouting: 'ORTHOGONAL'`), ієрархічні вузли = департаменти,
  діти = посади. Напрям зверху-вниз (`elk.direction: 'DOWN'`).
- Детермінізм ОБОВ'ЯЗКОВИЙ: той самий вхід → ідентичний вихід (сортуй вузли/ребра за
  (parentId, order, id) перед подачею в ELK; ELK з фіксованим seed/без рандому).
- card розмір: `input.cardWidth`/`input.cardHeight`.
- §12 деградація: якщо ELK дає перетини — поле `marked:true` на тих ребрах, що лишилися
  з перетином (позначити, не ховати). Для проби досить: після layout прогнати
  `edgeEdgeCrossings` на власному виході і marked=true на ребрах, чиї сегменти в перетині.

## Залежність
Додай `elkjs` (`npm install elkjs -w @org-hierarchy/sdk` — у devDependencies або deps SDK).
Використовуй headless ELK (`elkjs/lib/elk.bundled.js` або `ELK` конструктор) — БЕЗ web worker
(worker у jsdom/node не підніметься; `new ELK()` з синхронним/promise layout, без workerUrl).
`engine` має бути СИНХРОННОЮ (`ProbeEngine = (input) => RouteOutput`). ELK API — проміс.
Тому: або виконай layout наперед і кешуй, або (краще) зроби внутрішню async-функцію, а
`engine` синхронно поверне результат ПІДГОТОВЛЕНИЙ заздалегідь — АЛЕ контракт синхронний,
тож якщо ELK лише async: **зміни не можна**. Рішення: експортуй ДОДАТКОВО
`export async function layoutElk(input): Promise<RouteOutput>` і зроби `engine` обгорткою,
що кидає, якщо не прогріто; АБО узгодь зі мною зміну контракту на async. ПОЧНИ з того, що
напишеш `layoutElk` async і ЗАЛИШ `engine` як `throw new Error('use layoutElk (async)')`.
Я (owner) вирішу, чи робити харнес async. НЕ чіпай probeTypes.ts без узгодження.

## Гейти (перед «готово»)
- `npm run typecheck -w @org-hierarchy/sdk` — 0.
- `npm run lint -w @org-hierarchy/sdk` (або root `npm run lint`) — 0.
- Існуючі тести `_shps-routing-probe` лишаються зелені (ти додаєш лише probeB.elk.ts +
  package.json elkjs; НЕ чіпай crossingDetector/clearance/probeTypes/fixtures).
- Напиши КОРОТКИЙ `probeB.manual.md` поруч: як прогнати `layoutElk(scheme4())` і що вийшло
  (чи підняло ELK headless у node, версія elkjs, чи async-only).

РОБОЧИЙ ФАЙЛ (дописуй по кроках, append): `scratchpad/codex-probeB.md` у корені dg
(`/Users/strelia/projects/dg/scratchpad/codex-probeB.md`). Перший рядок — `ДАЛІ:` з планом.
Фінальна відповідь = стислий переказ: що зробив, чи ELK async-only, метрики на scheme4 якщо зміг.
НЕ коміть — лишаю рев'ю і коміт owner-у (мені).
