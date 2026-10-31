claude-opus-4-8

ДАЛІ: прочитати розділ T-S у tasks-zigzag.md та код pack_tree_block навколо правки (контекст attach_x, children_of, chunk_by, subtree_width), тоді звірити коректність/дискримінаційність/регресії й прожену гейти.

ФАКТ: diff лише в pack_tree_block (staff_layout.rs:908-945) + 3 тести. route_stats/детектор не чіпано → зниження cross суто геометричне.
ФАКТ: parent_of (крок2, 814-822) і cycle-guard (крок3, 824-850) НЕ змінено. Правка — лише reorder sibling-ів у межах чанка однакового attach_x (chunk_by_mut), партиціонує singleton/dept зі збереженням порядку, вставляє singleton у ширино-збалансовану середину депів. Різні attach_x в різних чанках — не чіпаються. Forest-roots (parent=None) не в children_of → не чіпаються.
ФАКТ: subtree_w мемоізовано ПЕРЕД reorder (911-913); subtree_width порядко-незалежна (sum+gaps) → reorder не інвалідовує. place (крок6) бере порядок children_of напряму → reorder справді рухає x. unwrap() безпечний (всі i заповнені).
ФАКТ дискримінантність test1: hgap=20 (geom_tree). Після фіксу [a,asst,b] центровані → asst.x==ceo.x (band-center math: asst на band_start+156, ceo.x=center-68=band_start+156, diff=0). RED-лог автора: asst.x=344,ceo.x=188 → diff=156>20 FAIL. Off-by-one-slot, саме це фікс виправляє. RED справжній.
ФАКТ: гейти прожено незалежно: cargo fmt --check exit0; cargo clippy --all-targets -D warnings exit0; cargo test 196 passed 0 failed (3 нові ok). /tmp/rev-*.log.
ФАКТ: probe чисто — ts_probe.rs відсутній; examples/depth_probe.rs — tracked, не з цього таску (не в ?? списку). git diff --check чисто.
НІТИ (non-blocking): (1) width-closure додає hgap до кожного члена → total має n gaps замість n-1; це лише евристика "ближче до центру", split не зсувається значуще; (2) f32 == для меж чанка надійне (однакова member.x = ті самі біти); (3) split=0 дефолт (singleton зліва) коли жоден dept не б'є — детермінантно.
РІШЕННЯ: GREEN. Фікс коректний, детермінований, тести дискримінантні, регресій нема (Rust-рівень), гейти зелені. Обмеження автора (npm/SDK/non-mock3 golden не прогнані) — у межах Rust-only доручення, не блокер. Готово до коміту.
