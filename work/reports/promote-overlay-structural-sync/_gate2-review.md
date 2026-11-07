# GATE 2 review — promote-overlay-structural-sync

Model ID: claude-opus-4-8

ДАЛІ: читаю spec.md і plan.md, потім звіряю з кодом (createReactPromoteOverlay.ts, OrgHierarchyDiagram.ts, SceneRegistry.ts).

## ФАКТИ (звірка з кодом)

- sync() робить cancelSettle() на вході — createReactPromoteOverlay.ts:434. ПІДТВЕРДЖЕНО.
- sync() скидає catch-up: writeLayerTransform('') + syncedViewport=live — :438-439. onCameraChange рахує catch-up від syncedViewport — :481-483.
- 5 викликів notifyPromoteSync: 317 (selectionStore), 464 (setOnViewportChange), 471 (setOnResize), 999 (afterRender), 1659 (repaintSelection). ТОЧНО як у таблиці плану. Визначення :556-558.
- onViewportTransform рендерить ЛИШЕ при зміні LOD (:607 early-return), тож чистий пан = без render = без afterRender. afterRender лише з renderNow (:838←:994). AC3 hot-path гіпотеза ПІДТВЕРДЖЕНА.
- promoteSyncListeners: Set<()=>void> :325; listener() :557; публічний subscribePromoteSync(listener:()=>void) :598.
- SceneRegistry: setPromotedIds→applyPromoteVisibility; view.visible=!isPromoted (:157-160). setPromotedNodeIds([]) робить far-ноди видимими. Механізм бага A підтверджено.
- ДРУГИЙ in-repo споживач: createTestAnchorOverlay.ts:13 (власний інтерфейс (listener:()=>void)) + :166 subscribePromoteSync(sync). План його НЕ перелічив.

## АНАЛІЗ ГІПОТЕЗ
1. cancelSettle у sync — так (:434). 2. пан не кличе structural — так. 3. дефолт 'structural' безпечний (sync→live-rebuild, не ховає) — так. 4. ()=>void присвоюваний (reason)=>void — так (TS: менше параметрів OK); createTestAnchorOverlay лишається сумісним структурно. 5. host не чіпає — grep порожній по host, але є in-repo createTestAnchorOverlay.

## КРАЙНІЙ КЕЙС expand-під-час-пану
sync() негайний → writeLayerTransform('') стирає catch-up, рахує картки від live getViewport() (:435) → позиції коректні для поточної камери. Наступна pan-подія рахує catch-up від свіжого syncedViewport. catch-up НЕ ламається — чистий ресет. Негайний rebuild mid-pan допустимий (expand дискретний). ПІДТВЕРДЖЕНО.

## РІШЕННЯ
BLOCKING: немає. NON-BLOCKING: N1 (недовказані точки правки: інтерфейс :65, Set :325, listener(reason) :557 — typecheck зловить), N2 (createTestAnchorOverlay не перелічений, лишається сумісним), N3 (PromoteSyncReason тече в публічний .d.ts subscribePromoteSync — має бути export), N4 (else→camera для майбутнього 3-го reason — ніт).
Конституція: PASS. GATE: PASS.
