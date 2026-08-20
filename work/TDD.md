# TDD — політика розробки (обов'язково)

> **Перед написанням production-коду — спочатку тести.**  
> Кожна задача з `work/tasks/` виконується за циклом Red → Green → Refactor.

---

## 1. Золоте правило

```
1. RED    — написати тест(и), які падають (функції ще немає або поведінка не та)
2. GREEN  — мінімальний код, щоб тести пройшли
3. REFACTOR — прибрати дублювання, не ламаючи тести
```

**Заборонено:** писати impl «на потім додам тести».  
**Виняток:** spike/prototype ≤ 50 рядків для дослідження — одразу після spike тести + rewrite.

---

## 2. Два класи тестів (обов'язково обидва)

Кожна нова функція / модуль / feature має мати **success** і **failure** кейси.

| Клас | Призначення | Приклади |
|------|-------------|----------|
| **Success (happy path)** | Очікувана коректна поведінка | variant B contour, mount canvas, map 100 rows |
| **Failure (error path)** | Невалідний вхід, порожні дані, boundary, throw/Err | unknown dept, empty positions, null container, worker timeout |

### Мінімум на feature

| Розмір зміни | Success | Failure |
|--------------|---------|---------|
| Одна функція | ≥ 1 | ≥ 1 |
| Новий модуль | ≥ 2 | ≥ 2 |
| Задача T01–T07 | покрити всі acceptance criteria success | ≥ 1 failure на кожен публічний API entry |

---

## 3. Іменування та структура

### Rust (`packages/core/`)

```
src/foo.rs          — impl
src/foo.rs #[cfg(test)] mod tests { ... }   — unit tests поруч
```

```rust
#[test]
fn compute_contour_variant_b_success() { ... }

#[test]
fn compute_contour_empty_dept_returns_err() {
    let result = compute_dept_contour("IT", &[], &default_cfg());
    assert!(result.is_err());
}
```

- Success: `*_success`, `*_works`, `*_returns_expected`
- Failure: `*_returns_err`, `*_empty_*`, `*_invalid_*`, `*_rejects_*`

Запуск: `npm run test:rust` або `cargo test` у `packages/core`.

### TypeScript (`packages/sdk/`)

```
packages/sdk/src/foo/foo.ts
packages/sdk/src/foo/foo.test.ts    — або __tests__/foo.test.ts
```

**Tooling (TODO — додати при першій TS-задачі):** Vitest + `@vitest/browser` або jsdom для DOM/Pixi mocks.

```ts
describe('computeDeptContour', () => {
  it('success: returns SVG path for VARIANT_B', async () => { ... });

  it('failure: rejects when wasm not initialized and init fails', async () => { ... });
});
```

- Success: `it('success: ...')` або `it('should ... when valid input')`
- Failure: `it('failure: ...')` або `it('throws when ...')`

Запуск (target): `npm run test -w @org-hierarchy/sdk`

---

## 4. Workflow для задачі (T01–T07)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Прочитати task MD + acceptance criteria              │
│ 2. Виписати test list (success + failure) у PR/commit 1 │
│ 3. RED: commit «test: ...» — CI падає                    │
│ 4. GREEN: commit «feat: ...» — CI зелений               │
│ 5. REFACTOR: commit «refactor: ...» якщо потрібно       │
│    (Clean Code / SOLID — див. CODING_STANDARDS.md)      │
│ 6. Оновити task status + acceptance checkboxes          │
└─────────────────────────────────────────────────────────┘
```

Стандарти якості TS (Clean Architecture, SOLID, DRY, KISS, GoF): [`CODING_STANDARDS.md`](./CODING_STANDARDS.md), SPEC §13.
### Test list template (у PR description або коментар до task)

```markdown
## Tests (TDD)

### Success
- [ ] ...
- [ ] ...

### Failure
- [ ] ...
- [ ] ...
```

---

## 5. Приклади failure-кейсів по шарах

### WASM / Rust

| Сценарій | Очікування |
|----------|------------|
| `departmentId` без positions | `Err("no positions...")` |
| Invalid JSON у wasm bindgen | `JsValue` error |
| `padding_cells < 0` | clamp або reject (за spec) |
| Disconnected own (M4) | 2 contours або explicit error |

### SDK / TS

| Сценарій | Очікування |
|----------|------------|
| `create(null, config)` | throw |
| `data` без mapper і не DiagramData | throw |
| Worker message timeout | reject Promise |
| WASM load failure | fallback або throw з message |

### Pixi / Render

| Сценарій | Очікування |
|----------|------------|
| `destroy()` двічі | no throw, no leak |
| container 0×0 size | graceful skip або min size |
| invalid SVG path | empty Graphics, log warn |

### Layout / Interactions

| Сценарій | Очікування |
|----------|------------|
| cycle in org parent links | throw або break cycle |
| search empty string | `[]` |
| drag person на foreign cell | reject або snap back |

---

## 6. CI (target)

Кожен PR має проходити:

```yaml
- cargo test                    # Rust unit + integration
- npm run test -w @org-hierarchy/sdk
- npm run typecheck -w @org-hierarchy/sdk
- npm run build:wasm            # pkg in sync
```

PR **не мерджиться**, якщо:
- додano impl без нових тестів (success + failure)
- тести падають
- coverage критичного шляху зменшився (коли увімкнемо coverage gate)

---

## 7. Референс: contour (вже з TDD-підходом)

`packages/core/src/contour.rs`:

| Тест | Клас |
|------|------|
| `variant_a_it_wraps_p4_with_notch` | success |
| `variant_b_no_vertical_wall_right_of_p4` | success |
| `foreign_not_in_own_contour` | success |
| *(missing)* empty dept | **failure — додати в T07** |

Нові зміни в contour — **спочатку** тест, потім impl.

---

## 8. Checklist для рев'ю

- [ ] Тести написані **до** або в тому ж PR першим комітом перед impl
- [ ] Є ≥ 1 success test
- [ ] Є ≥ 1 failure test
- [ ] Acceptance criteria з task MD покриті тестами
- [ ] Тести детерміновані (без flaky timeout без mock timers)
- [ ] Назви тестів описують поведінку, не impl detail

---

## Зв'язок з документами

| Документ | Зміст |
|----------|-------|
| `work/TDD.md` | ця політика |
| `work/tasks/T*.md` | секція «TDD» з конкретними тестами для задачі |
| `work/SPEC.md` §12 | процес розробки (summary) |
| `docs/REQUIREMENTS.md` | бізнес-вимоги → success tests |
