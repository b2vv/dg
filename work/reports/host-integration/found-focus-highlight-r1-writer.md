# Ф-R1 — writer report

База: `bulk-mutations` @ `e549827`. Без коміту, пушу та саморев’ю.

## 1. Зроблено

- `interaction/reportPath.ts` (новий): чистий admin-обхід, raw edge keys, visited guard.
- `state/ViewStateStore.ts`: highlightedNode / foundFocus.
- `render/SceneRegistry.ts`: listViews з typed key, view та baselineAlpha, знятою при registerView.
- `render/StaffEdgesView.ts`: lastSegments для legacy/v2, accent/dim і повернення звичайного stroke; `staffEdgeArrows.ts`: alpha для кінцевих крапок.
- `render/OrgEdgesView.ts`: кеш parsed segments і рівномірне приглушення.
- `render/DiagramRenderer.ts`: окремий repaintHighlight, refs через edges.children; guard готовності сцени, відновлення baseline, no-match reset.
- `OrgHierarchyDiagram.ts`: highlightPath/setFoundFocus, typed-кандидати для bare id, reapply після render, очищення при setData.
- `render/types.ts`: theme knobs, foundDimAlpha в обох гілках mergeTheme.
- `docs/USAGE.md`: контракт обох методів, нормалізація, скидання, defaults.

## 2. Тести та гейти

Нові `interaction/reportPath.test.ts`, `render/highlight.test.ts`; розширені `render/SceneRegistry.test.ts`, `render/theme.test.ts`.
Тести описують admin path/children/root/cycle/missing/non-admin; legacy/v2 accent/reset;
org dim; typed found/raw path; external baseline; null/empty/no-match reset;
reapply, deferred request, failed render, selection isolation, setData clearing; theme merge.

**Ці тести не виконано:** rstest не зміг відкрити сервер у sandbox.

| Гейт | Exit | Результат |
|---|---:|---|
| npm run test -w @org-hierarchy/sdk | 1 | 0 виконаних тестів; listen EPERM ::1:3000 |
| npm run typecheck -w @org-hierarchy/sdk | 0 | 0 TS-помилок |
| npx oxlint --max-warnings 0 (13 змінених TS-файлів) | 0 | 0 errors / 0 warnings; порожній stdout |
| node scripts/check-docs.mjs | 0 | 6 перевірок пройшли; briefing 10/25 комітів |

Повні сирі логи: `scratchpad/rdgf-{test,typecheck,oxlint,docs}.log`.
Початковий RED теж зупинився на EPERM (`scratchpad/rdgf-red.log`), тому red/green не підтверджено.
Проміжний typecheck знайшов 2 неповних StaffEdgeSegment fixture; виправлено.
Проміжний lint знайшов 3 explicit-length-check; виправлено.

## 3. Неочікуване

Sandbox забороняє rstest listen. Session checkpoint helper також повернув
`STATE_IO: exact state недоступний`; обхід permissions не виконувався.

## 4. Уточнення

Питання й найменш ризикові рішення записані в `scratchpad/codex-rdgf.md`:
empty/no-admin graph → root-only; unknown у непорожньому admin graph → empty.
Bare found id перетворюється на кандидати всіх трьох kinds; відсутність видимого
збігу скидає paint, але запит зберігається до наступного render.

## 5. Залишилось

Повний rstest поза sandbox та незалежне рев’ю користувачем.
Немає підтвердженого runtime/візуального результату; ручні canvas-проби не запускались.

## 6. Передача

Patch лише коду/тестів/USAGE: `scratchpad/rdgf.patch` (включає нові файли).
Наявні користувацькі `.gitignore` і дизайн-док не змінювались.

## Post-deploy

Не виконувався: деплою немає, коміт/пуш заборонені користувачем.
