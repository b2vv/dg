NEXT: Rebaseline validated expectations; preserve turns-before-lex coverage; run full Cargo tests and Clippy.
SCOPE: feat/extensibility. Only multi_source_parent.rs and this append-only log; preserve existing WIP. No build:wasm or external store.
PLAN: Compare forced candidate layouts with evaluation disabled, assert equal crossings and unequal turns, then verify selection defeats lexicographic order.
BASELINE: Focused suite reproduces the three expected failures. Initial log creation used the Cargo working directory and failed before writing; corrected here using repository root.
error: could not find `Cargo.toml` in `/Users/strelia/projects/dg` or any parent directory
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 2.06s
     Running tests/multi_source_parent.rs (target/debug/deps/multi_source_parent-388af635cfedc713)

running 1 test
PROBE m00 100: (0, 4) (0, 4)
PROBE m00 200: (0, 4) (0, 4)
PROBE m00 400: (0, 4) (0, 4)
PROBE m00 600: (0, 4) (0, 4)
PROBE m01 100: (0, 4) (0, 4)
PROBE m01 200: (0, 4) (0, 4)
PROBE m01 400: (0, 4) (0, 4)
PROBE m01 600: (0, 4) (0, 4)
PROBE h00 100: (0, 4) (0, 4)
PROBE h00 200: (0, 4) (0, 4)
PROBE h00 400: (0, 4) (0, 4)
PROBE h00 600: (0, 4) (0, 4)
PROBE h01 100: (0, 4) (0, 4)
PROBE h01 200: (0, 4) (0, 4)
PROBE h01 400: (0, 4) (0, 4)
PROBE h01 600: (0, 4) (0, 4)

thread 'probe_turns_scene' (3921390) panicked at tests/multi_source_parent.rs:225:5:
no scene
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
test probe_turns_scene ... FAILED

failures:

failures:
    probe_turns_scene

test result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 8 filtered out; finished in 0.14s

error: test failed, to rerun pass `-p org-hierarchy-core --test multi_source_parent`
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.44s
     Running tests/multi_source_parent.rs (target/debug/deps/multi_source_parent-388af635cfedc713)

running 1 test
PROBE root None 1: (0, 4) (0, 4)
PROBE root None 2: (0, 6) (0, 6)
PROBE root None 3: (0, 6) (0, 6)
PROBE root None 4: (0, 8) (0, 8)
PROBE root Some("d0") 1: (0, 4) (0, 2)
FOUND ["A*: cross=0 over=0 card=0 near8=0 dept=0 bends=6 turns=6 excess=0 marked=0 edges=5", "Multi-source parents: d0=h00"]
test probe_turns_scene ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 8 filtered out; finished in 0.07s

   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.24s
     Running tests/multi_source_parent.rs (target/debug/deps/multi_source_parent-388af635cfedc713)

running 1 test
PROBE root None 1: (0, 4) (0, 4)
PROBE root None 2: (0, 6) (0, 6)
PROBE root None 3: (0, 6) (0, 6)
PROBE root None 4: (0, 8) (0, 8)
PROBE root Some("d0") 1: (0, 4) (0, 2)
CANDIDATE ["A*: cross=0 over=0 card=0 near8=0 dept=0 bends=6 turns=6 excess=0 marked=0 edges=5", "Multi-source parents: d0=h00"] turns=4
PROBE root Some("d0") 2: (0, 10) (0, 6)
CANDIDATE ["A*: cross=0 over=0 card=0 near8=0 dept=0 bends=12 turns=12 excess=0 marked=0 edges=6", "Multi-source parents: d0=extra0"] turns=4
PROBE root Some("d0") 3: (0, 8) (0, 2)
CANDIDATE ["A*: cross=0 over=0 card=0 near8=0 dept=0 bends=10 turns=10 excess=0 marked=0 edges=7", "Multi-source parents: d0=h01"] turns=2
test probe_turns_scene ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 8 filtered out; finished in 0.21s

   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.39s
     Running tests/multi_source_parent.rs (target/debug/deps/multi_source_parent-388af635cfedc713)

