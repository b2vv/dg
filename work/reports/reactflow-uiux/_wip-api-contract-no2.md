# WIP: React Flow public API contract → our lib #2

NEXT: прочитати існуючу RF-дослідку (findings-*, inventory-*) + vision-док library-split-4/_recovered-vision.md, щоб будувати поверх, не повторюючи. Потім оновити версію RF через WebSearch/WebFetch на reactflow.dev + xyflow GitHub.

FACT: vision — 4 частини: #1 dg-tidy WASM layout, #2 React Flow аналог (DOM near), #3 Pixi far, #4 orchestrator. Ключ: measured==drawn, ResizeObserver → годує розміри в layout. Той самий node може рендеритись у Pixi (far) і React (near). North-star: простіше за GoJS, typed functions/components, immutable in / events out, DI-friendly.
FACT: inventory-4 (2026-08-28, xyflow b1b99e9, @xyflow/react 12.11.5, @xyflow/system 0.0.81) детально покрив controlled/uncontrolled, Changes API, lookups, hooks(19), toObject, InternalNode. Вердикт попередній: ми uncontrolled-only; треба частково — veto/preview + batched changes.
NEXT: прочитати решту inventory-4, measuring-секцію inventory-3, inventory-2a camera, findings-source-reverse. Потім оновити версію RF (WebSearch/WebFetch).

FACT: npm latest = 12.12.1 (modified 2026-11-04), next = 13.0.0-next.2. Prior research @ 12.11.5.
FACT: 12.11.5 → 12.12.1 = лише patch/minor фікси (connection click, selection no-mutate, EdgeProps pathOptions типізація, nodeOrigin в intersection, onResizeEnd завжди після onResizeStart). 12.12.1 #6054: "Disconnect ResizeObserver on unmount" → підтверджує що shared-RO вимірювальна модель (inventory-3 §3.3) ЖИВА, не застаріла. Публічний контракт даних/нод/хуків НЕ рухався.
FACT: current docs підтверджують ReactFlowInstance surface = inventory-4: get/set Nodes+Edges, updateNode/updateNodeData, addNodes, deleteElements, getInternalNode, getNodesBounds, getNodeConnections/getHandleConnections, toObject, + viewport (fitView/setViewport/getViewport/setCenter/fitBounds/zoomIn/Out/To/screenToFlowPosition/flowToScreenPosition/viewportInitialized). intersection: getIntersectingNodes/isNodeIntersecting.
FACT: useNodesInitialized() → boolean, true коли ВСІ ноди виміряні (мають width/height); false поки нова нода не виміряна, false на порожньому масиві. Це точний аналог нашого measured==drawn гейта перед layout.
FACT: v13.0.0-next існує (prerelease), але main CHANGELOG.md не містить його записів (grep порожній) ⚠️ — напрям v13 не підтверджено з первинного джерела; не закладати в дизайн.
NEXT: написати deliverable api-contract-for-no2.md.

FACT: deliverable написано — api-contract-for-no2.md. Структура: header+staleness verdict / 10-рядкова таблиця RF-area→verdict / §3 measuring loop in depth / §4 proposed #2 API sketch (typed, dual-target registry, MeasureSink) / §5 7 open questions.
DECISION: inventory 2026-08-28 НЕ застаріла — лише patch-фікси до 12.12.1; переписувати не треба, лише надбудувати API-contract angle.
