# React Flow public API contract — design reference for our library #2 ("React Flow analog", DOM/React nodes at close zoom)

**Date:** 2026-11-06
**React Flow version examined:** `@xyflow/react@12.12.1` (npm `latest`, published 2026-11-04);
prerelease `13.0.0-next.2` exists but its only visible change is bumping the React peer to `>=18`
and the `main` `CHANGELOG.md` carries **no 13.x feature entries** ⚠️ — v13 direction is **not**
grounded in a primary source, do not design against it.
**Builds on** the 2026-08-28 inventory in this folder (`findings-*`, `inventory-*`), done against
`@xyflow/react@12.11.5` / `@xyflow/system@0.0.81` @ xyflow commit `b1b99e9`.

## Staleness verdict of the 2026-08-28 inventory

**Still valid.** Every version between 12.11.5 and 12.12.1 is patch/minor only — connection-click
fixes, "don't mutate internal selection state" (#6097), `EdgeProps.pathOptions` typed off the edge
type instead of `any` (#5650), `nodeOrigin` respected in intersection tests (#6090), "always fire
`onResizeEnd` after `onResizeStart`" (#5998), and — most relevant to us — #6054 "Disconnect the
`ResizeObserver`s when a flow unmounts" (xyflow `packages/react/CHANGELOG.md`, 12.12.1 block). That
last one **confirms the shared-ResizeObserver measuring model is still the live design**, not a
thing that got replaced. The public data/node/edge/hook/instance contract **did not move**. Current
docs (reactflow.dev, "Last updated October 11, 2026") agree with the inventory on the
`ReactFlowInstance` surface and on `useNodesInitialized`.

> 🔴 Licence: React Flow is MIT (webkid GmbH). All claims below are **paraphrase + cite**; no source
> is pasted. `path:line` refers to the xyflow clone @ `b1b99e9` from the prior inventory.

---

## 1. The contract at a glance — RF API area → essence → verdict for #2

Verdict legend under our north-star (simpler than GoJS; typed functions/components; immutable data
in / events out; DI-friendly) **and** our Pixi-far constraint (the same node may render in Pixi far
and React near, driven by Rust-computed geometry):

| # | RF API area | Essence (how RF does it) | Source | Verdict for #2 |
|---|---|---|---|---|
| 1 | Controlled model | `nodes`/`edges` props + `onNodesChange`/`onEdgesChange`; host must `applyNodeChanges` itself | `component-props.ts:73,86`; `general.ts:35,50` | **ADAPT** — expose immutable-in/events-out, but we stay **uncontrolled-by-default** (geometry lives in Rust/WASM; per-frame host re-apply is too costly). Offer controlled **positions** as opt-in only. |
| 1b | Uncontrolled model | `defaultNodes`/`defaultEdges`, state lives in the store | `component-props.ts:88,90` | **ADOPT** — this is already our only model; just **name it**. |
| 1c | One change pipe | both modes funnel through `triggerNodeChanges` → `applyNodeChanges` | `store/index.ts:265` | **ADOPT the principle** — internal code never writes nodes directly, always emits a change array. This is what keeps the two modes from diverging; our `LayoutPatch` is the seed. |
| 1d | `useNodesState`/`useEdgesState` | 3-line `useState`+`applyNodeChanges` helper, "for prototyping" | `useNodesEdgesState.ts:45,51` | **REJECT** — React-first sugar; meaningless when the far layer is Pixi. |
| 1e | Change middleware | `experimental_useOnNodesChangeMiddleware` intercepts `(changes)=>changes` before host | `useOnNodesChangeMiddleware.ts:13` | **ADAPT** — the veto/preview seam we want (see §9), but as a typed callback return, not a hook. |
| 2 | Node type | `{id, position, data, type, measured{w,h}, hidden, selected, draggable, width/height, initialWidth/Height, parentId…}` | `system/src/types/nodes.ts` | **ADAPT** — keep `id`/`position`/`data`/`type`/`measured`; our `position` is **Rust-owned output**, not host input. `hidden`/`selected`/`draggable` = view-state, not node identity (we already split these into stores). |
| 2b | Custom nodes | `nodeTypes` map `type→Component`, must be a **stable** object or all nodes remount | `GraphView/useNodeOrEdgeTypesWarning.ts`; builtins `NodeWrapper/utils.tsx:16` | **ADOPT the registry shape** — `kind → renderer`. Critical for us: the registry key must resolve to **both** a React component (near) **and** a Pixi view (far). RF's `nodeTypes` is React-only; ours is dual-target. |
| 2c | `NodeProps` (what a custom node receives) | `id,data,type,width,height,selected,dragging,draggable,zIndex,isConnectable,positionAbsoluteX/Y,sourcePosition,targetPosition,dragHandle,parentId` — **no `position`/`style`/`measured`** | `system/src/types/nodes.ts:114-125`; `NodeWrapper/index.tsx:246` | **ADOPT the split** — the custom node draws **content only**; the wrapper owns frame/position/z/aria. Matches our `PersonNodeView` draws-content vs `DiagramRenderer` sets-world-position split already. |
| 2d | Node resizing | `<NodeResizer>` component writes width/height back; `onResizeStart/End` | `component-props`; CHANGELOG 12.12.0 #5998 | **ADAPT / defer** — host-driven resize conflicts with Rust-owned geometry. If adopted, resize must be a *request* that re-enters layout, not a direct write. |
| 3 | Edge model | `Edge` type, `edgeTypes` map, custom edges, markers, labels, path helpers (`getBezierPath` etc.) | inventory-3 §edges | **REJECT (mostly)** — our edges are **Rust-routed** (A* / ortho). We keep the edge *data* shape (`id,source,target,data`) for identity but **own routing**; RF's path-maths and `edgeTypes` do not fit. Expose only an edge **content/label** slot, not a path author. |
| 4 | Imperative instance | `useReactFlow()` → `ReactFlowInstance`: `fitView,setViewport,getViewport,setCenter,fitBounds,zoomIn/Out/To, screenToFlowPosition,flowToScreenPosition, getNodes/setNodes/getNode/updateNode/updateNodeData/addNodes, getEdges/setEdges/..., deleteElements, getInternalNode, getNodesBounds, getNodeConnections, toObject, viewportInitialized` | reactflow.dev `types/react-flow-instance` (2026-10-11); inventory-4 | **ADOPT selectively** — we already have ~60 class methods on `OrgHierarchyDiagram`. Take the **naming and granularity**: `updateNodeData(id, patch)`, `getNodesBounds`, `screenToFlowPosition`/`flowToScreenPosition`, `toObject`, `fitView`. These are the intuitive, GoJS-beating primitives. |
| 4b | `toObject()` | `{nodes, edges, viewport}` serialisation | inventory-4 (§toObject) | **ADOPT** — we have no aggregate snapshot; a `toObject()` for save/restore is a clean north-star primitive. |
| 5 | Hooks surface (19) | `useReactFlow,useStore/useStoreApi,useViewport,useNodes/useEdges,useNodesState/useEdgesState,useOnSelectionChange,useNodesInitialized,useUpdateNodeInternals,useConnection,useKeyPress,useNodesData,useHandleConnections…` | inventory-4 (§hooks) | **ADAPT a tiny subset** — hooks are React-first and we are renderer-agnostic. Essential concepts to re-expose as framework-neutral subscriptions/events: `useViewport` (→ `onViewportChange`), `useOnSelectionChange` (→ `onSelectionChange`, we have it), `useNodesInitialized` (→ our measured-ready signal, §3). Niche/reject: `useStore` selector access (couples host to internal store), `useKeyPress`, `useHandleConnections`. |
| 6 | Store architecture | one internal **zustand** store per `<ReactFlowProvider>`; host reads via `useStore(selector, equalityFn)`; 4 live `Map` lookups (`nodeLookup,parentLookup,edgeLookup,connectionLookup`) | inventory-4 (§store, §lookups); `store/index.ts` | **ADAPT** — keep the **lookup `Map`s** (we have none; cheap, high value). **Reject** exposing the raw store/selectors as public API — that leaks internals and breaks the "swap renderer" goal. The orchestrator (#4) owns state; #2 subscribes to typed events. |
| 7 | **Measuring / sizes** (HIGH) | one shared `ResizeObserver` for the whole flow; nodes self-unsubscribe once measured; `offsetWidth/Height`→`measured`; priority `measured ?? width ?? initialWidth ?? 0`; `useNodesInitialized` gates on all-measured | `NodeRenderer/useResizeObserver.ts:9-29`; `NodeWrapper/useNodeObserver.ts:31-39`; `system/src/utils/store.ts:401`; `general.ts:351,364` | **ADOPT the loop, ADAPT the mechanism** — this **is** our measured==drawn → feed-layout loop. See §3 in depth. |
| 8 | Layout | RF **does not lay out graphs**; host runs dagre/elk and writes `position` back | reactflow.dev layouting guide; inventory-4 (§layout) | **ADOPT the boundary** — confirms our split: #1 (dg-tidy WASM) is exactly the external layout RF lacks. #2 must treat `position` as **input it renders**, never computes. |
| 9 | Selection / interaction / connection | callback + change surface: `onNodesChange` (select change), `onSelectionChange`, `onConnect`/`onConnectStart/End`, `onBeforeDelete` veto | inventory-1; `system/src/utils/graph.ts:483` (`onBeforeDelete`) | **ADAPT** — adopt the **veto callback** pattern (`onBefore* → false` cancels); we already do this in `onContextMenu` (`callbacks.ts:20`). Connection-creation (drag-a-handle-to-connect) is an **editor** feature — defer; our org/staff edges are derived, not hand-drawn. |
| 10 | Viewport/camera | props (`defaultViewport,minZoom,maxZoom,translateExtent,fitView,panOnDrag,zoomOnScroll…`) + instance methods (see #4) | inventory-2a (deep) | **ADOPT the surface shape** — camera is renderer-shared (Pixi + DOM pan/zoom in lockstep). This belongs in **#4 orchestrator**, consumed by #2. inventory-2a is the deep reference; nothing moved. |

---

## 3. The measuring / size-feedback loop (in depth) — this feeds our #1 layout and #4 orchestrator

This is the single most important thing to copy *correctly*, because it is the exact loop our
vision names: **the measured element must equal the drawn element, and its size feeds the layout.**

### 3.1 How React Flow does it (cite-by-cite)

1. **One shared `ResizeObserver`** for the whole flow, created once in `NodeRenderer`
   (`container/NodeRenderer/useResizeObserver.ts:9-29`) — *not* one per node. 12.12.1 (#6054) adds
   explicit disconnect on unmount, so the lifecycle is: create on mount, observe each node, drop on
   unmount.
2. **Each node subscribes** via `useNodeObserver` (`components/NodeWrapper/useNodeObserver.ts:31-39`)
   and **unsubscribes the moment it is initialized** (`hasDimensions && handleBounds`). So the RO
   only ever watches nodes that have not yet been measured, or whose content changed size. This is
   the cheap-steady-state trick.
3. **On RO fire → `updateNodeInternals`** (`system/src/utils/store.ts:401`):
   - zoom read from the viewport CSS matrix: `new DOMMatrixReadOnly(style.transform).m22`
     (`store.ts:418-419`);
   - size: `node.offsetWidth/offsetHeight` (`system/src/utils/dom.ts:30`) — **integer px**, zoom-independent;
   - `getBoundingClientRect()` on the node (`store.ts:450`) for handle recompute;
   - handles via `querySelectorAll('.source'/'.target')` + rect / zoom (`dom.ts:68-93`).
4. **Size priority** (`system/src/utils/general.ts:351`): `measured.width ?? width ?? initialWidth ?? 0`.
   A host-set `width` is only a **fallback until measurement lands**; the measured value wins.
5. **First-paint anti-flicker**: a node sits in the DOM but `visibility:hidden` until measured
   (`NodeWrapper/index.tsx:207`, `nodeHasDimensions` `general.ts:364`); edges touching an unmeasured
   node **do not draw at all** (`getEdgePosition` returns `null`, `edges/positions.ts:19-32`).
   `initialWidth/initialHeight` exist precisely so the first frame has a size and does not blink.
6. **All-measured gate**: `useNodesInitialized()` returns `true` only when every node has width+height,
   flips to `false` when a new node is added until it too is measured, and is `false` on an empty set
   (reactflow.dev `hooks/use-nodes-initialized`). This is the signal a host waits on **before running
   its layout pass** (the dagre/elk recipe keys off exactly this).

**Known costs RF accepts** (inventory-3 §3.3): `offsetWidth` + `getBoundingClientRect` + computed-style
matrix read per node per batch = forced synchronous layout (noticeable on 500 nodes at once); integer
node size vs fractional handle rects → ~0.5px drift at non-integer zoom.

### 3.2 How we differ today, and what #2 must do

Our SDK today has **no measurement** — card size is a constant (`PERSON_CARD_WIDTH=136`,
`PERSON_CARD_HEIGHT=156`, `render/types.ts:261-262`), and text is **truncated by a character
heuristic** (`maxChars = maxWidth / (fontSize*0.58)`, `personCardContent.ts:76-83`) with three
different magic coefficients. That is fine for Pixi-far (fixed box = deterministic contours, grid,
ports) but is the **opposite** of what #2 needs: a React/DOM card at close zoom has
content-determined height (variable-height, uniform-width cards — the ШПС/org pattern from the vision
doc, `_recovered-vision.md:31`).

The loop #2 must implement:

```
host data  ─▶  #4 orchestrator  ─▶  #2 renders React card (content-sized, measured==drawn)
                      ▲                         │
                      │                    ResizeObserver (shared, self-unsubscribing)
                      │                         ▼
                      └──  measured {id, w, h}  ◀──  "all measured?" gate
                      │
                      ▼
               #1 dg-tidy WASM layout (size-aware)  ─▶  positions  ─▶  back to #2 / #3
```

Design rules extracted from RF, adapted to our Pixi-dual world:
- **One shared observer**, nodes self-unsubscribe once measured — adopt verbatim (it is the thing
  that makes steady state cheap).
- **`measured` is a separate field from any host-provided `width`** — adopt. Host size is a hint /
  SSR first-paint value; measured wins. This keeps "two SSOT" from reappearing (vision `:1261`).
- **An all-measured gate** (`nodesInitialized`-equivalent) is the **handshake between #2 and #1**:
  the orchestrator does not call the WASM layout until every *newly appeared* node reports a size.
  On expand/collapse/lazy-load (vision `:1235` — node set is dynamic, re-layout per expand is the
  norm), only the **new** nodes are unmeasured, so the gate re-arms for just them.
- **Measure in integer px but keep handle/port geometry in the Rust world-space**, not from DOM
  rects — this sidesteps RF's ~0.5px non-integer-zoom drift, because our ports come from layout, not
  from `getBoundingClientRect`.
- **Pixi-far parity**: the *same* measured w×h that #1 consumes must also size the Pixi card, so a
  node measured in React-near and later drawn in Pixi-far keeps its box. The measurement must
  therefore live in / flow through #4, not be private to the React renderer. RF's measurement is
  private to the DOM renderer; ours cannot be.

### 3.3 The one gap RF has that we must close deliberately

RF re-measures on **any** content resize (e.g. an `<img>` loading changes height →
`updateNodeInternals` → edge recompute, inventory-3 §3.11). For 600+ nodes that is a storm. Our
fixed-box Pixi path avoids it today. For #2 we must decide the **measurement trigger policy**:
measure on mount + explicit `invalidateSize(id)`, *not* on every async content change, or we inherit
RF's cost at scale. (Open question §5.)

---

## 4. Proposed #2 API shape (our terms — typed, north-star; interface sketch only, no RF code)

Framework-neutral core + a thin React binding. Immutable data in, events out, DI-friendly. `position`
is **layout output we render**, never host input.

```ts
// ---- core types (renderer-agnostic; shared by #2 React-near and #3 Pixi-far) ----
type NodeId = string & { readonly __brand: 'NodeId' };

interface DgNode<TData = unknown> {
  readonly id: NodeId;
  readonly kind: string;        // registry key → resolves to BOTH a React and a Pixi renderer
  readonly data: TData;         // immutable host payload
  readonly position: Readonly<{ x: number; y: number }>; // from #1 (Rust), read-only to #2
  readonly measured?: Readonly<{ width: number; height: number }>; // filled by #2's observer
  readonly sizeHint?: Readonly<{ width: number; height: number }>;  // first-paint only, measured wins
}
// view-state kept OUT of the node (we already split these into stores):
interface DgViewState { hidden: ReadonlySet<NodeId>; selected: ReadonlySet<NodeId>; }

// ---- the dual-target registry (RF's nodeTypes, extended for Pixi) ----
interface NodeRenderer<TData> {
  near: (props: DgNodeProps<TData>) => ReactElement;   // content only; frame/position owned by wrapper
  far?: (ctx: PixiNodeContext<TData>) => void;          // optional Pixi draw for far zoom
}
type NodeRegistry = Readonly<Record<string, NodeRenderer<any>>>; // must be stable identity

// what a near-renderer receives (RF's NodeProps split: content only)
interface DgNodeProps<TData> {
  readonly id: NodeId; readonly data: TData; readonly kind: string;
  readonly measured?: { width: number; height: number };
  readonly selected: boolean; readonly interactive: boolean;
  // NO position / style / zIndex — the wrapper owns those
}

// ---- the measured-size feedback contract (the §3 loop made explicit) ----
interface MeasureSink {
  report(id: NodeId, size: { width: number; height: number }): void;
  readonly allMeasured: boolean;                 // == RF useNodesInitialized
  onAllMeasured(cb: () => void): Unsubscribe;    // #4 waits on this before #1 layout
  invalidateSize(id: NodeId): void;              // explicit re-measure (NOT auto on every content change)
}

// ---- imperative handle (RF ReactFlowInstance, trimmed to intuitive primitives) ----
interface DgNearSurface<TData> {
  getNode(id: NodeId): DgNode<TData> | undefined;
  updateNodeData(id: NodeId, patch: Partial<TData>): void;   // RF updateNodeData
  getNodesBounds(ids?: readonly NodeId[]): Rect;             // RF getNodesBounds
  screenToWorld(p: XY): XY;                                  // RF screenToFlowPosition
  worldToScreen(p: XY): XY;                                  // RF flowToScreenPosition
  fitView(opts?: FitViewOptions): void;
  toObject(): { nodes: readonly DgNode<TData>[]; viewport: Viewport }; // RF toObject (save/restore)
}

// ---- events out (no controlled-mode obligation; veto via return) ----
interface DgNearCallbacks {
  onSelectionChange?(ids: readonly NodeId[]): void;
  onViewportChange?(v: Viewport): void;
  onNodeActivate?(id: NodeId): void;                         // click/open — host decides
  onBeforeLayoutApply?(patch: LayoutPatch): boolean | void;  // RF onBefore* veto; false cancels
}

// ---- mount: uncontrolled-by-default, data in / events out ----
function createNearRenderer<TData>(opts: {
  container: HTMLElement;
  registry: NodeRegistry;            // stable identity, like RF nodeTypes
  measure: MeasureSink;              // wired to #4 orchestrator + #1 layout
  callbacks?: DgNearCallbacks;
}): DgNearSurface<TData>;
```

Why this beats GoJS under the north-star: no string DSL (GoJS `GraphObject.make` / binding strings) —
plain typed components and functions; immutable `data` in, typed events out; the registry and
`MeasureSink` are injected (DI-friendly, testable without a DOM); and the *same* node definition can
drive Pixi-far because `kind` resolves to both renderers.

---

## 5. Open questions for the owner

> ✅ **RESOLVED 2026-11-06** (owner) — записано в `work/ROADMAP-4lib.md` §«Рішення власника — #2 API»:
> Q1 **Ні** (uncontrolled, position readonly) · Q2 **explicit `invalidateSize`** (рек.) · Q3 **#4 володіє, #2/#3 підписники** ·
> Q4 **малий підмножинний instance** (рек.) · Q5 **мінімальний edge label-slot** (контент хоста, позиція від SDK) ·
> Q6 **content-driven**, user-resize → беклог (принцип+механізм у roadmap) · Q7 **перевірка v13** лишається за агентом.
> Нижче — оригінальні формулювання (для контексту).


1. **Controlled positions — in or out?** RF's headline feature is controlled `nodes`. We said
   uncontrolled-only because geometry is Rust-owned. Do we ever want the host to *pin* a node's
   position (manual override that survives re-layout)? If yes, that is the one place a controlled
   channel is justified — and it changes the `position: readonly` decision above.
2. **Re-measure trigger policy (the §3.3 gap).** Measure on mount + explicit `invalidateSize` only,
   or auto-remeasure on content change like RF? Auto is simpler for hosts but reintroduces RF's
   600-node storm. Recommendation: explicit, with a documented `invalidateSize`.
3. **Does #2 own selection/hover state, or does #4?** RF keeps it in the store and emits changes. Our
   current split has `SelectionStore` in the SDK. For the 4-lib split, selection is cross-renderer
   (select in near, still selected in far) → argues for #4 ownership, #2 as a subscriber. Confirm.
4. **How much of `ReactFlowInstance` is public?** RF exposes ~25 imperative methods. We already have
   ~60 class methods and a `docs/USAGE.md` gate. Which subset is the *supported* #2 surface vs
   internal? (The sketch in §4 is a deliberately small proposal.)
5. **Edge content slot.** We reject RF's edge path-authoring (Rust routes edges), but org/ШПС cards
   have footer badges and edge labels. Does #2 need an edge **label/overlay** slot, or do labels ride
   on nodes only? RF has rich edge labels; we may want a minimal version.
6. **Node resize at close zoom.** The vision has variable-height cards. Is resize ever
   *user-initiated* (drag a corner), or purely content-driven? RF supports both via `<NodeResizer>`;
   user-resize fights Rust layout and needs a re-layout request path if adopted.
7. **v13 ⚠️.** `13.0.0-next.2` is published but undocumented. Before committing to any RF-shaped
   detail, confirm whether v13 reshapes the node/measuring contract — the current synthesis is sound
   for 12.x only.

---

### Sources
- npm registry `@xyflow/react` (latest `12.12.1`, 2026-11-04; `next` `13.0.0-next.2`).
- xyflow `packages/react/CHANGELOG.md` @ `main` (12.11.6 → 12.12.1 entries).
- reactflow.dev API reference: `hooks/use-react-flow`, `types/react-flow-instance` (upd. 2026-10-11),
  `hooks/use-nodes-initialized`.
- Prior inventory (2026-08-28, @12.11.5 / system 0.0.81 @ `b1b99e9`): `inventory-3-rendering.md`
  (§3.1–3.3, §3.11–3.12), `inventory-4-data-api.md`, `inventory-2a-camera.md`, `findings-*`.
- Our vision: `work/reports/library-split-4/_recovered-vision.md`.