running 1 test
PROBE root None 1: (0, 6) (0, 10)
PROBE root None 2: (0, 10) (0, 14)
PROBE root None 3: (0, 10) (0, 14)
PROBE root None 4: (0, 14) (0, 18)
PROBE root Some("extra") 1: (0, 6) (0, 10)
PROBE root Some("extra") 2: (0, 10) (0, 14)
PROBE root Some("extra") 3: (0, 12) (0, 16)
PROBE root Some("extra") 4: (0, 12) (0, 16)
PROBE m00 None 1: (0, 10) (0, 10)
PROBE m00 None 2: (0, 10) (0, 14)
PROBE m00 None 3: (0, 14) (0, 14)
PROBE m00 None 4: (0, 14) (0, 18)
PROBE m00 Some("extra") 1: (0, 10) (0, 10)
PROBE m00 Some("extra") 2: (0, 16) (0, 14)
CANDIDATE ["A*: cross=0 over=0 card=0 near8=0 dept=0 bends=14 turns=14 excess=0 marked=0 edges=6", "Multi-source parents: d0=h01"] turns=14
test probe_turns_scene ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 8 filtered out; finished in 0.21s

FINDING: Width-only probes tied. Early exploratory turn counts mishandled signum(0); corrected before final assertions. The retained scene adds a two-head sibling department under m00, with only h00/h01 competing for d0: equal zero crossings, 16 versus 14 true turns. Exploratory probe removed.
CHANGE: Zero-crossing baselines and comments updated. Original tied scene renamed to lexicographic convergence; a new focused test retains the turns-before-lex name and asserts candidate scores and selection across declaration reversal.
VERIFY: cargo test -p org-hierarchy-core --test multi_source_parent (full output follows).
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.21s
     Running tests/multi_source_parent.rs (target/debug/deps/multi_source_parent-388af635cfedc713)

running 9 tests
test multi_source_parent_breaks_equal_scores_lexicographically ... ok
test multi_source_parent_requires_tree_blocks_and_grouping ... ok
test multi_source_parent_astar_converges_on_lexicographic_tie ... ok
test multi_source_parent_falls_back_above_cap_and_ignores_one_parent_block ... ok
test multi_source_parent_prefers_fewer_turns_before_lexicographic_order ... FAILED
test tree_block_default_mock3_head_is_ah_under_fin_deterministically ... ok
test multi_source_parent_evaluates_exactly_twelve_combinations ... ok
test multi_source_parent_chooses_clean_attachment_deterministically ... ok
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.10s
     Running tests/multi_source_parent.rs (target/debug/deps/multi_source_parent-388af635cfedc713)

running 1 test
test multi_source_parent_prefers_fewer_turns_before_lexicographic_order ... FAILED

failures:

---- multi_source_parent_prefers_fewer_turns_before_lexicographic_order stdout ----

thread 'multi_source_parent_prefers_fewer_turns_before_lexicographic_order' (3943469) panicked at tests/multi_source_parent.rs:250:9:
assertion `left == right` failed
  left: (0, 10)
 right: (0, 14)
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace


failures:
    multi_source_parent_prefers_fewer_turns_before_lexicographic_order

test result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 8 filtered out; finished in 0.07s

error: test failed, to rerun pass `-p org-hierarchy-core --test multi_source_parent`
test multi_source_parent_selection_is_lod_independent ... ok

failures:

---- multi_source_parent_prefers_fewer_turns_before_lexicographic_order stdout ----

thread 'multi_source_parent_prefers_fewer_turns_before_lexicographic_order' (3940016) panicked at tests/multi_source_parent.rs:250:9:
assertion `left == right` failed
  left: (0, 10)
 right: (0, 14)
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace


failures:
    multi_source_parent_prefers_fewer_turns_before_lexicographic_order

test result: FAILED. 8 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 33.67s

error: test failed, to rerun pass `-p org-hierarchy-core --test multi_source_parent`
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.43s
     Running tests/multi_source_parent.rs (target/debug/deps/multi_source_parent-388af635cfedc713)

running 1 test
test multi_source_parent_prefers_fewer_turns_before_lexicographic_order ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 8 filtered out; finished in 0.09s

