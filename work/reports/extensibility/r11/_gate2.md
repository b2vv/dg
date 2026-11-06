claude-opus-4-8

# GATE-2 (plan-critique + plan-defense) — R11 wrapper-obstacle routing

NEXT: read grounding Rust + TS input, verify (a) wrappers extend existing obstacle list, (b) WASM boundary, (c) nested self-exclusion mechanism.

FACT: plan.md/spec.md read. Plan: R11-A (Rust wrappers→obstacles, self-exclusion ancestor chain + endpoints (d), clearance (c), collapsed dock (b)); R11-B (TS fills StaffRoutingInput). Grounds on staff_router.rs + staff_clearance.rs; TS StaffRoutingInput (staffRouterV2.ts).

FACT: staff_router.rs read (A* router: route_scene/astar_route/build_corridor_grid). Self-exclusion is SINGLE-LEVEL: own-endpoint cards relax raw-rect on own port column (:1042); frames get per-part role Source/Target/foreign via dept_ok (:541) keyed on member_of→(dept,part). NO ancestor-chain / nesting concept.

FACT: types.rs read. WASM-boundary serialized input = StaffLayoutInput. EdgeRect/FrameRect/Rect/DeptPart INTERNAL Rust (no TS/Serialize) — built inside Rust. Dept frames derived internally. So wrappers derivable in Rust → NO types.rs change; only collapsed-grid (TS-side) may need a new StaffLayoutInput field + build:wasm.

FACT: staff_clearance.rs is `#[cfg(test)]` (lib.rs:6-7) — TEST-ONLY oracle. Prod clearance = MIN_CARD_PAD=8 (staff_routes.rs) / MIN_CLEARANCE_PX=8 (staff_router.rs); both prod routers already inflate 8px.

FACT: THREE+ routers. staffRouterV2.ts resolveStaffRouting/buildStaffEdgeSegments (TS detour, live+SVG seam); staff_routes.rs side_detour (Rust DETOUR, StaffGeometryResult.routes producer, default); staff_router.rs route_scene (A*, DEFAULT_STAFF_ASTAR=false); staff_mockup_layout.rs route_astar (alpha path). Config defaults all OFF (types.ts:533-540).

DECISION (rev.1): 2 BLOCKING (router identity; nested self-exclusion). GATE RED.

---

## REV.2 RE-CHECK (coordinator: both blockers addressed)

FACT: plan.md rev.2 read. §1 rewritten with B1/B2 sections; §3 WASM contract names StaffLayoutInput; §4 R11-A targets staff_router.rs route_scene with containment + NaN-guard + fallback; R11-B conditional.

B1 — VERIFIED CLOSED. Plan now targets ONE router: A* `staff_router.rs route_scene`, grounded in owner decision dg31 (memory staff-link-routing-astar: "A* у Rust ... V-B мертвий як рантайм"). route_scene IS the engine invoked when use_astar=true (staff_routes.rs resolve_staff_routes :497-503, docstring :544 "Route every edge through the A* pipeline (route_scene)"). Plan honestly flags A* is gated (DEFAULT_STAFF_ASTAR=false staff_routes.rs:491; use_astar.unwrap_or(false) staff_layout.rs:1809) → host-reach needs a separate A*-enable migration at owner-review (§1/§5/§4). The rev.1 StaffRoutingInput (TS-detour) conflation is explicitly withdrawn (§1 line 10). This is an owner-scoped, internally-coherent target with honest host-reach caveat. The mockup-path A* (staff_mockup_layout.rs) is NOT addressed, but per dg31 the owner's runtime router is route_scene and the mockup is a separate alpha/comparison path — defensible scoping, non-blocking.

B2 — VERIFIED CLOSED. Geometric containment: endpoint-rect ⊂ wrapper-rect → all wrappers containing either endpoint excluded from THAT line's obstacles (§1 lines 17-22, R11-A). This is the KISS mechanism flagged as the clean option in rev.1. Implementable in route_scene (endpoint rects = cards with from_id/to_id; wrapper rects = frames/collapsed boxes; pure rect-containment test), layered on existing own-endpoint(:1042)/own-frame(:541) exemptions. Nesting dept⊃grid handled automatically (both contain endpoint → both excluded). Needs no parent metadata, no new input. Concrete and correct.

Defense Q1 (NaN/degenerate) — CLOSED as plan item: R11-A adds "NaN/degenerate-guard (не панікувати в wall()/finalize_lines)" — directly addresses the `.expect("finite geometry, no NaN")` panic (staff_router.rs:347,367). Implementation must actually guard.

Defense Q4 (shared-innermost-wrapper) — CLOSED: both endpoints in same innermost wrapper → wrapper contains both → excluded for the line → routes within it. Covered by containment.

Non-blocking residue (NOT gate-blocking):
- §2 reuse table line 32 still cites test-only "staff_clearance.rs" for clearance; §1 line 24 prose correctly says MIN_CARD_PAD/MIN_CLEARANCE_PX. Stale table row — fix in implementation, not a gate blocker.
- Containment uses strict ⊂; a straddling/partial endpoint rect would leave a wrapper as obstacle (could trap). Endpoints are laid out inside their wrapper so full containment is normal; if brittle, use a center-point or tolerance test. Refinement, non-blocking.

GATE: GREEN.
