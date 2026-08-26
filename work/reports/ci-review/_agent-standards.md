# Standards review — diff 4dbb5f8...0b772b3

Попередник помер до першого запису. Починаю з нуля.

ФАКТ: перевірено `git show --stat 0b772b3` — 8 файлів, 382(+)/4(-). Файли: `.claude/standards.md`,
`.github/workflows/ai-review.yml` (new, 142), `.github/workflows/post-deploy.yml` (new, 53),
`AGENTS.md` (+26), `e2e/prod-smoke.spec.ts` (new, 62), `package.json` (+3/-1... actually 3 changed),
`playwright.prod.config.ts` (new, 22), `work/archive/README.md` (new, 26).

ДАЛІ: прочитати повний діф (/tmp/full.diff, 466 рядків), потім нову версію `.claude/standards.md`,
`AGENTS.md`, `work/CODING_STANDARDS.md`, `work/TDD.md`, `.github/workflows/ci.yml` для звірки.

## Крок 2 — повний діф прочитано (/tmp/full.diff, 466 рядків)

ФАКТ: `.github/workflows/ci.yml` (наявний, не в діфі) використовує `actions/checkout@v4`,
`actions/setup-node@v4`, `node-version: '22'` — новий `post-deploy.yml` пінить ті самі теги
(`@v4`) і той самий Node `'22'`. Розбіжності пінінгу/версій НЕМАЄ — новий workflow узгоджений
з наявним, а не гірший за нього. (Не порушення.)

ФАКТ: `package.json:21` додано `"test:prod": "playwright test --config playwright.prod.config.ts"` —
скрипт існує, як і заявлено в `.claude/standards.md:48`.

ФАКТ: `playwright.prod.config.ts` (22 рядки) — секції `webServer` немає, як заявлено в
`.claude/standards.md:48` ("без webServer"). Підтверджено.

ФАКТ: `e2e/prod-smoke.spec.ts` — усі `page.goto()` виклики без провідного слеша
(`page.goto('?e2e=1')` рядок ~29 в файлі, `page.goto('')` рядок ~42), відповідає заяві
в `.claude/standards.md:162-165` про base-relative шляхи.

ФАКТ: `grep goto( e2e/demoBridge.ts` → рядки 32,38 — `page.goto('/?e2e=1')` (провідний слеш).
Підтверджує коментар у самому `prod-smoke.spec.ts:342-345` про причину, чому файл не
перевикористовує `demoBridge.ts`. Узгоджено, не вигадка.

ФАКТ: URL `https://b2vv.github.io/dg/` захардкожено буквально **тричі**: (1)
`.github/workflows/post-deploy.yml:17` (`workflow_dispatch.inputs.url.default`), (2)
`.github/workflows/post-deploy.yml:44` (`PROD_URL: ${{ github.event.inputs.url || '...' }}`),
(3) `playwright.prod.config.ts:18` (`baseURL: process.env.PROD_URL ?? '...'`).

ЗНАХІДКА (запах, судження — Duplicated Code / втрачений SSOT): той самий магічний рядок
у трьох місцях у двох файлах. Перейменування репо/користувача GH Pages (напр. якщо
`b2vv` → інший namespace) вимагає синхронної правки в трьох місцях; розбіжність між
дефолтом workflow_dispatch і дефолтом Playwright config непомітно розійдеться, якщо хтось
поправить лише один. Не заборонено жодним написаним стандартом — це судження, не порушення.

ФАКТ: `.github/workflows/ai-review.yml`, job `standards` (рядки ~24-45 у файлі) і job
`spec-and-edges` (рядки ~59-79) — обидва мають ідентичний за формою блок:
`env.HAS_KEY` через `secrets.ANTHROPIC_API_KEY != '' && 'true' || 'false'`, крок
"No API key — say so and stop" з `if: env.HAS_KEY != 'true'`, і крок
`anthropics/claude-code-action@v1` з `if: env.HAS_KEY == 'true'`. Дослівно повторено
в обох job'ах (jobs в GH Actions не мають спільного "extends"/reusable step тут).

ЗНАХІДКА (запах, судження — Duplicated Code): boilerplate HAS_KEY/skip-notice повторено
2 рази замість composite action чи reusable workflow (`workflow_call`). GH Actions це
підтримує; за KISS-порогом (`.claude/standards.md` "Поріг пайплайна") це не new subsystem,
тож не обов'язково рефакторити, але як запах — Duplicated Code, потенційна Shotgun Surgery
якщо треба міняти логіку виявлення ключа.

## Крок 3 — чесність гейта (ключова знахідка)

ФАКТ: `.claude/standards.md:58-59` стверджує: "поки його [ANTHROPIC_API_KEY] немає — job
чесно рапортує `skipped`, а не проходить мовчки." Те саме повторює коміт-месидж
0b772b3 і `AGENTS.md`.

ФАКТ: у `.github/workflows/ai-review.yml` умова `skipped`-поведінки реалізована на рівні
КРОКУ (`if: env.HAS_KEY != 'true'` / `if: env.HAS_KEY == 'true'`), а не на рівні job
(`jobs.<id>.if`). У GitHub Actions conclusion джоба — це агрегат по його кроках: якщо
крок пропущено через `if: false`, а решта кроків (checkout, echo-нотіс) успішні, то
**job має conclusion `success`**, а не `skipped`. `skipped` для джоба показується, лише
коли `if` стоїть на самому job (або залежність не виконалась).