CORRECTION: Reversing every position also changes the sibling department's default head, reducing the selected score to 10 turns. The focused test now swaps only the competing d0 heads, keeping the measured scene otherwise fixed; both declaration orders select h01 with 14 turns. Focused test exit 0.
VERIFY: cargo test -p org-hierarchy-core (full stdout/stderr appended directly; no pipes).
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.09s
     Running unittests src/lib.rs (target/debug/deps/org_hierarchy_core-30558e9d3bc57f5d)

running 219 tests
test org_layout::tests::layout_failure_negative_height ... ok
test org_layout::tests::layout_failure_nan_node_width ... ok
test org_tree::tests::extract_subtree_failure_unknown ... ok
test org_tree::tests::validate_failure_cycle ... ok
test org_tree::tests::validate_failure_duplicate_id ... ok
test org_tree::tests::extract_subtree_success ... ok
test org_layout::tests::layout_failure_unknown_root ... ok
test org_tree::tests::validate_failure_unknown_parent ... ok
test org_layout::tests::layout_failure_unknown_parent ... ok
test org_tree::tests::extract_subtree_keeps_sibling_order ... ok
test org_tree::tests::validate_success_single_root ... ok
test hierarchy::tests::build_from_flat_keeps_sibling_order ... ok
test ploeg_layout::tests::ploeg_layered_lone_child_keeps_parent_x ... ok
test ploeg_layout::tests::ploeg_layered_parent_above_children ... ok
test hierarchy::tests::build_from_flat_defaults_status_from_person ... ok
test ploeg_layout::tests::ploeg_layered_sibling_chains_form_a_grid ... ok
test ploeg_layout::tests::ploeg_layered_siblings_same_row ... ok
test staff_bounds::tests::empty_nodes_fall_back_to_band_and_canvas_width ... ok
test staff_bounds::tests::org_cards_empty_falls_back_to_canvas_width ... ok
test staff_bounds::tests::org_cards_union_cards_and_tier3_nodes ... ok
test org_layout::tests::layout_success_depth_monotonic ... ok
test staff_bounds::tests::label_band_widens_only_the_top ... ok
test staff_bounds::tests::staff_block_bounds_union_nodes_for_org_and_tier ... ok
test staff_bounds::tests::enrich_fills_geometry_and_keeps_identity ... ok
test staff_bounds::tests::content_padding_grows_block_by_overhang_both_sides ... ok
test staff_bounds::tests::content_padding_zero_equals_bare ... ok
test staff_clearance::tests::card_clearance_clean_route_has_zero_violations ... ok
test staff_clearance::tests::card_clearance_exempts_own_endpoints ... ok
test staff_clearance::tests::card_clearance_intruding_route_reports_violations ... ok
test staff_clearance::tests::card_clearance_uses_figma_row_obstacle_not_tile ... ok
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
test staff_layout::tests::dept_grouping_order_overrides_id_alphabet ... ok
test staff_layout::tests::dept_grouping_unknown_department_falls_back_to_no_dept ... ok
test staff_layout::tests::dept_grouping_places_second_dept_right_and_stamps_dept ... ok
test staff_layout::tests::dept_head_absent_for_dept_with_no_outside_rooted_member ... ok
test staff_layout::tests::dept_head_excludes_member_with_parent_inside_same_dept ... ok
test staff_layout::tests::dept_grouping_member_sibling_order_follows_order_not_id ... ok
test staff_layout::tests::dept_head_ignores_positions_without_department ... ok
test staff_layout::tests::dept_head_is_member_whose_admin_parent_is_outside_dept ... ok
test staff_layout::tests::dept_head_multi_root_is_deterministic_by_position_id_not_input_order ... ok
test staff_layout::tests::detached_roots_are_parentless_non_heads ... ok
test staff_layout::tests::orchestrator_dept_grouping_emits_frames ... ok
test staff_layout::tests::orchestrator_expanded_child_places_staff_tier3 ... ok
test staff_layout::tests::orchestrator_zero_positions_current_empty_but_valid ... ok
test staff_layout::tests::orchestrator_managing_tier1_and_lead_org_edge ... ok
test staff_layout::tests::orchestrator_unknown_current_org_errors ... ok
test staff_layout::tests::orchestrator_single_org_tier2_only ... ok
test staff_layout::tests::org_block_empty_org_returns_zero ... ok
test staff_layout::tests::orchestrator_determinism_identical_twice ... ok
test staff_layout::tests::orchestrator_tier2_shift_equals_block_plus_margin ... ok
test staff_layout::tests::org_block_filters_other_orgs ... ok
test staff_layout::tests::org_block_single_position_tree ... ok
test staff_layout::tests::pin_external_pushes_block_down_and_adds_edge ... ok
test staff_layout::tests::orchestrator_tier3_cards_and_lead_org_to_cards ... ok
test staff_layout::tests::pin_external_skipped_when_manager_unknown ... ok
test staff_layout::tests::resolve_head_errors_on_ambiguity ... ok
test staff_layout::tests::resolve_head_single_is_head ... ok
test staff_layout::tests::resolve_head_single_parentless_when_no_is_head ... ok
test staff_layout::tests::resolve_person_hints_maps_both_variants_one_to_one ... ok
test staff_layout::tests::side_column_collision_ejects_second_box_down_deterministically ... ok
test staff_layout::tests::side_column_offsets_groups_right_of_anchors ... ok
test staff_layout::tests::org_block_determinism_identical_twice ... ok
test staff_layout::tests::tree_block_cycle_does_not_panic_and_places_all ... ok
test staff_layout::tests::tree_block_child_dept_sits_below_parent ... ok
test staff_layout::tests::tree_block_no_dept_singleton_sits_under_parent_dept ... ok
test staff_layout::tests::tree_block_stamps_department_id ... ok
test staff_layout::tests::tree_block_head_uses_declaration_order_not_parent_id ... ok
test staff_layout::tests::tree_block_places_detached_right_of_attached ... ok
test staff_layout::tests::tree_block_singleton_stays_near_its_no_dept_parent ... ok
test staff_layout::tests::tree_block_singleton_placement_is_stable_with_missing_parent_and_cycle ... ok
test staff_layout::tests::tree_block_siblings_ordered_by_attachment_x ... ok
test staff_mockup_layout::tests::dump_mockup_golden ... ignored
test staff_layout::tests::tree_block_singletons_balance_width_not_sibling_count ... ok
test staff_mockup_layout::tests::a_row_is_top_aligned_and_the_next_row_clears_its_tallest_card ... ok
test staff_mockup_layout::tests::invalid_or_duplicate_sizes_are_errors_not_fallbacks ... ok
test staff_layout::tests::singleton_attachment_aligns_with_sibling_department_frame ... ok
test staff_mockup_layout::tests::a_taller_card_grows_its_department_frame ... ok
test staff_mockup_layout::tests::a_wider_card_pushes_its_siblings_apart ... ok
test staff_mockup_layout::tests::places_all_nodes_and_dept_frame ... ok
test staff_packing::tests::department_cards_sit_below_header_and_frame_includes_it ... ok
test staff_mockup_layout::tests::between_blocks_uses_bv_not_lv ... ok
test staff_mockup_layout::tests::emits_parent_child_edges ... ok
test staff_packing::tests::empty_department_is_excluded_without_panicking ... ok
test staff_packing::tests::loose_root_aligns_with_department_row_and_has_no_frame ... ok
test staff_mockup_layout::tests::within_dept_uses_lv_between_levels ... ok
test staff_packing::tests::multi_member_frame_wraps_union_aabb ... ok
test staff_mockup_layout::tests::the_bus_runs_below_the_row_not_below_a_shorter_manager ... ok
test staff_packing::tests::single_member_frame_expands_bbox_by_padding ... ok
test staff_packing::tests::split_department_stamps_part_index_on_frames_and_nodes ... ok
test staff_packing::tests::two_departments_frame_edge_gap_equals_horizontal_gap ... ok
test staff_router::tests::astar_detours_around_a_foreign_card ... ok
test staff_router::tests::astar_degrades_to_best_effort_on_an_off_grid_port ... ok
test staff_router::tests::clean_scene_is_all_zero ... ok
test staff_router::tests::astar_routes_orthogonally_and_enters_target_from_above ... ok
test staff_router::tests::crossing_between_different_managers_is_counted ... ok
test staff_router::tests::corridor_grid_blocks_under_padded_cards_only ... ok
test staff_router::tests::astar_is_deterministic ... ok
test staff_router::tests::corridor_grid_frames_contribute_coordinates_not_blocking ... ok
test staff_router::tests::diagonal_segment_is_detected_by_the_ortho_probe ... ok
test staff_router::tests::line_on_card_boundary_is_near_not_through ... ok
test staff_router::tests::corridor_grid_is_sparse_well_formed_and_card_aligned ... ok
test staff_mockup_layout::tests::output_is_deterministic ... ok
test staff_router::tests::line_through_card_interior_is_through_not_near ... ok
test staff_router::tests::line_through_foreign_frame_is_counted ... ok
test staff_router::tests::own_endpoint_card_is_never_a_violation ... ok
test staff_router::tests::partial_overlap_of_different_managers_is_counted ... ok
test staff_router::tests::occupancy_pushes_a_foreign_line_onto_its_own_lane ... ok
test staff_router::tests::ripup_is_deterministic_and_a_noop_when_already_clean ... ok
test staff_router::tests::releasing_occupancy_restores_the_straight_route ... ok
test staff_router::tests::route_stats_detailed_flags_both_edges_of_a_crossing ... ok
test staff_router::tests::shared_bus_of_siblings_is_not_an_overlap ... ok
test staff_router::tests::sibling_bus_junction_is_not_a_crossing ... ok
test staff_router::tests::straight_through_sibling_trunk_is_not_a_crossing ... ok
test staff_router::tests::astar_detours_around_a_foreign_frame ... ok
test staff_router::tests::route_edges_occupies_a_best_effort_edge_without_panicking ... ok
test staff_router::tests::wrappers_foreign_container_detour_has_clearance ... ok
test staff_router::tests::wrappers_no_frames_preserves_straight_route ... ok
test staff_router::tests::ripup_bends_a_dirty_internal_elbow ... ok
test staff_router::tests::wrappers_invalid_geometry_is_skipped_with_exact_parity ... ok
test staff_router::tests::wrappers_single_and_nested_ancestors_are_excluded ... ok
test staff_router::tests::wrappers_straddling_endpoint_keeps_no_path_residual ... ok
test staff_routes::tests::admin_vertical_clean_stays_vertical ... ok
test staff_routes::tests::aligned_x_produces_straight_two_point_route ... ok
test staff_routes::tests::admin_vertical_blocked_horizontal_clean_takes_horizontal ... ok
test staff_routes::tests::avoidance_is_byte_identical_when_no_card_blocks ... ok
test staff_routes::tests::avoidance_is_deterministic_across_runs ... ok
test staff_routes::tests::avoidance_detours_resolvable_block_clearing_violations ... ok
test staff_routes::tests::card_index_matches_naive_including_near_miss_outside_bbox ... ok
test staff_routes::tests::avoidance_leaves_unresolvable_block_as_remnant ... ok
test staff_routes::tests::card_index_near_miss_is_detected_as_blocker ... ok
test staff_routes::tests::collinear_z_fallback_has_no_true_turns ... ok
test staff_routes::tests::corridor_y_is_midpoint_matching_legacy ... ok
test staff_router::tests::wrappers_internal_elbow_near_foreign_frame_is_rerouted ... ok
test staff_routes::tests::cross_dept_admin_into_head_docks_on_frame_top ... ok
test staff_routes::tests::dept_top_port_tracks_head_cx_not_source_cx ... ok
test staff_routes::tests::elbow_endpoints_sit_on_center_ports_and_is_orthogonal ... ok
test staff_routes::tests::figma_hint_docks_source_port_on_tile_center ... ok
test staff_routes::tests::detour_leaves_a_violation_on_the_hard_schemas ... ok
test staff_routes::tests::foreign_frame_resolvable_is_avoided_without_marker ... ok
test staff_routes::tests::foreign_frame_resolvable_via_side_detour ... ok
test staff_routes::tests::foreign_frame_unresolvable_is_marked ... ok
test staff_routes::tests::clean_schemas_have_no_violations ... ok
test staff_routes::tests::intra_dept_admin_stays_on_card_top ... ok
test staff_routes::tests::lead_org_person_to_org_card_resolves ... ok
test staff_routes::tests::marker_equals_detector_by_construction ... ok
test staff_routes::tests::matrix_child_above_routes_vertical_upward ... ok
test staff_routes::tests::h6_combined_scene_matches_golden ... ok
test staff_routes::tests::h6_combined_scene_is_byte_identical_across_runs ... ok
test staff_routes::tests::matrix_edge_prefers_horizontal_side_ports ... ok
test staff_routes::tests::near_no_hints_is_numerically_identical_to_raw_node_route ... ok
test staff_routes::tests::no_frames_means_no_marker_and_parity ... ok
test staff_routes::tests::non_admin_into_head_does_not_dock_on_frame_top ... ok
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
test staff_routes::tests::t7_internal_tree_edges_are_ortho_elbows ... ok
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
test staff_router::tests::route_edges_single_pass_separates_two_managers ... ok
test staff_routes::tests::ac10_all_schemas_zero_violations ... ok
test staff_router::tests::ripup_clears_a_crossing_that_single_pass_leaves ... ok
test staff_routes::tests::t8a_astar_branch_routes_far_lod_scene_with_org_on_grid ... ok
test hierarchy::tests::build_from_flat_handles_a_chain_that_used_to_blow_the_stack ... ok
test staff_mockup_layout::tests::mock3_astar_zero_crossings_and_card_hits ... ok
test staff_mockup_layout::tests::mixed_heights_on_the_full_scene_keep_zero_crossings_and_card_hits ... ok
test staff_mockup_layout::tests::mock3_astar_deterministic ... ok
test staff_mockup_layout::tests::equal_sizes_reproduce_the_pre_change_golden ... ok

