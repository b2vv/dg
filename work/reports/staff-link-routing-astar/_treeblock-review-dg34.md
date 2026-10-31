claude-opus-4-8

# R6 ПІСЛЯ-review tree-block layout (T128/крок1) — dg34

ДАЛІ: читаю git diff staff_layout.rs + types.rs.

ФАКТ: types.rs — додано `tree_block_layout: Option<bool>` (serde rename treeBlockLayout, default). Geom += `tree_block: bool`. compute_staff_geometry: `tree_block: input.tree_block_layout.unwrap_or(false)` (staff_layout.rs:1293). Default false.

ФАКТ (overlap, Q1): region_bounds (:1000) бере x..x+width/y..y+height → bbox враховує розміри вузлів (top-left origin). subtree_width = max(bw, total_children+gaps). place: кожна дитина в [cursor, cursor+subtree_width(c)], cursor += sw+hgap → піддерева сиблінгів горизонтально диз'юнктні; band центрована в sw → батько block_x=left+sw/2-bw/2 ⊆ [left,left+sw]. Індукція: усе піддерево ⊆ [left,left+sw]. Вертикаль: child_top=top+bh+vgap → нащадок строго нижче предка; єдині горизонтально-перетинні пари = предок/нащадок. ВИСНОВОК: перекриття блоків НЕМАЄ. Центрування «над смугою» == над subtree_width (band сама центрована) — коректно обидва трактування. ДЕФЕКТУ НЕМАЄ.

ФАКТ (cycle R1): крок3 — зовн. loop + внутр. reachability-fixpoint. Кожна зовн. ітерація робить min 1 orphan коренем (parent=None→reachable); reachable лише зростає → термінація ≤ n ітерацій. Жодного unplaced (roots=parent None, place рекурсує children_of=всі reachable). Один Option parent → подвійного батька нема. Мультикорінь форесту ОК (roots зліва-направо за індексом блоку). ДЕФЕКТУ НЕМАЄ.

ФАКТ (детермінізм AC8): sort_by attach_x.partial_cmp.unwrap_or(Equal).then(index). NaN→Equal→index; INF порівнюється штатно; рівні→index. HashMap: buckets/pos_to_block/parent_of читаються лише .get() (не ітерація); члени — у comparePositions-порядку (vec), dept_ids sorted vec; children_of/roots будуються ітерацією 0..n. out = block-order×member-order. Повністю детерміновано. ДЕФЕКТУ НЕМАЄ.

ФАКТ (attach_x Q3): локальний member.x у батьк-блоці; усі члени блоку мають один зсув dx → локальний порядок == фінальний. src=parents.get(head) завжди член батьк-блоку (бо саме так визначено parent_of), INFINITY-фолбек недосяжний для реальних дітей. ДЕФЕКТУ НЕМАЄ.

ФАКТ (stamp R2 + part_index): емісія (:986) department_id=b.dept_id.clone() (Some дін / None no-dept), part_index=None. layout_connected_tree (:398) і так дає part_index=None → надлишково, не дивергенція. department_frames_from_nodes (:1258) групує ЛИШЕ за department_id, part_index у групуванні не бере участі → рамки переживають. ДЕФЕКТУ НЕМАЄ. (Flat-шлях теж штампує Some(dept) / None.)

ФАКТ (edge-cases): n==0→Ok(empty); порожні members skip; singleton-dept→leaf root на (margin,margin); no-dept empty skip; cursor_x=margin, top=margin старт коректні. ДЕФЕКТУ НЕМАЄ.

ФАКТ (тести): cargo test tree_block → 6 passed (5 нових фічі + 1 прее존уючий `tree_block_places_detached_right_of_attached`, що тестує ІНШУ ф-цію layout_tree_block, збіг за підрядком імені). child_dept/no_dept_singleton/siblings_ordered мають контроль vs flat → впали б без фічі (teeth). stamp — teeth проти нового шляху (прибрати `department_id: b.dept_id` → падає). cycle — teeth проти infinite-loop/dropped block, але асертить лише out.len()==2 (не позиції) — м'якший. Жоден не true-без-фічі у шкідливому сенсі.

## ЗНАХІДКИ

**F1 [Low, НЕ блокує] Хибний коментар «ітеративний через явний стек» — код рекурсивний.**
staff_layout.rs:~768 коментар: «Ітеративний memo через явний стек, щоб не впертися в глибину
стеку на довгих ланцюгах». Насправді `fn subtree_width` (:769) і `fn place` (:~820) — звичайна
рекурсія, що кличе себе (підтверджено grep: subtree_width→subtree_width, place→place).
Глибина рекурсії = глибина дерева БЛОКІВ (ланцюг відділів), не членів. Практично малий (десятки
відділів), тож SO малоймовірний, АЛЕ: (а) коментар фактично неправдивий і введе в оману мейнтейнера,
який повірить у stack-safety й поглибить ланцюг; (б) гарда глибини немає, на відміну від
admin_descendant_ids (:310) та стекового обходу деінде. Дія: або прибрати хибний коментар, або
справді зробити ітеративним.

**F2 [Low, НЕ блокує, спекулятивно] Можливе накладання РАМОК відділів (не блоків).**
Дочірній блок ставиться на child_top = низ_батька + vgap. department_frames_from_nodes додає
content_padding навколо bbox кожного відділу. Якщо content_padding > ~vgap, рамка батьк-відділу
розшириться вниз у проміжок і візуально перекриє дочірній блок/рамку. Блоки-вузли не перекриваються
(F1 вище доведено), йдеться лише про рамки-прямокутники. Для dev/bring-up (мокап3) прийнятно;
варто перевірити співвідношення content_padding vs vertical_gap перед продом.

## ВЕРДИКТ
Корінна логіка (overlap-гарантія, cycle-break, детермінізм, attach-x, stamp, edge-cases)
КОРЕКТНА — блокуючих дефектів коректності НЕ знайдено. Дві незаблокуючі знахідки: F1 (хибний
коментар про ітеративність + відсутня гарда глибини) і F2 (можливе накладання рамок). Gate:
ЗЕЛЕНИЙ (немає відкритих блокерів).