ЗНАХІДКА — ТВЕРДЕ ПОРУШЕННЯ ЧЕСНОСТІ ГЕЙТА (не Фаулер-запах, а розбіжність між
задокументованою поведінкою і фактичною): без секрету PR-чек "AI review / Pass 1 — standards"
і "Pass 2 — spec, edges, safety" у списку статусів PR покажуться зеленою галочкою
("Success"), НЕ як "Skipped". `::notice`-анотація (рядок з `echo "::notice title=AI review
skipped::..."`) справді неcиловою — вона видима, але лише якщо відкрити деталі джоба;
у зведеному списку чеків на PR немає нічого, що відрізняло б цей "успіх без огляду" від
реального пройденого рев'ю. Це і є той сценарій "проходить зелено, вдаючи роботу", який
задача просила перевірити явно. Документація (`standards.md`, `AGENTS.md`, коміт-месидж)
описує це неточно ("job чесно рапортує skipped") — фактично рапортує success із
захованою анотацією, а не skipped-статус джоба.

DALI: перевірити permissions-блок ai-review.yml на зайві write-права; TDD.md на
success/failure покриття prod-smoke.spec.ts; Мірник-межі для root-level TS файлів.

## Крок 4 — permissions (безпека)

ФАКТ: `.github/workflows/ai-review.yml:12-16` — permissions на рівні workflow (успадковують
обидва job'и, per-job override відсутній):
```
permissions:
  contents: read
  pull-requests: write
  issues: write
  id-token: write
```
Тригер — `pull_request` (не `pull_request_target`), чекаут дефолтний (merge ref PR) —
секрет `ANTHROPIC_API_KEY` не потрапляє на файлову систему і не логується жодним echo/run.
Це правильна, безпечніша форма проти `pull_request_target` + checkout PR-коду.

ЗНАХІДКА (судження, безпека — надлишкове write-право): `id-token: write` ніде не
використовується — у файлі немає жодного кроку, що споживає OIDC-токен (немає
`configure-aws-credentials`, `google-github-actions/auth`, `actions/attest`, тощо).
Це порушує принцип найменшої привілеї, який задача просила перевірити явно
("чи не даються write-права там, де досить read"); не задокументовано жодним
написаним правилом репо — не hard violation, а судження зайвої видачі permission.
`issues: write` поряд з `pull-requests: write` теж може бути надлишковим (обидва
покривають частково пересічні API для коментарів/лейблів PR) — нижчого пріоритету
судження, не перевірено остаточно.

## Крок 5 — TDD.md на нові TS-тести

ФАКТ: `work/TDD.md` §2 "Два класи тестів (обов'язково обидва)" — "Кожна нова функція /
модуль / feature має мати success і failure кейси". Мірник (`.claude/standards.md:12`):
TDD.md діє на "увесь репо (TS і Rust)" — без обмеження на packages/sdk|demo, на відміну
від `work/CODING_STANDARDS.md`.

ФАКТ: `e2e/prod-smoke.spec.ts` — 3 тести, усі happy-path: "live build loads and reports
bundle", "flat orgs renders diagram", "100k orgs becomes ready". Жодного тесту на
failure-шлях (недоступний URL, non-200 відповідь, timeout деплою, зламаний бандл).
`expect(response?.status()).toBe(200)` — це success-асерт всередині happy-теста, не
окремий failure-кейс.

ЗНАХІДКА (порушення задокументованого стандарту, з застереженням): формально
`work/TDD.md` вимагає success+failure на кожен новий модуль репо-вайд, а
`e2e/prod-smoke.spec.ts` — новий модуль лише з happy-path. Застереження: TDD.md писаний
з прикладами юніт-рівня ("unknown dept, empty positions, null container, worker timeout")
і, ймовірно, малося на увазі виробничий код, не post-deploy smoke, де ти не контролюєш
збій інфраструктури як вхідні дані — тому це радше межовий, а не безумовний, case
застосування правила. Не applicability exception написана явно в TDD.md для e2e/smoke —
тому формально це порушення букви стандарту.

## Крок 6 — межі Мірника для root-рівневих TS-файлів

ФАКТ: `.claude/standards.md:10` — `work/CODING_STANDARDS.md` діє **тільки** на
`packages/sdk`, `packages/demo`. Нові файли `e2e/prod-smoke.spec.ts` і
`playwright.prod.config.ts` лежать у корені репо / `e2e/`, НЕ під `packages/sdk` чи
`packages/demo`. За текстом самого мірника, `CODING_STANDARDS.md` (Clean Code/SOLID/
Pocock) до цих двох файлів **не застосовний за побудовою** — так само як
Pocock-знахідка на `.rs` "хибна за побудовою" (наведено як приклад у самій задачі).
Це важливо зафіксувати, щоб не приписати цим файлам порушень Pocock/CODING_STANDARDS,
яких мірник на них не накладає.

Це завершує перевірку. Переходжу до фінального звіту (≤400 слів).
