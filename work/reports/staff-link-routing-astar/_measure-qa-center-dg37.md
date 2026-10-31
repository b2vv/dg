ДАЛІ: виконати замір центрів dev/qa та tlb/qh, прибрати тимчасовий probe.

## Замір 2026-10-31

Scope: лише тимчасовий Rust example і цей append-only файл; production не змінювати. READY: вхід /tmp/ta0-mock3.json наявний; near, useAstar, deptGrouping, treeBlockLayout увімкнені. Формула центрів — bounds усіх карток відділу; центр посади = x + width/2. Пряме читання типів/entrypoint достатнє для цього заміру; implementation/review/deploy gates N/A.

HEAD: 72008bed56f5162564a0de719c38b65fc80a058e

Початковий WIP (не чіпати):
```
 M packages/core/src/staff_layout.rs
 M packages/sdk/src/wasm/pkg/org_hierarchy_core_bg.wasm
?? packages/core/examples/bus_probe.rs
?? work/reports/staff-link-routing-astar/_analysis-codex-dg37.md
?? work/reports/staff-link-routing-astar/_analysis-critic-dg37.md
?? work/reports/staff-link-routing-astar/_critic-order-dg37.md
?? work/reports/staff-link-routing-astar/_design-TCL-dg37.md
?? work/reports/staff-link-routing-astar/_diag-detour-dg37.md
?? work/reports/staff-link-routing-astar/_impl-S1-dg37.md
?? work/reports/staff-link-routing-astar/_impl-TCL-dg37.md
?? work/reports/staff-link-routing-astar/_probe-S2-lowtraverse-dg37.md
?? work/reports/staff-link-routing-astar/_probe-tiergap-dg37.md
```

Результат `cargo run --quiet --manifest-path packages/core/Cargo.toml --example qa_center_measure_dg37`: exit 0, PASS.

| Величина | px |
|---|---:|
| dev-center | 5012 |
| qa-center | 5012 |
| tlb.x (центр картки) | 4930 |
| qh.x (центр картки) | 5012 |
| Δ(dev-center − qa-center) | 0 |
| Δ(tlb.x − dev-center) | −82 |
| Δ(tlb.x − qh.x) | −82 |

Bounds: dev — 5 карток, [4616, 5408]; qa — 3 картки, [4698, 5326]. Ширина карток tlb/qh = 300; їхні ліві x = 4780/4862. Вхід містить admin-зв’язок tlb → qh.

**Вердикт #1 — лінія від tlb.** Центри блоків збігаються точно; qh також на осі dev/qa. tlb стоїть на 82 px лівіше цієї осі, тому QA виглядає правіше від початку конектора. Цей замір не дає підстав для центрувального фіксу pack_tree_block place.

Probe видалено. SHA-256 усіх початкових dirty/untracked файлів збігаються зі стартом; єдиний доданий файл у git status — цей звіт. Початкове дерево вже було dirty, включно з чужим bus_probe.rs: його збережено. Production, npm, commit/push/worktree не зачіпалися. Завершено; подальших дій у межах заміру немає.
