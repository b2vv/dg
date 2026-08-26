# Spec review — 4dbb5f8...0b772b3 (парал. сесія, залита без рев'ю)

ФАКТ: перевірено .claude/standards.md:37-73 (Машинні гейти + "чого не ловлять"),
AGENTS.md:25-45 (Pocock-межа, мірник), work/archive/README.md:1-26 (вказівники, не копії).

ДАЛІ: читаю .github/workflows/ai-review.yml, post-deploy.yml, pages.yml, ci.yml,
e2e/prod-smoke.spec.ts, playwright.prod.config.ts, package.json, e2e/demoBridge.ts.

ФАКТ: .github/workflows/post-deploy.yml:9-11 `workflows: ['Deploy demo (GitHub Pages)']`
співпадає з .github/workflows/pages.yml:1 `name: Deploy demo (GitHub Pages)` дослівно;
conclusion-гейт post-deploy.yml:27 коректний. Хук НЕ мертвий за іменем/тригером.

ФАКТ: e2e/prod-smoke.spec.ts:22,35 — `page.goto('?e2e=1')` / `page.goto('')` (без слеша,
base-relative); e2e/demoBridge.ts:32,38 — `page.goto('/?e2e=1')` (зі слешем). Нотатка
в prod-smoke.spec.ts:12-16 і standards.md:162-165 підтверджена кодом.

ФАКТ: ai-review.yml — job `standards` (рядки 23-87, fetch-depth 1, промпт про мірник/Конституцію)
і job `spec-and-edges` (рядки 89-142, fetch-depth 0, промпт про spec/edges/boundaries + `gh pr edit`
лейбл) — різні контексти, різні tool-allowlist. Заява "два незалежні" підтверджена.

ЗНАХІДКА 1 (в, хибне): `npx playwright test --list` (корінь, дефолтний playwright.config.ts,
testDir: './e2e', без testIgnore) включає всі три тести prod-smoke.spec.ts у список 49 тестів —
той самий файл, що виконує `npm run test:prod` (playwright.prod.config.ts). `npm run test:e2e`
= голий `playwright test` → підхоплює корінний конфіг → **prod-smoke.spec.ts виконується і там,
і там**. Це прямий конфлікт двох playwright-конфігів, якого стандарт не документує і не виключає
(немає testIgnore/testMatch у playwright.config.ts). Тест проти "живого деплою" за задумом
(коментар у файлі рядки 7-10: "already covered by the local e2e suite") насправді сам себе
дублює під локальний preview через test:e2e/test:verify.

ЗНАХІДКА 2 (б, scope creep): commit message обіцяє для standards.md лише "machine-gate rows +
note про base-relative Pages". Реальний diff (.claude/standards.md) додає ЩЕ:
- заміну рядка "Типи, що перетинають WASM-межу" (`packages/core/bindings` → `.../pkg`) на
  ts-rs/rust-types.ts опис (нова секція "Rust і TS — один репо...", ~20 рядків);
- нову секцію "Життєвий цикл задачі — work/" з таблицею tasks/tech-debt/archive.
Жодне з цього не згадано в commit message.
Аналогічно AGENTS.md: заявлено лише "Pocock TS-only + вказівник на standards.md", але diff додає
ще секцію "### Pipeline" (research→plan→critique→...→post-deploy, перелік скілів) — теж поза
описом коміту.

ДАЛІ: пишу фінальний звіт (<400 слів).
