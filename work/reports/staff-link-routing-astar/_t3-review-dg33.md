claude-opus-4-8

ДАЛІ: прочитати staff_router.rs (новий блок після детектора + 3 тести), lib.rs:33, plan.md:62-63, spec.md (AC2/AC5), tasks.md:24, мокап shps-links.js:56,89,114-123. Потім звірити еталон.

ФАКТ: wall() (router:312-331) дзеркалить мокап :116 точно — coords+dedup у out, gap<2 skip, midpoint R((a+b)/2), ±lane з гейтами m-lane>a+1 / m+lane<b-1. LANE=8=S.lane.
ФАКТ: edge_hits() (:300-307) = hit() :89 — строга нерівність на fixed-осі (fixed>x1 && fixed<x2), overlap max<min на рухомій. Лінія впритул до краю картки НЕ блок. ✓
ФАКТ: mh=(nx-1)*ny, mv=nx*(ny-1) (:414-415) = мокап :121. Індексація h_blocked/v_blocked (:283-289) збігається з build (:420,432). ✓
ФАКТ: coord-lines рамок (:366-379) = мокап :117 — x: d.x, d.x+w, d.x-14, d.x+w+14, d.x+12, d.x+w-12; y: d.y, d.y+h, d.y+38, d.y+h+14, d.y+h-12, d.y-14. ✓ Картки = єдина прохідність (padded лише з cards :405-411); рамки блокувань не дають (frames-only тест :774-796 зелений).
ФАКТ: pad=MIN_CLEARANCE_PX=8 (:354,33); LANE окрема конст=8; заголовок HEADER_BAND=38 окремо. Не змішано. ✓
ФАКТ: детермінізм — quant 0.5 перед dedup (wall + finalize_lines :334-343), sort partial_cmp, dedup_by_key(line_key). HashMap лише для lookup (xi/yi), не ітерується на вихід → порядок не тече. line_key сусідніх 0.5px не колізує. ✓
ФАКТ: межові — saturating_sub на nx/ny (:414-415,417,426); canvas bounds завжди в wx/wy → nx,ny≥1; порожні цикли при nx=1 не паникують. frames-only/no-cards → mh/mv all 0. ✓
ФАКТ: obstacle_rect (staff_geom:112-116) → raw rect при obstacle=None → тест-координати xi(42/158/100), yi(42/118) валідні.
ФАКТ: тести чесні — blocks_under_padded_cards_only (:747-772) має позитив (blocked_inside під карткою) І негатив (free_left зліва), не тавтологія. sparse-тест (:707-744) перевіряє nx<40 (не 400/8 raster), розміри матриць, конкретні лінії, лінію в gap. Усі 3 падали б без фічі (виклик build_corridor_grid не скомпілювався б).
ФАКТ: scope — build без occupancy/deptOK/A*/per-edge. det_bus_ys як параметр (exact Y-лінії, мокап :118 det.forEach(Y.add(e.by))), empty valid — не T4-витік.
ФАКТ: SX вторинний порт (мокап :118 X.add(...+SX)) омінуто навмисно (p2 deferred) — без наслідків для T3.
ФАКТ: plan.md:62 збігається з кодом (sparse wall, mH/mV лише картки, рамки = координати, card+pad=8, gap≥2px). :63 — про T4 (grid_blocked/deptOK), не стосується цього коду.
ФАКТ: cargo test staff_router = 14 passed; clippy чисто; fmt чисто.
РІШЕННЯ: ПРИЙНЯТИ. Блокерів нема. Non-blocking: det_bus_ys-параметр не згаданий у plan.md:62 (вірний мокапу, не дефект); free_left перевіряє лише x<40 (адекватно, міг би бути строгішим).
