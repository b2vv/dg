NEXT: Read the R11 plan/spec and Rust scene boundary before writing tests.
FACT: Read R11-A in full and local .ai/README.md. Scope is Rust router and module tests; no build:wasm, shared builds, branch changes, commits, or external store.
DECISION: Follow the brief's English-only instruction for all subsequent task output.
FACT: Read R11 plan rev.2 and spec; rev.2 explicitly supersedes the spec's stale StaffRoutingInput reference. The first decision is whether collapsed-grid geometry is available at StaffLayoutInput.
NEXT: Inspect the Rust input and routing scene against the TS collapsed-grid producer before changing any source.
FACT: StaffLayoutInput has organization parent IDs and expandedOrgIds, but route_scene receives only cards, frames, edges and department membership. StaffOrgInput has no T113 matrix order or layout coordinates. The TS planner explicitly leaves geometry to its caller.
NEXT: Check the actual staff and organization layout producers to distinguish reconstructible geometry from an absent scene.
FACT: Confirmed the boundary mismatch in packages/sdk/src/layout/rowTreeLayout.ts: computeOrgRowTreeLayout plans T113 grids, transforms them into chains, invokes the separate org WASM layout, and restores matrix coordinates. None of those settled nodes or grid memberships are passed to StaffLayoutInput.
FACT: packages/core/src/staff_layout.rs:1626-1695 builds only direct-child staff org cards with compose_org_cards; expandedOrgIds controls expand-in-place staff blocks. It does not implement the T113 organization grid. StaffOrgInput carries only id and parentOrgId; reconstructing a bounding box from staff cards would describe a different scene.
FACT: packages/core/src/staff_router.rs:913 accepts cards/frames/edges/member_of only. packages/core/src/staff_routes.rs:631 is the production call site; threading new wrapper data also requires coordinator changes outside this worker's exclusive file list.
FACT: Inspected existing endpoint exemption, per-frame dept_ok, finite-geometry expect sites, and failed/best_effort semantics. No source changes or cargo runs were made: the brief requires resolving this boundary as step 1 before TDD implementation.
FACT: A search included nonexistent packages/sdk/src/layout/orgEdges.ts and reported that missing path; the conclusion above rests on the actual rowTreeLayout.ts and staff_layout.rs producers, not that failed search.
DECISION: STOP at the explicit R11-A step-1 QUESTION boundary. Do not invent T113 geometry from staff tiers, change types.rs, or implement a partial router before the contract is resolved.
QUESTION: Can the coordinator add StaffLayoutInput.collapsedGridWrappers (Rust collapsed_grid_wrappers, serde default empty), with entries { id, memberIds, x, y, width, height } in the SAME settled coordinate system as the routed staff scene, and thread these through staff_layout/staff_routes into route_scene? memberIds identifies endpoints whose docking moves to the wrapper edge; geometric containment remains the ancestor-exclusion rule. The coordinator must resolve how the separate T113 org scene supplies matching coordinates, own the boundary types and TS producer, and run build:wasm.
NEXT: Resume after the coordinator confirms and supplies that contract/threading; then add success/failure cargo tests, capture RED output in full, implement wrapper obstacles/self-exclusion/docking/validation, and capture full GREEN cargo test and clippy output without pipes.
FACT: Only this append-only working file was written. Concurrent SDK changes were observed and left untouched. No build:wasm, npm build, root typecheck, emitting tsc, branch/worktree operation, commit, push, or external-store write was performed. This file is the durable in-repository checkpoint; the brief prohibits an external store.
STATUS BLOCKED — QUESTION: coordinator-owned StaffLayoutInput.collapsedGridWrappers contract and scene-coordinate/threading resolution required; Rust unchanged, cargo not run.

NEXT: Resume under owner scope correction (plan rev.3 §8): frames only, cargo test only.
DECISION: The earlier boundary QUESTION is superseded. No types.rs, StaffLayoutInput field, collapsed-grid geometry/docking, build:wasm, or clippy in this task.
FACT: Read brief, plan §8, spec, standards manifest, TDD policy and current router. Existing frame grid coordinates are unvalidated; A* only recognizes one membership key per endpoint. Foreign frames currently use a separate 14px rule.
DECISION: Test at the explicitly requested route_scene seam. Use full raw endpoint-rect containment for all ancestors; retain membership-based dept_ok for non-containing own frames. Foreign wrappers use the shared 8px clearance. Align detection so internal elbows and rip-up obey the same wrapper exemptions and clearance.
NEXT: Add success/failure tests before production edits and capture full unpiped cargo output.
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
error[E0369]: binary operation `==` cannot be applied to type `Vec<types::StaffRoutePoint>`
    --> src/staff_router.rs:2018:13
     |
2018 |             assert_eq!(routes[0].points, vec![pt(200.0, 80.0), pt(200.0, 400.0)]);
     |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |             |
     |             Vec<types::StaffRoutePoint>
     |             Vec<types::StaffRoutePoint>
     |
