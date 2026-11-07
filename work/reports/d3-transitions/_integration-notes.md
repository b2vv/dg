# Хвиля 2 — інтеграційні шви (координатор), 2026-11-05

Зібрано з `_impl-T-C.md` (BLOCKED), `_impl-T-D.md` (DONE_WITH_CONCERNS), `_impl-T-E.md` (DONE_WITH_CONCERNS)
після першого проходу хвилі 2. T-E реалізував фасад, тож його очікування = контракт, який мають
задовольнити T-C (рендерер) і T-D (оверлей).

## 0. Контрактний баг (T-A2, у роботі)
`TweenAnimator.retarget(v)` при v===current скидав `elapsedMs=0` → хибно-зелений #11 (тест на фейку
`LinearAnimator`). Фікс T-A2: idempotent retarget. T-C покладається на #11 після T-A2.

## 1. Рендерер → фасад (settle-сигнал) — для перезапуску T-C
T-E (`OrgHierarchyDiagram.ts:513-522`) реалізував:
```ts
renderer.onTransitionFrame = () => {
  if (instance.getTransitionFrame()) instance.notifyPromoteSync('transition'); // кадр
  else instance.notifyPromoteSync('structural');                               // settle
};
// getTransitionFrame(): this.animate ? renderer.getTransitionFrame() ?? null : null  (:2142)
```
**Вимога до T-C:**
- `getTransitionFrame(): TransitionFrame | null` повертає `null`, коли контролер НЕ активний (після settle),
  а не `controller.frame()` (той після resetToTarget = непорожній `idleFrame`). Тобто
  `return controller.isActive() ? controller.frame() : null`.
- `onTransitionFrame` викликається щокадру (поки активний) **І один раз на settle** — у момент settle
  `getTransitionFrame()` вже має давати `null` (щоб фасад послав `'structural'`). Тобто спочатку завершити
  перехід у контролері (settle), потім викликати `onTransitionFrame`.

## 2. `RenderOptions.transition` / `RenderReason` — для T-C
T-E викликає `host.renderer.render(data, { ...options, transition: reason })` (`:954`), `reason: 'animate'|'snap'`.
T-C має:
- додати `transition?: RenderReason` у тип `RenderOptions` рендерера;
- визначити й експортувати `type RenderReason = 'animate' | 'snap'` (T-E має локальний дубль `:288` — структурно
  сумісний, тож компілюється; на фінальній інтеграції T-E можна перевести на імпорт, не блокер).

## 3. Backdrop lifecycle: `setStaffReactChromeMounted` — шов T-D ↔ T-E
T-E додав публічний `setStaffReactChromeMounted(mounted: boolean): Promise<void>` (`:2134`): під `animate`
демонтаж → `renderer.settleNow()` (рядок #40). **T-D цього не знав** (завершив першим проходом). Інтеграція
координатора: оверлей/backdrop T-D на mount/dispose має сповістити фасад (через колбек, який фасад передає
при створенні оверлея, АБО фасад сам обгортає mount/unmount). Узгодити ім'я й напрям виклику при рев'ю T-D.
Новий публічний метод → USAGE + facadeSurface gate (T-E заявив, що задокументував; перевірити на check:docs).

## 4. Публічні типи в барелі — поза T-E
T-E (`NEXT`) нагадав: експорт `AnimateOption` (і, можливо, `RenderReason`/`TransitionFrame` за потреби хоста) у
`packages/sdk/src/index.ts` — НЕ у власності T-E. Координатор додає при інтеграції + перевіряє barrelSurface gate
(нічого не має закінчуватись на `ForTests`).

## 5. Нові публічні методи фасаду (перевірити USAGE + facadeSurface.mjs)
`setStaffReactChromeMounted`, `getTransitionFrame` (+ нова семантика `getStaffChromeGeometry`). T-E заявив, що
USAGE оновив і прозу `prepare-camera` виправив (виключив активний animate). Перевірити `npm run check:docs`
на фінальному зведенні (не зараз — поки типи червоні через невбудований T-C).

## Порядок дій координатора
1. T-A2 landed+review+commit (контракт).
2. Перезапуск T-C з адендумом (шви §1, §2 вище) — чистий, 0 попередніх змін.
3. T-C landed → повний пакетний `typecheck -w` має позеленіти (резолвить 10 посилань T-E).
4. Рев'ю T-D ∥ T-E (gate-reviewer Standards+Spec), мутації.
5. Інтеграція §3 (backdrop lifecycle) + §4 (барель) + §5 (USAGE/gates).
6. Повний `npm test` + root `typecheck` + `build` — ЛИШЕ після «ок» cass-сесії (спільний dist).
