# TD06 — Vitest не налаштовано для SDK

**Пріоритет:** високий (блокує TDD для TS)  
**Статус:** відкрито  
**Дата:** 2026-08-20

## Опис

Політика [`work/TDD.md`](../TDD.md) вимагає **success + failure** тестів перед кодом для TypeScript SDK.  
Наразі в monorepo є лише `npm run test:rust`; **Vitest (або інший runner) для `packages/sdk` відсутній**.

## Наслідки

- T01–T06 не можуть формально дотримуватись TDD на TS-шарі
- Немає CI gate для SDK unit tests
- Pixi/DOM тести потребують jsdom або `@vitest/browser`

## Рекомендовані дії

1. Додати `vitest` + `jsdom` у `packages/sdk/devDependencies`
2. Script: `"test": "vitest run"`, `"test:watch": "vitest"`
3. `vitest.config.ts` — alias на `@org-hierarchy/sdk`, wasm mock
4. Root CI: `npm run test -w @org-hierarchy/sdk`
5. Перший тест: `flatRowsToDiagram` success + failure (empty input)

## Критерії закриття

- [ ] `npm run test -w @org-hierarchy/sdk` проходить
- [ ] ≥ 1 success + ≥ 1 failure test у repo
- [ ] CI workflow включає SDK tests

## Зв'язок

- [`work/TDD.md`](../TDD.md) §3
- Перша задача, що додає TS tests: T01 або окремий setup PR перед T01