note: an implementation of `PartialEq` might be missing for `types::StaffRoutePoint`
    --> src/types.rs:606:1
     |
 606 | pub struct StaffRoutePoint {
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^ must implement `PartialEq`
help: consider annotating `types::StaffRoutePoint` with `#[derive(PartialEq)]`
    -->  src/types.rs:606:1
     |
 606 + #[derive(PartialEq)]
 607 | pub struct StaffRoutePoint {
     |

error[E0369]: binary operation `==` cannot be applied to type `Vec<types::StaffRoutePoint>`
    --> src/staff_router.rs:2030:9
     |
2030 |         assert_ne!(routes[0].points, wrapper_scene(&[])[0].points);
     |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |         |
     |         Vec<types::StaffRoutePoint>
     |         Vec<types::StaffRoutePoint>
     |
note: an implementation of `PartialEq` might be missing for `types::StaffRoutePoint`
    --> src/types.rs:606:1
     |
 606 | pub struct StaffRoutePoint {
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^ must implement `PartialEq`
help: consider annotating `types::StaffRoutePoint` with `#[derive(PartialEq)]`
    -->  src/types.rs:606:1
     |
 606 + #[derive(PartialEq)]
 607 | pub struct StaffRoutePoint {
     |

error[E0369]: binary operation `==` cannot be applied to type `Vec<types::StaffRoutePoint>`
    --> src/staff_router.rs:2049:13
     |
2049 |             assert_eq!(routes[0].points, baseline[0].points);
     |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |             |
     |             Vec<types::StaffRoutePoint>
     |             Vec<types::StaffRoutePoint>
     |
note: an implementation of `PartialEq` might be missing for `types::StaffRoutePoint`
    --> src/types.rs:606:1
     |
 606 | pub struct StaffRoutePoint {
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^ must implement `PartialEq`
help: consider annotating `types::StaffRoutePoint` with `#[derive(PartialEq)]`
    -->  src/types.rs:606:1
     |
 606 + #[derive(PartialEq)]
 607 | pub struct StaffRoutePoint {
     |

error[E0369]: binary operation `==` cannot be applied to type `Vec<types::StaffRoutePoint>`
    --> src/staff_router.rs:2058:9
     |
2058 |         assert_eq!(routes[0].points, vec![pt(200.0, 80.0), pt(200.0, 400.0)]);
     |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |         |
     |         Vec<types::StaffRoutePoint>
     |         Vec<types::StaffRoutePoint>
     |
note: an implementation of `PartialEq` might be missing for `types::StaffRoutePoint`
    --> src/types.rs:606:1
     |
 606 | pub struct StaffRoutePoint {
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^ must implement `PartialEq`
help: consider annotating `types::StaffRoutePoint` with `#[derive(PartialEq)]`
    -->  src/types.rs:606:1
     |
 606 + #[derive(PartialEq)]
 607 | pub struct StaffRoutePoint {
     |

error[E0369]: binary operation `==` cannot be applied to type `std::option::Option<&types::StaffRoutePoint>`
    --> src/staff_router.rs:2066:9
     |
2066 |         assert_eq!(routes[0].points.first(), Some(&pt(200.0, 80.0)));
     |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |         |
     |         std::option::Option<&types::StaffRoutePoint>
     |         std::option::Option<&types::StaffRoutePoint>
     |
note: an implementation of `PartialEq` might be missing for `types::StaffRoutePoint`
    --> src/types.rs:606:1
     |
 606 | pub struct StaffRoutePoint {
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^ must implement `PartialEq`
help: consider annotating `types::StaffRoutePoint` with `#[derive(PartialEq)]`
    -->  src/types.rs:606:1
     |
 606 + #[derive(PartialEq)]
 607 | pub struct StaffRoutePoint {
     |

error[E0369]: binary operation `==` cannot be applied to type `std::option::Option<&types::StaffRoutePoint>`
    --> src/staff_router.rs:2067:9
     |
2067 |         assert_eq!(routes[0].points.last(), Some(&pt(200.0, 400.0)));
     |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |         |
     |         std::option::Option<&types::StaffRoutePoint>
     |         std::option::Option<&types::StaffRoutePoint>
     |
note: an implementation of `PartialEq` might be missing for `types::StaffRoutePoint`
    --> src/types.rs:606:1
     |
 606 | pub struct StaffRoutePoint {
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^ must implement `PartialEq`
help: consider annotating `types::StaffRoutePoint` with `#[derive(PartialEq)]`
    -->  src/types.rs:606:1
     |
 606 + #[derive(PartialEq)]
 607 | pub struct StaffRoutePoint {
     |

error[E0369]: binary operation `==` cannot be applied to type `Vec<types::StaffRoutePoint>`
    --> src/staff_router.rs:2080:9
     |
2080 |         assert_ne!(routes[0].points, route_ortho(&cards[0], &cards[1]));
     |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |         |
     |         Vec<types::StaffRoutePoint>
     |         Vec<types::StaffRoutePoint>
     |
note: an implementation of `PartialEq` might be missing for `types::StaffRoutePoint`
    --> src/types.rs:606:1
     |
 606 | pub struct StaffRoutePoint {
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^ must implement `PartialEq`
help: consider annotating `types::StaffRoutePoint` with `#[derive(PartialEq)]`
    -->  src/types.rs:606:1
     |
 606 + #[derive(PartialEq)]
 607 | pub struct StaffRoutePoint {
     |

For more information about this error, try `rustc --explain E0369`.
error: could not compile `org-hierarchy-core` (lib test) due to 7 previous errors
warning: build failed, waiting for other jobs to finish...
FACT: First test compile failed because StaffRoutePoint lacks PartialEq. Corrected assertions to compare coordinate tuples; types.rs remains untouched. This compile failure is not behavioral RED evidence.
NEXT: Run the six wrapper tests against unchanged production code.
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 3.24s
     Running unittests src/lib.rs (packages/core/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 6 tests
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... FAILED
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... FAILED
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... FAILED
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... ok

failures:

---- staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity stdout ----

thread 'staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity' (3731689) panicked at src/staff_router.rs:346:39:
finite geometry, no NaN
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace

---- staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted stdout ----

thread 'staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted' (3731688) panicked at src/staff_router.rs:2084:9:
assertion `left != right` failed
  left: [(100.0, 80.0), (100.0, 240.0), (300.0, 240.0), (300.0, 400.0)]
 right: [(100.0, 80.0), (100.0, 240.0), (300.0, 240.0), (300.0, 400.0)]

---- staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded stdout ----

thread 'staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded' (3731691) panicked at src/staff_router.rs:2021:13:
ancestor count 1


failures:
    staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted
    staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity
    staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded

test result: FAILED. 3 passed; 3 failed; 0 ignored; 0 measured; 213 filtered out; finished in 0.00s

error: test failed, to rerun pass `--lib`
FACT: Behavioral RED: 3 failed, 3 passed (exit 101). Ancestor exit failed, NaN panicked in wall(), and internal elbow stayed 4px from a foreign frame. Full output above.
DECISION: Add validated frames to the per-edge flat card/wrapper obstacle list with 8px padding. Preserve dept_ok only for membership-owned frames not geometrically containing an endpoint. Full containment uses endpoint docking rects, not their potentially larger obstacle regions.
NEXT: Validate implementation with focused cargo tests, then full cargo test.
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 2.71s
     Running unittests src/lib.rs (packages/core/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 6 tests
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... ok
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... ok
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... ok

test result: ok. 6 passed; 0 failed; 0 ignored; 0 measured; 213 filtered out; finished in 0.01s

     Running tests/multi_source_parent.rs (packages/core/target/debug/deps/multi_source_parent-388af635cfedc713)

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 8 filtered out; finished in 0.00s

   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.36s
     Running unittests src/lib.rs (packages/core/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 219 tests
test org_layout::tests::layout_failure_negative_height ... ok
test org_layout::tests::layout_failure_nan_node_width ... ok
test org_tree::tests::extract_subtree_failure_unknown ... ok
test org_tree::tests::validate_failure_unknown_parent ... ok
test org_tree::tests::validate_failure_duplicate_id ... ok
test org_layout::tests::layout_failure_unknown_root ... ok
test org_tree::tests::validate_failure_cycle ... ok
test org_tree::tests::extract_subtree_keeps_sibling_order ... ok
test org_layout::tests::layout_failure_unknown_parent ... ok
test org_tree::tests::extract_subtree_success ... ok
test org_tree::tests::validate_success_single_root ... ok
test staff_bounds::tests::empty_nodes_fall_back_to_band_and_canvas_width ... ok
test hierarchy::tests::build_from_flat_defaults_status_from_person ... ok
test hierarchy::tests::build_from_flat_keeps_sibling_order ... ok
test ploeg_layout::tests::ploeg_layered_siblings_same_row ... ok
test ploeg_layout::tests::ploeg_layered_parent_above_children ... ok
test ploeg_layout::tests::ploeg_layered_lone_child_keeps_parent_x ... ok
test ploeg_layout::tests::ploeg_layered_sibling_chains_form_a_grid ... ok
test staff_bounds::tests::org_cards_empty_falls_back_to_canvas_width ... ok
test staff_bounds::tests::org_cards_union_cards_and_tier3_nodes ... ok
test staff_bounds::tests::enrich_fills_geometry_and_keeps_identity ... ok
test staff_bounds::tests::label_band_widens_only_the_top ... ok
test staff_bounds::tests::content_padding_grows_block_by_overhang_both_sides ... ok
test staff_bounds::tests::content_padding_zero_equals_bare ... ok
test staff_bounds::tests::staff_block_bounds_union_nodes_for_org_and_tier ... ok
test staff_clearance::tests::card_clearance_clean_route_has_zero_violations ... ok
test staff_clearance::tests::card_clearance_exempts_own_endpoints ... ok
test staff_clearance::tests::card_clearance_intruding_route_reports_violations ... ok
test staff_clearance::tests::card_clearance_uses_figma_row_obstacle_not_tile ... ok
test org_layout::tests::layout_success_depth_monotonic ... ok
test staff_clearance::tests::foreign_frame_clean_route_has_zero ... ok
test staff_clearance::tests::foreign_frame_org_endpoint_is_non_member ... ok
test staff_clearance::tests::foreign_frame_per_part_other_part_is_foreign ... ok
test staff_clearance::tests::foreign_frame_own_part_not_counted ... ok
test staff_clearance::tests::foreign_frame_through_third_frame_is_counted ... ok
test staff_clearance::tests::interior_hit_uses_eps_not_exact_zero ... ok
test staff_compose::tests::canvas_dimensions_empty_uses_margin_floor ... ok
test staff_compose::tests::canvas_dimensions_right_extents_returns_expected ... ok
test staff_compose::tests::nonpositive_axis_shift_keeps_nodes_anchored ... ok
test staff_compose::tests::org_cards_empty_children_keep_cursor ... ok
test staff_compose::tests::org_cards_empty_expansion_keeps_card_column_size ... ok
test staff_compose::tests::org_cards_with_expanded_child_returns_expected ... ok
test staff_compose::tests::recenters_all_managing_nodes_right_returns_expected ... ok
test staff_compose::tests::stacks_two_staff_block_tiers_with_band_reservation ... ok
test staff_edge_box::tests::far_collapses_to_centered_dot ... ok
test staff_edge_box::tests::far_small_node_hits_dot_floor ... ok
test staff_edge_box::tests::mid_collapses_to_band_ignoring_hints ... ok
test staff_edge_box::tests::mid_small_node_hits_band_floor ... ok
test staff_edge_box::tests::near_figma_row_docks_on_tile_with_row_obstacle ... ok
test staff_edge_box::tests::near_gojs_row_shortens_aabb ... ok
test staff_edge_box::tests::near_without_hints_is_full_box ... ok
test staff_edge_box::tests::org_far_chip_clamped_to_small_box ... ok
test staff_edge_box::tests::org_far_is_centered_symbol_chip ... ok
test staff_edge_box::tests::org_near_and_mid_are_full_box ... ok
test staff_edge_box::tests::unknown_lod_falls_back_to_far ... ok
test staff_geom::tests::distance_measures_gap ... ok
test staff_geom::tests::distance_zero_when_segment_crosses_rect ... ok
test staff_geom::tests::obstacle_rect_prefers_obstacle_over_box ... ok
test staff_layout::tests::card_pad_is_never_below_the_min_clearance ... ok
test staff_layout::tests::connected_tree_empty_returns_empty ... ok
test staff_layout::tests::admin_descendants_include_self_and_subtree ... ok
test staff_layout::tests::connected_tree_single_node_keeps_org_role_and_size_override ... ok
test staff_layout::tests::connected_tree_recenters_root_over_bbox ... ok
test staff_layout::tests::dept_grouping_no_department_bucket_last_and_unstamped ... ok
test staff_layout::tests::dept_head_absent_for_dept_with_no_outside_rooted_member ... ok
test staff_layout::tests::dept_grouping_order_overrides_id_alphabet ... ok
test staff_layout::tests::dept_grouping_places_second_dept_right_and_stamps_dept ... ok
test staff_layout::tests::dept_head_ignores_positions_without_department ... ok
test staff_layout::tests::dept_head_excludes_member_with_parent_inside_same_dept ... ok
test staff_layout::tests::dept_head_is_member_whose_admin_parent_is_outside_dept ... ok
test staff_layout::tests::dept_head_multi_root_is_deterministic_by_position_id_not_input_order ... ok
test staff_layout::tests::dept_grouping_unknown_department_falls_back_to_no_dept ... ok
test staff_layout::tests::dept_grouping_member_sibling_order_follows_order_not_id ... ok
test staff_layout::tests::detached_roots_are_parentless_non_heads ... ok
test staff_layout::tests::orchestrator_dept_grouping_emits_frames ... ok
test staff_layout::tests::orchestrator_expanded_child_places_staff_tier3 ... ok
test staff_layout::tests::orchestrator_unknown_current_org_errors ... ok
test staff_layout::tests::orchestrator_zero_positions_current_empty_but_valid ... ok
test staff_layout::tests::org_block_empty_org_returns_zero ... ok
test staff_layout::tests::orchestrator_single_org_tier2_only ... ok
test staff_layout::tests::orchestrator_managing_tier1_and_lead_org_edge ... ok
test staff_layout::tests::orchestrator_tier3_cards_and_lead_org_to_cards ... ok
test staff_layout::tests::pin_external_pushes_block_down_and_adds_edge ... ok
test staff_layout::tests::pin_external_skipped_when_manager_unknown ... ok
test staff_layout::tests::orchestrator_determinism_identical_twice ... ok
test staff_layout::tests::org_block_single_position_tree ... ok
test staff_layout::tests::resolve_head_single_is_head ... ok
test staff_layout::tests::org_block_filters_other_orgs ... ok
test staff_layout::tests::resolve_head_errors_on_ambiguity ... ok
test staff_layout::tests::resolve_head_single_parentless_when_no_is_head ... ok
test staff_layout::tests::resolve_person_hints_maps_both_variants_one_to_one ... ok
test staff_layout::tests::side_column_collision_ejects_second_box_down_deterministically ... ok
test staff_layout::tests::side_column_offsets_groups_right_of_anchors ... ok
test staff_layout::tests::orchestrator_tier2_shift_equals_block_plus_margin ... ok
test staff_layout::tests::tree_block_cycle_does_not_panic_and_places_all ... ok
test staff_layout::tests::org_block_determinism_identical_twice ... ok
test staff_layout::tests::tree_block_child_dept_sits_below_parent ... ok
test staff_layout::tests::tree_block_head_uses_declaration_order_not_parent_id ... ok
test staff_layout::tests::tree_block_stamps_department_id ... ok
test staff_layout::tests::tree_block_no_dept_singleton_sits_under_parent_dept ... ok
test staff_mockup_layout::tests::dump_mockup_golden ... ignored
test staff_layout::tests::tree_block_singleton_stays_near_its_no_dept_parent ... ok
test staff_layout::tests::tree_block_places_detached_right_of_attached ... ok
test staff_layout::tests::tree_block_siblings_ordered_by_attachment_x ... ok
test staff_layout::tests::tree_block_singleton_placement_is_stable_with_missing_parent_and_cycle ... ok
test staff_layout::tests::tree_block_singletons_balance_width_not_sibling_count ... ok
test staff_mockup_layout::tests::between_blocks_uses_bv_not_lv ... ok
test staff_mockup_layout::tests::invalid_or_duplicate_sizes_are_errors_not_fallbacks ... ok
test staff_mockup_layout::tests::emits_parent_child_edges ... ok
test staff_layout::tests::singleton_attachment_aligns_with_sibling_department_frame ... ok
test staff_mockup_layout::tests::a_wider_card_pushes_its_siblings_apart ... ok
test staff_mockup_layout::tests::a_row_is_top_aligned_and_the_next_row_clears_its_tallest_card ... ok
test staff_mockup_layout::tests::places_all_nodes_and_dept_frame ... ok
test staff_packing::tests::department_cards_sit_below_header_and_frame_includes_it ... ok
test staff_packing::tests::empty_department_is_excluded_without_panicking ... ok
test staff_mockup_layout::tests::a_taller_card_grows_its_department_frame ... ok
test staff_packing::tests::loose_root_aligns_with_department_row_and_has_no_frame ... ok
test staff_packing::tests::single_member_frame_expands_bbox_by_padding ... ok
test staff_packing::tests::multi_member_frame_wraps_union_aabb ... ok
test staff_packing::tests::split_department_stamps_part_index_on_frames_and_nodes ... ok
test staff_packing::tests::two_departments_frame_edge_gap_equals_horizontal_gap ... ok
test staff_router::tests::astar_detours_around_a_foreign_card ... ok
test staff_router::tests::astar_degrades_to_best_effort_on_an_off_grid_port ... ok
test staff_router::tests::astar_is_deterministic ... ok
test staff_router::tests::clean_scene_is_all_zero ... ok
test staff_mockup_layout::tests::output_is_deterministic ... ok
test staff_router::tests::astar_routes_orthogonally_and_enters_target_from_above ... ok
test staff_router::tests::corridor_grid_frames_contribute_coordinates_not_blocking ... ok
test staff_router::tests::corridor_grid_blocks_under_padded_cards_only ... ok
test staff_router::tests::crossing_between_different_managers_is_counted ... ok
test staff_router::tests::corridor_grid_is_sparse_well_formed_and_card_aligned ... ok
test staff_router::tests::astar_detours_around_a_foreign_frame ... ok
test staff_router::tests::diagonal_segment_is_detected_by_the_ortho_probe ... ok
test staff_router::tests::line_on_card_boundary_is_near_not_through ... ok
test staff_router::tests::line_through_card_interior_is_through_not_near ... ok
test staff_router::tests::line_through_foreign_frame_is_counted ... ok
test staff_router::tests::own_endpoint_card_is_never_a_violation ... ok
test staff_router::tests::partial_overlap_of_different_managers_is_counted ... ok
test staff_router::tests::occupancy_pushes_a_foreign_line_onto_its_own_lane ... ok
test staff_mockup_layout::tests::within_dept_uses_lv_between_levels ... ok
test staff_router::tests::releasing_occupancy_restores_the_straight_route ... ok
test staff_mockup_layout::tests::the_bus_runs_below_the_row_not_below_a_shorter_manager ... ok
test staff_router::tests::ripup_is_deterministic_and_a_noop_when_already_clean ... ok
test staff_router::tests::route_edges_occupies_a_best_effort_edge_without_panicking ... ok
test staff_router::tests::route_stats_detailed_flags_both_edges_of_a_crossing ... ok
test staff_router::tests::shared_bus_of_siblings_is_not_an_overlap ... ok
test staff_router::tests::sibling_bus_junction_is_not_a_crossing ... ok
test staff_router::tests::straight_through_sibling_trunk_is_not_a_crossing ... ok
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... ok
test staff_router::tests::ripup_bends_a_dirty_internal_elbow ... ok
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... ok
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_routes::tests::admin_vertical_blocked_horizontal_clean_takes_horizontal ... ok
test staff_routes::tests::admin_vertical_clean_stays_vertical ... ok
test staff_routes::tests::aligned_x_produces_straight_two_point_route ... ok
test staff_routes::tests::avoidance_detours_resolvable_block_clearing_violations ... ok
test staff_routes::tests::avoidance_is_byte_identical_when_no_card_blocks ... ok
test staff_routes::tests::avoidance_is_deterministic_across_runs ... ok
test staff_routes::tests::avoidance_leaves_unresolvable_block_as_remnant ... ok
test staff_routes::tests::card_index_matches_naive_including_near_miss_outside_bbox ... ok
test staff_routes::tests::card_index_near_miss_is_detected_as_blocker ... ok
test staff_routes::tests::clean_schemas_have_no_violations ... ok
test staff_routes::tests::collinear_z_fallback_has_no_true_turns ... ok
test staff_routes::tests::corridor_y_is_midpoint_matching_legacy ... ok
test staff_routes::tests::cross_dept_admin_into_head_docks_on_frame_top ... ok
test staff_routes::tests::dept_top_port_tracks_head_cx_not_source_cx ... ok
test staff_routes::tests::detour_leaves_a_violation_on_the_hard_schemas ... ok
test staff_routes::tests::elbow_endpoints_sit_on_center_ports_and_is_orthogonal ... ok
test staff_routes::tests::figma_hint_docks_source_port_on_tile_center ... ok
test staff_routes::tests::foreign_frame_resolvable_is_avoided_without_marker ... ok
test staff_routes::tests::foreign_frame_resolvable_via_side_detour ... ok
test staff_routes::tests::foreign_frame_unresolvable_is_marked ... ok
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... ok
test staff_routes::tests::h6_combined_scene_matches_golden ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... ok
test staff_routes::tests::intra_dept_admin_stays_on_card_top ... ok
test staff_routes::tests::lead_org_person_to_org_card_resolves ... ok
test staff_routes::tests::marker_equals_detector_by_construction ... ok
test staff_routes::tests::matrix_edge_prefers_horizontal_side_ports ... ok
test staff_routes::tests::matrix_child_above_routes_vertical_upward ... ok
test staff_routes::tests::near_no_hints_is_numerically_identical_to_raw_node_route ... ok
test staff_routes::tests::no_frames_means_no_marker_and_parity ... ok
test staff_routes::tests::non_admin_into_head_does_not_dock_on_frame_top ... ok
test staff_routes::tests::h6_combined_scene_is_byte_identical_across_runs ... ok
test staff_routes::tests::own_frame_is_neither_obstacle_nor_marked ... ok
test staff_routes::tests::person_wins_over_org_card_on_id_collision ... ok
test staff_routes::tests::oracle_clean_fixture_zero_violations_and_frame_is_detected ... ok
test staff_routes::tests::preserves_input_edge_order ... ok
test staff_routes::tests::route_horizontal_none_without_clear_gap ... ok
test staff_routes::tests::route_vertical_direction_and_nullable ... ok
test staff_routes::tests::same_band_admin_flips_to_horizontal ... ok
test staff_routes::tests::skips_self_loop_and_dangling_and_stamps_lod ... ok
test staff_routes::tests::side_detour_is_deterministic_across_frame_reorder ... ok
test staff_routes::tests::true_turns_ignores_duplicates_and_counts_direction_changes ... ok
test staff_routes::tests::turn_limit_uses_endpoint_department_and_part ... ok
test staff_routes::tests::turn_totals_exclude_marked_failures_only_from_excess ... ok
test tests::flat_build_works ... ok
test tests::resolve_layout_metric_none_uses_default ... ok
test tests::resolve_layout_metric_rejects_infinity ... ok
test tests::resolve_layout_metric_rejects_nan_instead_of_default ... ok
test types::layout_metric_tests::layout_options_validate_rejects_nan ... ok
test types::layout_metric_tests::some_nan_does_not_fall_back_to_default ... ok
test types::staff_contract_tests::metrics_validate_accepts_defaults ... ok
test types::staff_contract_tests::metrics_validate_rejects_nan_size ... ok
test types::staff_contract_tests::metrics_validate_rejects_nonpositive_size ... ok
test types::staff_contract_tests::staff_dock_hint_deserializes_camelcase_variants ... ok
test staff_routes::tests::t7_internal_tree_edges_are_ortho_elbows ... ok
test types::staff_contract_tests::staff_dock_hint_input_nested_roundtrip_camelcase ... ok
test types::staff_contract_tests::staff_layout_input_dock_hints_defaults_empty_when_key_omitted ... ok
test staff_router::tests::ripup_clears_a_crossing_that_single_pass_leaves ... ok
test staff_router::tests::route_edges_single_pass_separates_two_managers ... ok
test staff_routes::tests::ac10_all_schemas_zero_violations ... ok
test staff_routes::tests::t8a_astar_branch_routes_far_lod_scene_with_org_on_grid ... ok
test hierarchy::tests::build_from_flat_handles_a_chain_that_used_to_blow_the_stack ... ok
test staff_mockup_layout::tests::mock3_astar_zero_crossings_and_card_hits ... ok
test staff_mockup_layout::tests::mixed_heights_on_the_full_scene_keep_zero_crossings_and_card_hits ... ok
test staff_mockup_layout::tests::mock3_astar_deterministic ... ok
test staff_mockup_layout::tests::equal_sizes_reproduce_the_pre_change_golden ... ok

test result: ok. 218 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.16s

     Running tests/multi_source_parent.rs (packages/core/target/debug/deps/multi_source_parent-388af635cfedc713)

running 8 tests
test multi_source_parent_breaks_equal_scores_lexicographically ... ok
test multi_source_parent_prefers_fewer_turns_before_lexicographic_order ... FAILED
test multi_source_parent_requires_tree_blocks_and_grouping ... ok
test multi_source_parent_falls_back_above_cap_and_ignores_one_parent_block ... ok
test multi_source_parent_chooses_clean_attachment_deterministically ... FAILED
test tree_block_default_mock3_head_is_ah_under_fin_deterministically ... FAILED
test multi_source_parent_evaluates_exactly_twelve_combinations ... ok
   Compiling proc-macro2 v1.0.107
   Compiling unicode-ident v1.0.24
   Compiling quote v1.0.47
   Compiling autocfg v1.5.1
   Compiling cfg-if v1.0.4
   Compiling libm v0.2.16
   Compiling wasm-bindgen-shared v0.2.127
   Compiling rustversion v1.0.23
   Compiling libc v0.2.189
   Compiling zerocopy v0.8.56
   Compiling bumpalo v3.20.3
   Compiling serde_core v1.0.229
   Compiling futures-task v0.3.34
   Compiling pin-project-lite v0.2.17
   Compiling futures-core v0.3.34
   Compiling once_cell v1.21.4
   Compiling slab v0.4.12
   Compiling zmij v1.0.23
   Compiling serde v1.0.229
   Compiling num-traits v0.2.19
   Compiling futures-util v0.3.34
   Compiling serde_json v1.0.151
   Compiling memchr v2.8.3
   Compiling syn v2.0.119
   Compiling syn v3.0.3
   Compiling getrandom v0.2.17
   Compiling rand_core v0.6.4
   Compiling itoa v1.0.18
   Compiling thiserror v2.0.20
   Compiling termcolor v1.4.1
   Compiling nu-ansi-term v0.50.3
   Compiling oorandom v11.1.5
   Compiling wasm-bindgen-test-shared v0.2.127
   Compiling cast v0.3.0
   Compiling wasm-bindgen v0.2.127
   Compiling wasm-bindgen-macro-support v0.2.127
   Compiling lazy_static v1.5.0
   Compiling serde_derive v1.0.229
   Compiling thiserror-impl v2.0.20
   Compiling async-trait v0.1.92
   Compiling ppv-lite86 v0.2.21
   Compiling ts-rs-macros v10.1.0
   Compiling wasm-bindgen-test-macro v0.3.77
   Compiling rand_chacha v0.3.1
   Compiling num-integer v0.1.47
   Compiling num-complex v0.4.6
   Compiling rand v0.8.7
   Compiling num-bigint v0.4.8
   Compiling num-iter v0.1.46
   Compiling tinyset v0.4.10
   Compiling ts-rs v10.1.0
   Compiling wasm-bindgen-macro v0.2.127
   Compiling num-rational v0.4.2
   Compiling num v0.4.3
   Compiling tidy-tree v0.1.0
   Compiling js-sys v0.3.104
   Compiling serde-wasm-bindgen v0.6.5
   Compiling wasm-bindgen-futures v0.4.77
   Compiling wasm-bindgen-test v0.3.77
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core/target/r11-baseline)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 14.01s
     Running tests/multi_source_parent.rs (packages/core/target/r11-baseline/target/debug/deps/multi_source_parent-388af635cfedc713)

running 8 tests
test multi_source_parent_breaks_equal_scores_lexicographically ... ok
test multi_source_parent_requires_tree_blocks_and_grouping ... ok
test multi_source_parent_falls_back_above_cap_and_ignores_one_parent_block ... ok
test multi_source_parent_prefers_fewer_turns_before_lexicographic_order ... ok
test tree_block_default_mock3_head_is_ah_under_fin_deterministically ... ok
test multi_source_parent_evaluates_exactly_twelve_combinations ... ok
test multi_source_parent_selection_is_lod_independent ... ok

failures:

---- multi_source_parent_prefers_fewer_turns_before_lexicographic_order stdout ----

thread 'multi_source_parent_prefers_fewer_turns_before_lexicographic_order' (3743998) panicked at tests/multi_source_parent.rs:172:5:
assertion `left == right` failed
  left: "Multi-source parents: d0=h00"
 right: "Multi-source parents: d0=h01"
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace

---- multi_source_parent_chooses_clean_attachment_deterministically stdout ----

thread 'multi_source_parent_chooses_clean_attachment_deterministically' (3743995) panicked at tests/multi_source_parent.rs:23:5:
assertion `left == right` failed
  left: 0
 right: 1

---- tree_block_default_mock3_head_is_ah_under_fin_deterministically stdout ----

thread 'tree_block_default_mock3_head_is_ah_under_fin_deterministically' (3744001) panicked at tests/multi_source_parent.rs:64:5:
assertion `left == right` failed: dg38: declaration-earliest head reduces cross 6 → 1
  left: 0
 right: 1


failures:
    multi_source_parent_chooses_clean_attachment_deterministically
    multi_source_parent_prefers_fewer_turns_before_lexicographic_order
    tree_block_default_mock3_head_is_ah_under_fin_deterministically

test result: FAILED. 5 passed; 3 failed; 0 ignored; 0 measured; 0 filtered out; finished in 55.58s

error: test failed, to rerun pass `--test multi_source_parent`
FACT: Focused GREEN: six tests passed (exit 0). Full run: 218 unit tests passed, one existing ignored; integration expectations changed (three failures: baseline crossing count is now 0 rather than 1; selected synthetic head is h00 rather than h01). Baseline comparison is running in an isolated copy under packages/core/target/r11-baseline; its output is also appended here. The two processes' output overlaps; no output was truncated or piped.
DECISION: Retain static card-matrix acceleration; only the appended wrapper slice is checked on matrix-clear segments. No-wrapper passability therefore follows the original code path.
FACT: Required native checkpoint succeeded (exit 0, OK): 216d9e14c40d3cf22349287d4c211c6d-1-c03c1cabddf5. Initial sandbox attempt could not write the registered receipts directory; the escalated registered helper succeeded.
NEXT: Finish baseline comparison, verify mutation sensitivity in disposable copy, and report any stale integration expectations without editing files outside the assigned scope.
test multi_source_parent_chooses_clean_attachment_deterministically ... ok
test multi_source_parent_selection_is_lod_independent ... ok

test result: ok. 8 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 53.61s


NEXT: Disposable snapshot cargo test wrappers_: unmutated focused baseline
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core/target/r11-baseline)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 3.54s
     Running unittests src/lib.rs (packages/core/target/r11-baseline/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 6 tests
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... ok
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... ok
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... ok

test result: ok. 6 passed; 0 failed; 0 ignored; 0 measured; 213 filtered out; finished in 0.00s

     Running tests/multi_source_parent.rs (packages/core/target/r11-baseline/target/debug/deps/multi_source_parent-388af635cfedc713)

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 8 filtered out; finished in 0.00s


FACT: unmutated focused baseline exit 0

NEXT: Disposable snapshot cargo test wrappers_: containment exemption removed
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core/target/r11-baseline)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.00s
     Running unittests src/lib.rs (packages/core/target/r11-baseline/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 6 tests
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... FAILED
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... ok
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... ok
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... ok

failures:

---- staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded stdout ----

thread 'staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded' (3774270) panicked at src/staff_router.rs:2085:13:
ancestor count 1
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace


failures:
    staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded

test result: FAILED. 5 passed; 1 failed; 0 ignored; 0 measured; 213 filtered out; finished in 0.01s

error: test failed, to rerun pass `--lib`

FACT: containment exemption removed exit 101

NEXT: Disposable snapshot cargo test wrappers_: wrapper padding removed
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core/target/r11-baseline)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.95s
     Running unittests src/lib.rs (packages/core/target/r11-baseline/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 6 tests
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... ok
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... ok
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... FAILED

failures:

---- staff_router::tests::wrappers_foreign_container_detour_has_clearance stdout ----

thread 'staff_router::tests::wrappers_foreign_container_detour_has_clearance' (3775244) panicked at src/staff_router.rs:2109:13:
assertion failed: seg_rect_distance(&segment[0], &segment[1], 150.0, 180.0, 100.0, 100.0) >= 8.0
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace


failures:
    staff_router::tests::wrappers_foreign_container_detour_has_clearance

test result: FAILED. 5 passed; 1 failed; 0 ignored; 0 measured; 213 filtered out; finished in 0.02s

error: test failed, to rerun pass `--lib`

FACT: wrapper padding removed exit 101

NEXT: Disposable snapshot cargo test wrappers_: invalid frame guard removed
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core/target/r11-baseline)
warning: unreachable expression
   --> src/staff_router.rs:356:5
    |
355 |   fn valid_frame(f: &FrameRect) -> bool { return true;
    |                                           ----------- any code following this expression is unreachable
356 | /     f.width > 0.0
357 | |         && f.height > 0.0
358 | |         && f.x + f.width > f.x
359 | |         && f.y + f.height > f.y
360 | |         && [f.x, f.y, f.width, f.height, f.x + f.width, f.y + f.height]
361 | |             .iter()
362 | |             .all(|v| v.is_finite() && v.abs() < f32::MAX / 4.0)
    | |_______________________________________________________________^ unreachable expression
    |
    = note: `#[warn(unreachable_code)]` (part of `#[warn(unused)]`) on by default

warning: unused variable: `f`
   --> src/staff_router.rs:355:16
    |
355 | fn valid_frame(f: &FrameRect) -> bool { return true;
    |                ^ help: if this is intentional, prefix it with an underscore: `_f`
    |
    = note: `#[warn(unused_variables)]` (part of `#[warn(unused)]`) on by default

warning: `org-hierarchy-core` (lib) generated 2 warnings (run `cargo fix --lib -p org-hierarchy-core` to apply 1 suggestion)
warning: `org-hierarchy-core` (lib test) generated 2 warnings (2 duplicates)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.02s
     Running unittests src/lib.rs (packages/core/target/r11-baseline/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 6 tests
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... FAILED
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... ok
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... ok

failures:

---- staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity stdout ----

thread 'staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity' (3776474) panicked at src/staff_router.rs:381:39:
finite geometry, no NaN
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace


failures:
    staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity

test result: FAILED. 5 passed; 1 failed; 0 ignored; 0 measured; 213 filtered out; finished in 0.00s

error: test failed, to rerun pass `--lib`

FACT: invalid frame guard removed exit 101

NEXT: Disposable snapshot cargo test wrappers_: detector ancestor exemption removed
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core/target/r11-baseline)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.11s
     Running unittests src/lib.rs (packages/core/target/r11-baseline/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 6 tests
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... FAILED
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... ok
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... ok

failures:

---- staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded stdout ----

thread 'staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded' (3777279) panicked at src/staff_router.rs:2091:13:
assertion `left == right` failed
  left: RouteStats { crossings: 0, overlaps: 0, through_card: 0, near_card: 0, through_foreign: 1 }
 right: RouteStats { crossings: 0, overlaps: 0, through_card: 0, near_card: 0, through_foreign: 0 }
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace


failures:
    staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded

test result: FAILED. 5 passed; 1 failed; 0 ignored; 0 measured; 213 filtered out; finished in 0.00s

error: test failed, to rerun pass `--lib`

FACT: detector ancestor exemption removed exit 101

NEXT: Disposable snapshot cargo test wrappers_: detector clearance removed
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core/target/r11-baseline)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.89s
     Running unittests src/lib.rs (packages/core/target/r11-baseline/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 6 tests
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... FAILED
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... ok
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... ok

failures:

---- staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted stdout ----

thread 'staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted' (3777982) panicked at src/staff_router.rs:2168:9:
assertion `left != right` failed
  left: [(100.0, 80.0), (100.0, 240.0), (300.0, 240.0), (300.0, 400.0)]
 right: [(100.0, 80.0), (100.0, 240.0), (300.0, 240.0), (300.0, 400.0)]
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace


failures:
    staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted

test result: FAILED. 5 passed; 1 failed; 0 ignored; 0 measured; 213 filtered out; finished in 0.01s

error: test failed, to rerun pass `--lib`

FACT: detector clearance removed exit 101
FACT: Unchanged HEAD router integration baseline completed with exit 0: all eight integration tests passed. The three failures in the new router are attributable to changed frame routing, not pre-existing failures. Tests outside staff_router.rs remain untouched; their historical route-dependent expectations need coordinator review. They are not claimed green or automatically blessed as stale.
FACT: Formatted only staff_router.rs using rustfmt (no cargo fmt/clippy/build). Five independent disposable-copy mutations were killed by behavioral assertions: remove ancestor exclusion; remove wrapper padding; accept invalid frames; remove detector ancestor exclusion; remove detector clearance. Each full cargo command output and exit status is above. Unmutated focused snapshot passed all six tests. Snapshot source was restored afterwards; live source was never mutated.
NEXT: Final full cargo test on the formatted, matrix-accelerated source. Full output follows without pipes.
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 2.28s
     Running unittests src/lib.rs (packages/core/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 219 tests
test org_layout::tests::layout_failure_negative_height ... ok
test org_layout::tests::layout_failure_nan_node_width ... ok
test org_tree::tests::extract_subtree_failure_unknown ... ok
test org_layout::tests::layout_failure_unknown_parent ... ok
test org_layout::tests::layout_failure_unknown_root ... ok
test org_tree::tests::validate_failure_cycle ... ok
test org_tree::tests::extract_subtree_keeps_sibling_order ... ok
test hierarchy::tests::build_from_flat_keeps_sibling_order ... ok
test hierarchy::tests::build_from_flat_defaults_status_from_person ... ok
test org_tree::tests::extract_subtree_success ... ok
test org_tree::tests::validate_failure_duplicate_id ... ok
test org_tree::tests::validate_failure_unknown_parent ... ok
test org_tree::tests::validate_success_single_root ... ok
test org_layout::tests::layout_success_depth_monotonic ... ok
test ploeg_layout::tests::ploeg_layered_lone_child_keeps_parent_x ... ok
test ploeg_layout::tests::ploeg_layered_parent_above_children ... ok
test ploeg_layout::tests::ploeg_layered_siblings_same_row ... ok
test ploeg_layout::tests::ploeg_layered_sibling_chains_form_a_grid ... ok
test staff_bounds::tests::content_padding_grows_block_by_overhang_both_sides ... ok
test staff_bounds::tests::empty_nodes_fall_back_to_band_and_canvas_width ... ok
test staff_bounds::tests::content_padding_zero_equals_bare ... ok
test staff_bounds::tests::enrich_fills_geometry_and_keeps_identity ... ok
test staff_bounds::tests::label_band_widens_only_the_top ... ok
test staff_bounds::tests::org_cards_empty_falls_back_to_canvas_width ... ok
test staff_bounds::tests::org_cards_union_cards_and_tier3_nodes ... ok
test staff_bounds::tests::staff_block_bounds_union_nodes_for_org_and_tier ... ok
test staff_clearance::tests::card_clearance_clean_route_has_zero_violations ... ok
test staff_clearance::tests::card_clearance_exempts_own_endpoints ... ok
test staff_clearance::tests::card_clearance_intruding_route_reports_violations ... ok
test staff_clearance::tests::card_clearance_uses_figma_row_obstacle_not_tile ... ok
test staff_clearance::tests::foreign_frame_clean_route_has_zero ... ok
test staff_clearance::tests::foreign_frame_org_endpoint_is_non_member ... ok
test staff_clearance::tests::foreign_frame_own_part_not_counted ... ok
test staff_clearance::tests::foreign_frame_per_part_other_part_is_foreign ... ok
test staff_clearance::tests::foreign_frame_through_third_frame_is_counted ... ok
test staff_clearance::tests::interior_hit_uses_eps_not_exact_zero ... ok
test staff_compose::tests::canvas_dimensions_empty_uses_margin_floor ... ok
test staff_compose::tests::canvas_dimensions_right_extents_returns_expected ... ok
test staff_compose::tests::nonpositive_axis_shift_keeps_nodes_anchored ... ok
test staff_compose::tests::org_cards_empty_children_keep_cursor ... ok
test staff_compose::tests::org_cards_empty_expansion_keeps_card_column_size ... ok
test staff_compose::tests::org_cards_with_expanded_child_returns_expected ... ok
test staff_compose::tests::recenters_all_managing_nodes_right_returns_expected ... ok
test staff_compose::tests::stacks_two_staff_block_tiers_with_band_reservation ... ok
test staff_edge_box::tests::far_collapses_to_centered_dot ... ok
test staff_edge_box::tests::far_small_node_hits_dot_floor ... ok
test staff_edge_box::tests::mid_collapses_to_band_ignoring_hints ... ok
test staff_edge_box::tests::mid_small_node_hits_band_floor ... ok
test staff_edge_box::tests::near_figma_row_docks_on_tile_with_row_obstacle ... ok
test staff_edge_box::tests::near_gojs_row_shortens_aabb ... ok
test staff_edge_box::tests::near_without_hints_is_full_box ... ok
test staff_edge_box::tests::org_far_chip_clamped_to_small_box ... ok
test staff_edge_box::tests::org_far_is_centered_symbol_chip ... ok
test staff_edge_box::tests::org_near_and_mid_are_full_box ... ok
test staff_edge_box::tests::unknown_lod_falls_back_to_far ... ok
test staff_geom::tests::distance_measures_gap ... ok
test staff_geom::tests::distance_zero_when_segment_crosses_rect ... ok
test staff_geom::tests::obstacle_rect_prefers_obstacle_over_box ... ok
test staff_layout::tests::card_pad_is_never_below_the_min_clearance ... ok
test staff_layout::tests::connected_tree_empty_returns_empty ... ok
test staff_layout::tests::admin_descendants_include_self_and_subtree ... ok
test staff_layout::tests::connected_tree_single_node_keeps_org_role_and_size_override ... ok
test staff_layout::tests::connected_tree_recenters_root_over_bbox ... ok
test staff_layout::tests::dept_grouping_no_department_bucket_last_and_unstamped ... ok
test staff_layout::tests::dept_grouping_order_overrides_id_alphabet ... ok
test staff_layout::tests::dept_grouping_places_second_dept_right_and_stamps_dept ... ok
test staff_layout::tests::dept_head_absent_for_dept_with_no_outside_rooted_member ... ok
test staff_layout::tests::dept_head_excludes_member_with_parent_inside_same_dept ... ok
test staff_layout::tests::dept_head_ignores_positions_without_department ... ok
test staff_layout::tests::dept_grouping_member_sibling_order_follows_order_not_id ... ok
test staff_layout::tests::detached_roots_are_parentless_non_heads ... ok
test staff_layout::tests::dept_head_multi_root_is_deterministic_by_position_id_not_input_order ... ok
test staff_layout::tests::dept_head_is_member_whose_admin_parent_is_outside_dept ... ok
test staff_layout::tests::dept_grouping_unknown_department_falls_back_to_no_dept ... ok
test staff_layout::tests::orchestrator_dept_grouping_emits_frames ... ok
test staff_layout::tests::orchestrator_unknown_current_org_errors ... ok
test staff_layout::tests::orchestrator_single_org_tier2_only ... ok
test staff_layout::tests::org_block_empty_org_returns_zero ... ok
test staff_layout::tests::orchestrator_expanded_child_places_staff_tier3 ... ok
test staff_layout::tests::orchestrator_zero_positions_current_empty_but_valid ... ok
test staff_layout::tests::orchestrator_managing_tier1_and_lead_org_edge ... ok
test staff_layout::tests::orchestrator_determinism_identical_twice ... ok
test staff_layout::tests::pin_external_pushes_block_down_and_adds_edge ... ok
test staff_layout::tests::org_block_single_position_tree ... ok
test staff_layout::tests::resolve_head_errors_on_ambiguity ... ok
test staff_layout::tests::resolve_head_single_is_head ... ok
test staff_layout::tests::pin_external_skipped_when_manager_unknown ... ok
test staff_layout::tests::orchestrator_tier2_shift_equals_block_plus_margin ... ok
test staff_layout::tests::org_block_filters_other_orgs ... ok
test staff_layout::tests::resolve_head_single_parentless_when_no_is_head ... ok
test staff_layout::tests::orchestrator_tier3_cards_and_lead_org_to_cards ... ok
test staff_layout::tests::resolve_person_hints_maps_both_variants_one_to_one ... ok
test staff_layout::tests::side_column_collision_ejects_second_box_down_deterministically ... ok
test staff_layout::tests::side_column_offsets_groups_right_of_anchors ... ok
test staff_layout::tests::org_block_determinism_identical_twice ... ok
test staff_layout::tests::tree_block_cycle_does_not_panic_and_places_all ... ok
test staff_layout::tests::tree_block_child_dept_sits_below_parent ... ok
test staff_layout::tests::tree_block_no_dept_singleton_sits_under_parent_dept ... ok
test staff_layout::tests::tree_block_places_detached_right_of_attached ... ok
test staff_layout::tests::tree_block_head_uses_declaration_order_not_parent_id ... ok
test staff_mockup_layout::tests::dump_mockup_golden ... ignored
test staff_layout::tests::tree_block_stamps_department_id ... ok
test staff_layout::tests::tree_block_siblings_ordered_by_attachment_x ... ok
test staff_layout::tests::tree_block_singleton_stays_near_its_no_dept_parent ... ok
test staff_layout::tests::tree_block_singletons_balance_width_not_sibling_count ... ok
test staff_layout::tests::tree_block_singleton_placement_is_stable_with_missing_parent_and_cycle ... ok
test staff_mockup_layout::tests::emits_parent_child_edges ... ok
test staff_mockup_layout::tests::between_blocks_uses_bv_not_lv ... ok
test staff_mockup_layout::tests::a_row_is_top_aligned_and_the_next_row_clears_its_tallest_card ... ok
test staff_mockup_layout::tests::invalid_or_duplicate_sizes_are_errors_not_fallbacks ... ok
test staff_mockup_layout::tests::a_taller_card_grows_its_department_frame ... ok
test staff_layout::tests::singleton_attachment_aligns_with_sibling_department_frame ... ok
test staff_mockup_layout::tests::places_all_nodes_and_dept_frame ... ok
test staff_mockup_layout::tests::output_is_deterministic ... ok
test staff_packing::tests::department_cards_sit_below_header_and_frame_includes_it ... ok
test staff_packing::tests::empty_department_is_excluded_without_panicking ... ok
test staff_packing::tests::loose_root_aligns_with_department_row_and_has_no_frame ... ok
test staff_packing::tests::multi_member_frame_wraps_union_aabb ... ok
test staff_packing::tests::single_member_frame_expands_bbox_by_padding ... ok
test staff_packing::tests::split_department_stamps_part_index_on_frames_and_nodes ... ok
test staff_packing::tests::two_departments_frame_edge_gap_equals_horizontal_gap ... ok
test staff_mockup_layout::tests::the_bus_runs_below_the_row_not_below_a_shorter_manager ... ok
test staff_router::tests::astar_degrades_to_best_effort_on_an_off_grid_port ... ok
test staff_router::tests::astar_detours_around_a_foreign_card ... ok
test staff_router::tests::astar_routes_orthogonally_and_enters_target_from_above ... ok
test staff_router::tests::clean_scene_is_all_zero ... ok
test staff_router::tests::corridor_grid_blocks_under_padded_cards_only ... ok
test staff_router::tests::astar_is_deterministic ... ok
test staff_mockup_layout::tests::within_dept_uses_lv_between_levels ... ok
test staff_mockup_layout::tests::a_wider_card_pushes_its_siblings_apart ... ok
test staff_router::tests::corridor_grid_frames_contribute_coordinates_not_blocking ... ok
test staff_router::tests::astar_detours_around_a_foreign_frame ... ok
test staff_router::tests::corridor_grid_is_sparse_well_formed_and_card_aligned ... ok
test staff_router::tests::line_on_card_boundary_is_near_not_through ... ok
test staff_router::tests::line_through_card_interior_is_through_not_near ... ok
test staff_router::tests::crossing_between_different_managers_is_counted ... ok
test staff_router::tests::diagonal_segment_is_detected_by_the_ortho_probe ... ok
test staff_router::tests::line_through_foreign_frame_is_counted ... ok
test staff_router::tests::own_endpoint_card_is_never_a_violation ... ok
test staff_router::tests::partial_overlap_of_different_managers_is_counted ... ok
test staff_router::tests::occupancy_pushes_a_foreign_line_onto_its_own_lane ... ok
test staff_router::tests::releasing_occupancy_restores_the_straight_route ... ok
test staff_router::tests::route_edges_occupies_a_best_effort_edge_without_panicking ... ok
test staff_router::tests::route_stats_detailed_flags_both_edges_of_a_crossing ... ok
test staff_router::tests::shared_bus_of_siblings_is_not_an_overlap ... ok
test staff_router::tests::sibling_bus_junction_is_not_a_crossing ... ok
test staff_router::tests::straight_through_sibling_trunk_is_not_a_crossing ... ok
test staff_router::tests::ripup_is_deterministic_and_a_noop_when_already_clean ... ok
test staff_router::tests::ripup_bends_a_dirty_internal_elbow ... ok
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... ok
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... ok
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... ok
test staff_routes::tests::admin_vertical_blocked_horizontal_clean_takes_horizontal ... ok
test staff_routes::tests::admin_vertical_clean_stays_vertical ... ok
test staff_routes::tests::aligned_x_produces_straight_two_point_route ... ok
test staff_routes::tests::avoidance_detours_resolvable_block_clearing_violations ... ok
test staff_routes::tests::avoidance_is_byte_identical_when_no_card_blocks ... ok
test staff_routes::tests::avoidance_leaves_unresolvable_block_as_remnant ... ok
test staff_routes::tests::avoidance_is_deterministic_across_runs ... ok
test staff_routes::tests::card_index_near_miss_is_detected_as_blocker ... ok
test staff_routes::tests::card_index_matches_naive_including_near_miss_outside_bbox ... ok
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... ok
test staff_routes::tests::corridor_y_is_midpoint_matching_legacy ... ok
test staff_routes::tests::collinear_z_fallback_has_no_true_turns ... ok
test staff_routes::tests::cross_dept_admin_into_head_docks_on_frame_top ... ok
test staff_routes::tests::clean_schemas_have_no_violations ... ok
test staff_routes::tests::dept_top_port_tracks_head_cx_not_source_cx ... ok
test staff_routes::tests::figma_hint_docks_source_port_on_tile_center ... ok
test staff_routes::tests::elbow_endpoints_sit_on_center_ports_and_is_orthogonal ... ok
test staff_routes::tests::detour_leaves_a_violation_on_the_hard_schemas ... ok
test staff_routes::tests::foreign_frame_resolvable_is_avoided_without_marker ... ok
test staff_routes::tests::foreign_frame_resolvable_via_side_detour ... ok
test staff_routes::tests::foreign_frame_unresolvable_is_marked ... ok
test staff_routes::tests::intra_dept_admin_stays_on_card_top ... ok
test staff_routes::tests::lead_org_person_to_org_card_resolves ... ok
test staff_routes::tests::h6_combined_scene_matches_golden ... ok
test staff_routes::tests::marker_equals_detector_by_construction ... ok
test staff_routes::tests::matrix_child_above_routes_vertical_upward ... ok
test staff_routes::tests::matrix_edge_prefers_horizontal_side_ports ... ok
test staff_routes::tests::near_no_hints_is_numerically_identical_to_raw_node_route ... ok
test staff_routes::tests::h6_combined_scene_is_byte_identical_across_runs ... ok
test staff_routes::tests::no_frames_means_no_marker_and_parity ... ok
test staff_routes::tests::non_admin_into_head_does_not_dock_on_frame_top ... ok
test staff_routes::tests::own_frame_is_neither_obstacle_nor_marked ... ok
test staff_routes::tests::oracle_clean_fixture_zero_violations_and_frame_is_detected ... ok
test staff_routes::tests::person_wins_over_org_card_on_id_collision ... ok
test staff_routes::tests::preserves_input_edge_order ... ok
test staff_routes::tests::route_horizontal_none_without_clear_gap ... ok
test staff_routes::tests::same_band_admin_flips_to_horizontal ... ok
test staff_routes::tests::side_detour_is_deterministic_across_frame_reorder ... ok
test staff_routes::tests::route_vertical_direction_and_nullable ... ok
test staff_routes::tests::skips_self_loop_and_dangling_and_stamps_lod ... ok
test staff_routes::tests::true_turns_ignores_duplicates_and_counts_direction_changes ... ok
test staff_routes::tests::turn_limit_uses_endpoint_department_and_part ... ok
test staff_routes::tests::turn_totals_exclude_marked_failures_only_from_excess ... ok
test tests::flat_build_works ... ok
test staff_routes::tests::t7_internal_tree_edges_are_ortho_elbows ... ok
test tests::resolve_layout_metric_none_uses_default ... ok
test tests::resolve_layout_metric_rejects_infinity ... ok
test tests::resolve_layout_metric_rejects_nan_instead_of_default ... ok
test types::layout_metric_tests::layout_options_validate_rejects_nan ... ok
test types::layout_metric_tests::some_nan_does_not_fall_back_to_default ... ok
test types::staff_contract_tests::metrics_validate_accepts_defaults ... ok
test types::staff_contract_tests::metrics_validate_rejects_nan_size ... ok
test types::staff_contract_tests::metrics_validate_rejects_nonpositive_size ... ok
test types::staff_contract_tests::staff_dock_hint_deserializes_camelcase_variants ... ok
test types::staff_contract_tests::staff_dock_hint_input_nested_roundtrip_camelcase ... ok
test types::staff_contract_tests::staff_layout_input_dock_hints_defaults_empty_when_key_omitted ... ok
test staff_router::tests::route_edges_single_pass_separates_two_managers ... ok
test staff_router::tests::ripup_clears_a_crossing_that_single_pass_leaves ... ok
test staff_routes::tests::ac10_all_schemas_zero_violations ... ok
test staff_routes::tests::t8a_astar_branch_routes_far_lod_scene_with_org_on_grid ... ok
test hierarchy::tests::build_from_flat_handles_a_chain_that_used_to_blow_the_stack ... ok
test staff_mockup_layout::tests::mock3_astar_zero_crossings_and_card_hits ... ok
test staff_mockup_layout::tests::mixed_heights_on_the_full_scene_keep_zero_crossings_and_card_hits ... ok
test staff_mockup_layout::tests::mock3_astar_deterministic ... ok
test staff_mockup_layout::tests::equal_sizes_reproduce_the_pre_change_golden ... ok

test result: ok. 218 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.19s

     Running tests/multi_source_parent.rs (packages/core/target/debug/deps/multi_source_parent-388af635cfedc713)

running 8 tests
test multi_source_parent_breaks_equal_scores_lexicographically ... ok
test multi_source_parent_prefers_fewer_turns_before_lexicographic_order ... FAILED
test multi_source_parent_requires_tree_blocks_and_grouping ... ok
test multi_source_parent_falls_back_above_cap_and_ignores_one_parent_block ... ok
test multi_source_parent_chooses_clean_attachment_deterministically ... FAILED
test tree_block_default_mock3_head_is_ah_under_fin_deterministically ... FAILED
test multi_source_parent_evaluates_exactly_twelve_combinations ... ok
test multi_source_parent_selection_is_lod_independent ... ok

failures:

---- multi_source_parent_prefers_fewer_turns_before_lexicographic_order stdout ----

thread 'multi_source_parent_prefers_fewer_turns_before_lexicographic_order' (3783758) panicked at tests/multi_source_parent.rs:172:5:
assertion `left == right` failed
  left: "Multi-source parents: d0=h00"
 right: "Multi-source parents: d0=h01"
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace

---- multi_source_parent_chooses_clean_attachment_deterministically stdout ----

thread 'multi_source_parent_chooses_clean_attachment_deterministically' (3783755) panicked at tests/multi_source_parent.rs:23:5:
assertion `left == right` failed
  left: 0
 right: 1

---- tree_block_default_mock3_head_is_ah_under_fin_deterministically stdout ----

thread 'tree_block_default_mock3_head_is_ah_under_fin_deterministically' (3783761) panicked at tests/multi_source_parent.rs:64:5:
assertion `left == right` failed: dg38: declaration-earliest head reduces cross 6 → 1
  left: 0
 right: 1


failures:
    multi_source_parent_chooses_clean_attachment_deterministically
    multi_source_parent_prefers_fewer_turns_before_lexicographic_order
    tree_block_default_mock3_head_is_ah_under_fin_deterministically

test result: FAILED. 5 passed; 3 failed; 0 ignored; 0 measured; 0 filtered out; finished in 32.96s

error: test failed, to rerun pass `--test multi_source_parent`
NEXT: Test a smaller coordinate change in the disposable snapshot: retain the existing frame corridor lines (already include 14px exterior clearance), while keeping 8px wrapper obstacles and containment. This may avoid unrelated route-order changes introduced by extra grid lines. No integration expectation is edited.
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core/target/r11-baseline)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 2.16s
     Running unittests src/lib.rs (packages/core/target/r11-baseline/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 219 tests
test org_layout::tests::layout_failure_negative_height ... ok
test org_layout::tests::layout_failure_nan_node_width ... ok
test org_tree::tests::extract_subtree_failure_unknown ... ok
test org_tree::tests::validate_failure_cycle ... ok
test org_tree::tests::validate_failure_unknown_parent ... ok
test org_layout::tests::layout_failure_unknown_root ... ok
test org_tree::tests::validate_failure_duplicate_id ... ok
test org_tree::tests::extract_subtree_keeps_sibling_order ... ok
test org_tree::tests::extract_subtree_success ... ok
test hierarchy::tests::build_from_flat_defaults_status_from_person ... ok
test org_layout::tests::layout_failure_unknown_parent ... ok
test hierarchy::tests::build_from_flat_keeps_sibling_order ... ok
test org_tree::tests::validate_success_single_root ... ok
test org_layout::tests::layout_success_depth_monotonic ... ok
test ploeg_layout::tests::ploeg_layered_parent_above_children ... ok
test ploeg_layout::tests::ploeg_layered_siblings_same_row ... ok
test staff_bounds::tests::content_padding_grows_block_by_overhang_both_sides ... ok
test staff_bounds::tests::content_padding_zero_equals_bare ... ok
test ploeg_layout::tests::ploeg_layered_lone_child_keeps_parent_x ... ok
test staff_bounds::tests::empty_nodes_fall_back_to_band_and_canvas_width ... ok
test staff_bounds::tests::enrich_fills_geometry_and_keeps_identity ... ok
test staff_bounds::tests::label_band_widens_only_the_top ... ok
test staff_bounds::tests::org_cards_empty_falls_back_to_canvas_width ... ok
test staff_bounds::tests::org_cards_union_cards_and_tier3_nodes ... ok
test staff_bounds::tests::staff_block_bounds_union_nodes_for_org_and_tier ... ok
test staff_clearance::tests::card_clearance_clean_route_has_zero_violations ... ok
test ploeg_layout::tests::ploeg_layered_sibling_chains_form_a_grid ... ok
test staff_clearance::tests::card_clearance_exempts_own_endpoints ... ok
test staff_clearance::tests::card_clearance_intruding_route_reports_violations ... ok
test staff_clearance::tests::card_clearance_uses_figma_row_obstacle_not_tile ... ok
test staff_clearance::tests::foreign_frame_clean_route_has_zero ... ok
test staff_clearance::tests::foreign_frame_org_endpoint_is_non_member ... ok
test staff_clearance::tests::foreign_frame_own_part_not_counted ... ok
test staff_clearance::tests::foreign_frame_per_part_other_part_is_foreign ... ok
test staff_clearance::tests::foreign_frame_through_third_frame_is_counted ... ok
test staff_clearance::tests::interior_hit_uses_eps_not_exact_zero ... ok
test staff_compose::tests::canvas_dimensions_right_extents_returns_expected ... ok
test staff_compose::tests::canvas_dimensions_empty_uses_margin_floor ... ok
test staff_compose::tests::org_cards_empty_children_keep_cursor ... ok
test staff_compose::tests::nonpositive_axis_shift_keeps_nodes_anchored ... ok
test staff_compose::tests::org_cards_empty_expansion_keeps_card_column_size ... ok
test staff_compose::tests::org_cards_with_expanded_child_returns_expected ... ok
test staff_compose::tests::recenters_all_managing_nodes_right_returns_expected ... ok
test staff_compose::tests::stacks_two_staff_block_tiers_with_band_reservation ... ok
test staff_edge_box::tests::far_collapses_to_centered_dot ... ok
test staff_edge_box::tests::far_small_node_hits_dot_floor ... ok
test staff_edge_box::tests::mid_collapses_to_band_ignoring_hints ... ok
test staff_edge_box::tests::near_figma_row_docks_on_tile_with_row_obstacle ... ok
test staff_edge_box::tests::mid_small_node_hits_band_floor ... ok
test staff_edge_box::tests::near_gojs_row_shortens_aabb ... ok
test staff_edge_box::tests::near_without_hints_is_full_box ... ok
test staff_edge_box::tests::org_far_chip_clamped_to_small_box ... ok
test staff_edge_box::tests::org_near_and_mid_are_full_box ... ok
test staff_edge_box::tests::org_far_is_centered_symbol_chip ... ok
test staff_edge_box::tests::unknown_lod_falls_back_to_far ... ok
test staff_geom::tests::distance_measures_gap ... ok
test staff_geom::tests::distance_zero_when_segment_crosses_rect ... ok
test staff_geom::tests::obstacle_rect_prefers_obstacle_over_box ... ok
test staff_layout::tests::card_pad_is_never_below_the_min_clearance ... ok
test staff_layout::tests::admin_descendants_include_self_and_subtree ... ok
test staff_layout::tests::connected_tree_empty_returns_empty ... ok
test staff_layout::tests::connected_tree_recenters_root_over_bbox ... ok
test staff_layout::tests::dept_grouping_order_overrides_id_alphabet ... ok
test staff_layout::tests::dept_grouping_places_second_dept_right_and_stamps_dept ... ok
test staff_layout::tests::dept_head_ignores_positions_without_department ... ok
test staff_layout::tests::connected_tree_single_node_keeps_org_role_and_size_override ... ok
test staff_layout::tests::dept_head_absent_for_dept_with_no_outside_rooted_member ... ok
test staff_layout::tests::dept_head_excludes_member_with_parent_inside_same_dept ... ok
test staff_layout::tests::dept_head_is_member_whose_admin_parent_is_outside_dept ... ok
test staff_layout::tests::dept_grouping_member_sibling_order_follows_order_not_id ... ok
test staff_layout::tests::dept_head_multi_root_is_deterministic_by_position_id_not_input_order ... ok
test staff_layout::tests::dept_grouping_unknown_department_falls_back_to_no_dept ... ok
test staff_layout::tests::detached_roots_are_parentless_non_heads ... ok
test staff_layout::tests::dept_grouping_no_department_bucket_last_and_unstamped ... ok
test staff_layout::tests::orchestrator_dept_grouping_emits_frames ... ok
test staff_layout::tests::orchestrator_unknown_current_org_errors ... ok
test staff_layout::tests::orchestrator_zero_positions_current_empty_but_valid ... ok
test staff_layout::tests::orchestrator_tier3_cards_and_lead_org_to_cards ... ok
test staff_layout::tests::orchestrator_determinism_identical_twice ... ok
test staff_layout::tests::org_block_empty_org_returns_zero ... ok
test staff_layout::tests::org_block_filters_other_orgs ... ok
test staff_layout::tests::resolve_head_single_is_head ... ok
test staff_layout::tests::pin_external_skipped_when_manager_unknown ... ok
test staff_layout::tests::org_block_single_position_tree ... ok
test staff_layout::tests::resolve_head_errors_on_ambiguity ... ok
test staff_layout::tests::pin_external_pushes_block_down_and_adds_edge ... ok
test staff_layout::tests::resolve_head_single_parentless_when_no_is_head ... ok
test staff_layout::tests::orchestrator_expanded_child_places_staff_tier3 ... ok
test staff_layout::tests::resolve_person_hints_maps_both_variants_one_to_one ... ok
test staff_layout::tests::orchestrator_managing_tier1_and_lead_org_edge ... ok
test staff_layout::tests::orchestrator_single_org_tier2_only ... ok
test staff_layout::tests::orchestrator_tier2_shift_equals_block_plus_margin ... ok
test staff_layout::tests::side_column_collision_ejects_second_box_down_deterministically ... ok
test staff_layout::tests::side_column_offsets_groups_right_of_anchors ... ok
test staff_layout::tests::org_block_determinism_identical_twice ... ok
test staff_layout::tests::tree_block_child_dept_sits_below_parent ... ok
test staff_layout::tests::tree_block_cycle_does_not_panic_and_places_all ... ok
test staff_layout::tests::tree_block_singleton_stays_near_its_no_dept_parent ... ok
test staff_layout::tests::tree_block_no_dept_singleton_sits_under_parent_dept ... ok
test staff_layout::tests::tree_block_head_uses_declaration_order_not_parent_id ... ok
test staff_layout::tests::tree_block_singletons_balance_width_not_sibling_count ... ok
test staff_layout::tests::tree_block_places_detached_right_of_attached ... ok
test staff_layout::tests::tree_block_siblings_ordered_by_attachment_x ... ok
test staff_layout::tests::tree_block_stamps_department_id ... ok
test staff_layout::tests::tree_block_singleton_placement_is_stable_with_missing_parent_and_cycle ... ok
test staff_mockup_layout::tests::between_blocks_uses_bv_not_lv ... ok
test staff_mockup_layout::tests::dump_mockup_golden ... ignored
test staff_mockup_layout::tests::a_row_is_top_aligned_and_the_next_row_clears_its_tallest_card ... ok
test staff_layout::tests::singleton_attachment_aligns_with_sibling_department_frame ... ok
test staff_mockup_layout::tests::invalid_or_duplicate_sizes_are_errors_not_fallbacks ... ok
test staff_mockup_layout::tests::a_taller_card_grows_its_department_frame ... ok
test staff_mockup_layout::tests::emits_parent_child_edges ... ok
test staff_packing::tests::department_cards_sit_below_header_and_frame_includes_it ... ok
test staff_packing::tests::empty_department_is_excluded_without_panicking ... ok
test staff_packing::tests::loose_root_aligns_with_department_row_and_has_no_frame ... ok
test staff_packing::tests::single_member_frame_expands_bbox_by_padding ... ok
test staff_packing::tests::split_department_stamps_part_index_on_frames_and_nodes ... ok
test staff_packing::tests::two_departments_frame_edge_gap_equals_horizontal_gap ... ok
test staff_mockup_layout::tests::places_all_nodes_and_dept_frame ... ok
test staff_mockup_layout::tests::the_bus_runs_below_the_row_not_below_a_shorter_manager ... ok
test staff_mockup_layout::tests::a_wider_card_pushes_its_siblings_apart ... ok
test staff_router::tests::astar_degrades_to_best_effort_on_an_off_grid_port ... ok
test staff_packing::tests::multi_member_frame_wraps_union_aabb ... ok
test staff_router::tests::astar_detours_around_a_foreign_card ... ok
test staff_router::tests::astar_is_deterministic ... ok
test staff_mockup_layout::tests::output_is_deterministic ... ok
test staff_router::tests::astar_detours_around_a_foreign_frame ... ok
test staff_router::tests::astar_routes_orthogonally_and_enters_target_from_above ... ok
test staff_mockup_layout::tests::within_dept_uses_lv_between_levels ... ok
test staff_router::tests::clean_scene_is_all_zero ... ok
test staff_router::tests::corridor_grid_blocks_under_padded_cards_only ... ok
test staff_router::tests::corridor_grid_frames_contribute_coordinates_not_blocking ... ok
test staff_router::tests::corridor_grid_is_sparse_well_formed_and_card_aligned ... ok
test staff_router::tests::crossing_between_different_managers_is_counted ... ok
test staff_router::tests::line_on_card_boundary_is_near_not_through ... ok
test staff_router::tests::line_through_card_interior_is_through_not_near ... ok
test staff_router::tests::line_through_foreign_frame_is_counted ... ok
test staff_router::tests::diagonal_segment_is_detected_by_the_ortho_probe ... ok
test staff_router::tests::own_endpoint_card_is_never_a_violation ... ok
test staff_router::tests::partial_overlap_of_different_managers_is_counted ... ok
test staff_router::tests::releasing_occupancy_restores_the_straight_route ... ok
test staff_router::tests::occupancy_pushes_a_foreign_line_onto_its_own_lane ... ok
test staff_router::tests::ripup_bends_a_dirty_internal_elbow ... ok
test staff_router::tests::route_edges_occupies_a_best_effort_edge_without_panicking ... ok
test staff_router::tests::route_stats_detailed_flags_both_edges_of_a_crossing ... ok
test staff_router::tests::ripup_is_deterministic_and_a_noop_when_already_clean ... ok
test staff_router::tests::shared_bus_of_siblings_is_not_an_overlap ... ok
test staff_router::tests::sibling_bus_junction_is_not_a_crossing ... ok
test staff_router::tests::straight_through_sibling_trunk_is_not_a_crossing ... ok
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... ok
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... ok
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_routes::tests::admin_vertical_blocked_horizontal_clean_takes_horizontal ... ok
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... ok
test staff_routes::tests::admin_vertical_clean_stays_vertical ... ok
test staff_routes::tests::aligned_x_produces_straight_two_point_route ... ok
test staff_routes::tests::avoidance_detours_resolvable_block_clearing_violations ... ok
test staff_routes::tests::avoidance_is_byte_identical_when_no_card_blocks ... ok
test staff_routes::tests::avoidance_is_deterministic_across_runs ... ok
test staff_routes::tests::avoidance_leaves_unresolvable_block_as_remnant ... ok
test staff_routes::tests::card_index_matches_naive_including_near_miss_outside_bbox ... ok
test staff_routes::tests::card_index_near_miss_is_detected_as_blocker ... ok
test staff_routes::tests::collinear_z_fallback_has_no_true_turns ... ok
test staff_routes::tests::corridor_y_is_midpoint_matching_legacy ... ok
test staff_routes::tests::cross_dept_admin_into_head_docks_on_frame_top ... ok
test staff_routes::tests::dept_top_port_tracks_head_cx_not_source_cx ... ok
test staff_routes::tests::detour_leaves_a_violation_on_the_hard_schemas ... ok
test staff_routes::tests::elbow_endpoints_sit_on_center_ports_and_is_orthogonal ... ok
test staff_router::tests::route_edges_single_pass_separates_two_managers ... ok
test staff_routes::tests::figma_hint_docks_source_port_on_tile_center ... ok
test staff_routes::tests::clean_schemas_have_no_violations ... ok
test staff_routes::tests::foreign_frame_resolvable_is_avoided_without_marker ... ok
test staff_routes::tests::foreign_frame_resolvable_via_side_detour ... ok
test staff_routes::tests::foreign_frame_unresolvable_is_marked ... ok
test staff_routes::tests::intra_dept_admin_stays_on_card_top ... ok
test staff_routes::tests::lead_org_person_to_org_card_resolves ... ok
test staff_routes::tests::marker_equals_detector_by_construction ... ok
test staff_routes::tests::h6_combined_scene_matches_golden ... ok
test staff_routes::tests::matrix_child_above_routes_vertical_upward ... ok
test staff_routes::tests::h6_combined_scene_is_byte_identical_across_runs ... ok
test staff_routes::tests::matrix_edge_prefers_horizontal_side_ports ... ok
test staff_routes::tests::near_no_hints_is_numerically_identical_to_raw_node_route ... ok
test staff_routes::tests::no_frames_means_no_marker_and_parity ... ok
test staff_routes::tests::non_admin_into_head_does_not_dock_on_frame_top ... ok
test staff_routes::tests::oracle_clean_fixture_zero_violations_and_frame_is_detected ... ok
test staff_routes::tests::own_frame_is_neither_obstacle_nor_marked ... ok
test staff_routes::tests::person_wins_over_org_card_on_id_collision ... ok
test staff_routes::tests::preserves_input_edge_order ... ok
test staff_routes::tests::route_horizontal_none_without_clear_gap ... ok
test staff_routes::tests::route_vertical_direction_and_nullable ... ok
test staff_routes::tests::same_band_admin_flips_to_horizontal ... ok
test staff_routes::tests::skips_self_loop_and_dangling_and_stamps_lod ... ok
test staff_routes::tests::side_detour_is_deterministic_across_frame_reorder ... ok
test staff_routes::tests::true_turns_ignores_duplicates_and_counts_direction_changes ... ok
test staff_routes::tests::t7_internal_tree_edges_are_ortho_elbows ... ok
test staff_routes::tests::turn_totals_exclude_marked_failures_only_from_excess ... ok
test staff_routes::tests::turn_limit_uses_endpoint_department_and_part ... ok
test tests::flat_build_works ... ok
test tests::resolve_layout_metric_none_uses_default ... ok
test tests::resolve_layout_metric_rejects_infinity ... ok
test tests::resolve_layout_metric_rejects_nan_instead_of_default ... ok
test types::layout_metric_tests::layout_options_validate_rejects_nan ... ok
test types::layout_metric_tests::some_nan_does_not_fall_back_to_default ... ok
test types::staff_contract_tests::metrics_validate_accepts_defaults ... ok
test types::staff_contract_tests::metrics_validate_rejects_nan_size ... ok
test types::staff_contract_tests::metrics_validate_rejects_nonpositive_size ... ok
test types::staff_contract_tests::staff_dock_hint_deserializes_camelcase_variants ... ok
test types::staff_contract_tests::staff_dock_hint_input_nested_roundtrip_camelcase ... ok
test types::staff_contract_tests::staff_layout_input_dock_hints_defaults_empty_when_key_omitted ... ok
test staff_routes::tests::ac10_all_schemas_zero_violations ... ok
test staff_router::tests::ripup_clears_a_crossing_that_single_pass_leaves ... ok
test staff_routes::tests::t8a_astar_branch_routes_far_lod_scene_with_org_on_grid ... ok
test hierarchy::tests::build_from_flat_handles_a_chain_that_used_to_blow_the_stack ... ok
test staff_mockup_layout::tests::mock3_astar_zero_crossings_and_card_hits ... ok
test staff_mockup_layout::tests::mixed_heights_on_the_full_scene_keep_zero_crossings_and_card_hits ... ok
test staff_mockup_layout::tests::mock3_astar_deterministic ... ok
test staff_mockup_layout::tests::equal_sizes_reproduce_the_pre_change_golden ... ok

test result: ok. 218 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.20s

     Running tests/multi_source_parent.rs (packages/core/target/r11-baseline/target/debug/deps/multi_source_parent-388af635cfedc713)

running 8 tests
test multi_source_parent_breaks_equal_scores_lexicographically ... ok
test multi_source_parent_prefers_fewer_turns_before_lexicographic_order ... FAILED
test multi_source_parent_requires_tree_blocks_and_grouping ... ok
test multi_source_parent_falls_back_above_cap_and_ignores_one_parent_block ... ok
test multi_source_parent_chooses_clean_attachment_deterministically ... FAILED
test tree_block_default_mock3_head_is_ah_under_fin_deterministically ... FAILED
test multi_source_parent_evaluates_exactly_twelve_combinations ... ok
FACT: Reusing the original grid coordinates still reproduces the same three integration failures. Next isolate legacy 14px foreign-frame margin vs 8px wrapper padding, in the disposable copy only.
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core/target/r11-baseline)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.19s
     Running unittests src/lib.rs (packages/core/target/r11-baseline/target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 219 filtered out; finished in 0.00s

     Running tests/multi_source_parent.rs (packages/core/target/r11-baseline/target/debug/deps/multi_source_parent-388af635cfedc713)

running 1 test
test multi_source_parent_prefers_fewer_turns_before_lexicographic_order ... FAILED

failures:

---- multi_source_parent_prefers_fewer_turns_before_lexicographic_order stdout ----

thread 'multi_source_parent_prefers_fewer_turns_before_lexicographic_order' (3792670) panicked at tests/multi_source_parent.rs:172:5:
assertion `left == right` failed
  left: "Multi-source parents: d0=h00"
 right: "Multi-source parents: d0=h01"
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace


failures:
    multi_source_parent_prefers_fewer_turns_before_lexicographic_order

test result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 7 filtered out; finished in 0.01s

error: test failed, to rerun pass `--test multi_source_parent`
test multi_source_parent_selection_is_lod_independent ... ok

failures:

---- multi_source_parent_prefers_fewer_turns_before_lexicographic_order stdout ----

thread 'multi_source_parent_prefers_fewer_turns_before_lexicographic_order' (3789090) panicked at tests/multi_source_parent.rs:172:5:
assertion `left == right` failed
  left: "Multi-source parents: d0=h00"
 right: "Multi-source parents: d0=h01"
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace

---- multi_source_parent_chooses_clean_attachment_deterministically stdout ----

thread 'multi_source_parent_chooses_clean_attachment_deterministically' (3789087) panicked at tests/multi_source_parent.rs:23:5:
assertion `left == right` failed
  left: 0
 right: 1

---- tree_block_default_mock3_head_is_ah_under_fin_deterministically stdout ----

thread 'tree_block_default_mock3_head_is_ah_under_fin_deterministically' (3789093) panicked at tests/multi_source_parent.rs:64:5:
assertion `left == right` failed: dg38: declaration-earliest head reduces cross 6 → 1
  left: 0
 right: 1


failures:
    multi_source_parent_chooses_clean_attachment_deterministically
    multi_source_parent_prefers_fewer_turns_before_lexicographic_order
    tree_block_default_mock3_head_is_ah_under_fin_deterministically

test result: FAILED. 5 passed; 3 failed; 0 ignored; 0 measured; 0 filtered out; finished in 25.89s

error: test failed, to rerun pass `--test multi_source_parent`

FACT: Final live-source full cargo test exited 101: 218 passed / 0 failed / 1 ignored unit tests; 5 passed / 3 failed integration tests. Doc tests were not reached after integration failure. No clippy or build:wasm was run, as requested.
FACT: Diagnostic snapshots also failed: original frame grid lines (same three failures, exit 101); original grid plus legacy 14px foreign-frame margin (parent-selection test still failed, exit 101). These alternatives were not adopted. The disposable source is restored to the final live bytes.

## Done
FACT: Changed only packages/core/src/staff_router.rs plus this append-only record. Valid frame wrappers join the flat per-edge obstacle list with MIN_CLEARANCE_PX padding. Every fully containing source/target ancestor is excluded; original own-card port and non-containing membership frame rules remain. Invalid/degenerate/overflowing wrappers are skipped before grid seeding and detection. Detection includes wrapper clearance so internal elbows can be rerouted. No new fallback or WASM field.

## Tested scenarios
FACT: Six new route_scene tests cover foreign detour + clearance, single/nested/source/target ancestor exemption, invalid wrapper parity, no-frame literal route parity, straddling endpoint no-path residual, and internal-elbow proximity rerouting. Behavioral RED and focused GREEN are recorded above. Five mutation tests each failed at the intended behavioral assertion. Existing unit/golden tests remain green.

## Non-obvious findings
FACT: Existing integration expectations depend on the old routing restrictions. With this implementation, multi_source_parent_chooses_clean_attachment_deterministically and tree_block_default_mock3_head_is_ah_under_fin_deterministically observe 0 crossings where they require 1. multi_source_parent_prefers_fewer_turns_before_lexicographic_order chooses d0=h00 where it requires d0=h01. Unchanged HEAD router passes all eight integrations. These changed expectations are NOT independently approved and have NOT been updated.
QUESTION: Coordinator must review the changed route/parent-selection expectations in packages/core/tests/multi_source_parent.rs and authorize their reconciliation or refine the containment contract. That file is outside this worker's exclusive list; the required full GREEN condition is not met.

## Screenshots
FACT: N/A: Rust-only routing task; no browser/UI validation requested or performed.

## User-flow walkthrough
FACT: route_scene seeds valid frame coordinates; A* excludes all containing ancestors and checks remaining foreign wrappers alongside cards with clearance. Internal elbow violations enter existing rip-up. An unavoidable straddling-wrapper obstruction retains best_effort/failed. No wrappers preserves the original static-card matrix path.

## Evidence and limitations
FACT: HEAD 3550b869fce8c5dfa69ea9bd5fb7e02f0ca7d0e0; staff_router.rs SHA-256 2803c0b4c76fcc1b5ad673068e02d0c594642f68e26c78adb3dc71d30abd479a. git diff --check clean. Full cargo output is appended above, without pipes. Initial compile errors are retained and explicitly not counted as behavioral RED. Baseline/comparison output overlaps where processes ran concurrently; final live full-run output precedes diagnostic snapshots. No changes to types.rs, other core modules, SDK files, integration expectations, committed WASM, branches, or commits.
FACT: Mutation coverage is five named behavior checks, not a claim of exhaustive mutation coverage of every numeric validation clause. No independent review was performed.

## Post-deploy
FACT: NOT_TESTED / out of scope: no deployment or WASM regeneration. A* remains gated; T113 collapsed-grid wrappers and collapsed docking remain deferred to the coordinate-system follow-on.
NEXT: Coordinator review of the three integration expectation changes before claiming R11-A fully accepted.
FACT: Final native checkpoint refreshed successfully (exit 0, OK): 216d9e14c40d3cf22349287d4c211c6d-2-8f700904714f.
STATUS BLOCKED — Frames implementation and six focused tests complete; full cargo test has three integration expectation failures requiring coordinator review outside the assigned files. Full evidence appended; types.rs and WASM untouched.