test result: ok. 218 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.16s

     Running tests/multi_source_parent.rs (target/debug/deps/multi_source_parent-388af635cfedc713)

running 9 tests
test multi_source_parent_breaks_equal_scores_lexicographically ... ok
test multi_source_parent_requires_tree_blocks_and_grouping ... ok
test multi_source_parent_astar_converges_on_lexicographic_tie ... ok
test multi_source_parent_falls_back_above_cap_and_ignores_one_parent_block ... ok
test multi_source_parent_prefers_fewer_turns_before_lexicographic_order ... ok
test tree_block_default_mock3_head_is_ah_under_fin_deterministically ... ok
test multi_source_parent_evaluates_exactly_twelve_combinations ... ok
test multi_source_parent_chooses_clean_attachment_deterministically ... ok
test multi_source_parent_selection_is_lod_independent ... ok

test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 32.63s

   Doc-tests org_hierarchy_core

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

VERIFY: cargo clippy -p org-hierarchy-core --all-targets -- -D warnings (full stdout/stderr; no pipes).
    Checking org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.46s
DONE: Rebaselined both crossing assertions to 0 and corrected their comments. The original A* scene now asserts lexicographic convergence on h00. Added a focused unequal-turn scene asserting zero crossings for both candidates, 16 versus 14 turns, and selection of lexicographically later h01 in both competing-head declaration orders.
TESTED: Full cargo test -p org-hierarchy-core exited 0: 218 unit tests passed, 1 pre-existing ignored; all 9 integration tests passed; doc tests passed (0 tests). cargo clippy -p org-hierarchy-core --all-targets -- -D warnings exited 0. Complete output is appended above. git diff --check passed.
SCOPE: Only packages/core/tests/multi_source_parent.rs was edited, plus this append-only report. No staff_router.rs changes by this task; no build:wasm; no external store; no commit or push.
LIMITATION: Native checkpoint invocation parameters were not found in the registered Codex configuration; no external checkpoint was written. Current host/root/session identity was supplied by native events.
STATUS: PASS — R11 Rust test rebaseline complete; turns-before-lex coverage preserved; full Cargo tests and Clippy green.
