# Reingold–Tilford — алгоритм розкладки під tidy-tree dg

Ієрархічне дерево (корінь → діти → …) dg розкладає **алгоритмом Рейнгольда–Тілфорда**
(Reingold & Tilford, *Tidier Drawings of Trees*, 1981), узагальненим Walker II (1990) на
n-арні дерева й доведеним до лінійного часу **O(n)** Buchheim–Jünger–Leipert (2002).
У коді це конструктор `with_layered_tidy` крейта [`tidy-tree` 0.1](https://github.com/zxch3n/tidy),
який dg жорстко бере в [`packages/core/src/ploeg_layout.rs:13`](../../packages/core/src/ploeg_layout.rs);
результат виходить назовні як `algorithm: "ploeg-layered-tidy"`. Виняток: ШПС-хост після
WASM може робити власний пост-центрувальний прохід — він **не** частина цього алгоритму й
тут не описується.

⚠️ Де схема й код розійдуться — **виграє код**. **Числа нижче зміряні** живим WASM через
`computeOrgRowTreeLayoutWasm` (`nodeWidth=200, nodeHeight=72, hGap=40, vGap=60`), не оцінені.
Перевірка інваріантів — [`packages/sdk/src/wasm/reingoldTilford.invariants.test.ts`](../../packages/sdk/src/wasm/reingoldTilford.invariants.test.ts).

---

## 1. Чотири естетики (що алгоритм гарантує)

Дослівно за статтею-джерелом
([spectalizer, 2025](https://www.spectalizer.com/blog/2025-02-reingold-tilford-in-python/)),
у дужках — переказ і наш статус:

1. **«Nodes at the same level of the tree should lie along a straight line, and the straight
   lines defining the levels should be parallel.»**
   Вузли одного рівня — на одній горизонталі; рівні паралельні й рівновіддалені
   (Δy = `nodeHeight + verticalGap`). ✅ зміряно.
2. **«A left son should be positioned to the left of its father and a right son to the right.»**
   Порядок дітей зліва-направо = порядок даних. ✅ зміряно (був реверс gap#6 — виправлено, §4).
3. **«A father should be centered over its sons.»**
   Батько по центру дітей. ✅ зміряно (механізм — §2).
4. **«A tree and its mirror image should produce drawings that are reflections of one another;
   moreover, a subtree should be drawn the same way regardless of where it occurs in the tree.»**
   Дзеркальне дерево = дзеркало рисунка; ізоморфні піддерева малюються конгруентно. ✅ зміряно.

## 2. Як батько отримує свій X (і чому це НЕ центр bbox)

Канонічне правило естетики 3 — батько по **середині центрів ПЕРШОЇ й ОСТАННЬОЇ ПРЯМОЇ
дитини**, а не по центру габаритного прямокутника всього піддерева:

```
x_batka = (center(perša_dytyna) + center(ostannja_dytyna)) / 2
```

(стаття: `x_mid = (pos[children[-1]][0] + pos[children[0]][0]) / 2`; крейт `tidy-tree`:
`position_root()`, `src/layout/tidy_layout.rs:159-164` — `relative_x = (first_child_pos + last_child_pos) / 2`).

**Чому midpoint ≠ центр bbox при асиметрії:** діти — це піддерева різної ширини. Midpoint
*центрів* крайніх дітей дорівнює центру повного прольоту лише коли піддерева симетричні.
Для `root → [L(3 листи), R(лист)]` зміряно: `center(L)+center(R))/2` збігається з `center(root)`
**точно**, і цей X зсунутий від центру bbox усіх вузлів на > 1px. Тобто «корінь ближче до
вужчої гілки» — не дефект, а **визначальне правило** layered-tidy.

> Якщо потрібен інший візуал — батько по центру *габаритів* піддерева — це окреме рішення
> (напр. `with_basic_layout`, що пакує за повною bbox-шириною, або хост-пост-прохід), а **не**
> Reingold–Tilford. Не плутати «виправити центрування» з «змінити правило центрування».

## 3. Два проходи й чому O(n)

Псевдокод (відповідає `TidyLayout` крейта `tidy-tree`,
`src/layout/tidy_layout.rs`: `first_walk`/`second_walk`/`layout`):

```
layout(root):
  init(root); set_y(root)          # y за рівнем (layered)
  first_walk(root)                 # висхідний: прелім-X + розведення
  second_walk(root, mod_sum=0)     # низхідний: абсолютний X = relative_x + Σ modifier

first_walk(node):
  if leaf: set_extreme(node); return
  for kožna dytyna i (зліва-направо):
     first_walk(dytyna)
     separate(node, i)             # розштовхати піддерево i від лівих сусідів за КОНТУРОМ
  position_root(node)              # ← ПЕРЕРАХУНОК центру ПІСЛЯ всіх дітей: midpoint(first,last)
  set_extreme(node)

separate(left, right):
  dist = left.right_contour - right.left_contour + peer_margin
  # зсув кладеться в modifier (відкладено), а не в кожен вузол → O(1) на крок
```

Ключові поля: `relative_x` (прелім), `modifier_to_subtree` (відкладений зсув, сумується в
`second_walk`), `extreme_left/right` + `thread` (вказівник між неспорідненими контур-вузлами,
щоб не обходити глибину повторно). **O(n):** `thread`-контури й відкладені `modifier` дають
сталу амортизовану роботу на вузол. Walker (1990) робив це за **O(n²)** (повторний глибинний
обхід контурів); Buchheim 2002 — саме це виправлення. SSOT на складність — Buchheim.

> 🎯 Критично: `position_root()` стоїть **в кінці** `first_walk`, тобто центр батька
> обчислюється **після** того, як усі діти додані й розведені `separate()`. Інкрементального
> «центру на кожну додану дитину» немає — і не має бути: середина відома лише коли відомі
> крайні діти. Зміряно (`root → [c1,c2,c3]`): `center(root)=364 = (604+124)/2`.

## 4. Виправлено: естетика 2 (реверс сиблінгів) — gap#6

**Було:** вхід `[c1,c2,c3]` bridge віддавав зліва-направо як `c3,c2,c1` (`cx` 604/364/124) —
кожен рівень дзеркалився. Центр батька (естетика 3) при цьому лишався правильним (midpoint
крайніх), ламався лише порядок.

**Причина:** `extract_subtree` (`packages/core/src/org_tree.rs`) робив stack-DFS
`stack.extend(kids)` + LIFO-`pop` — це реверсує сиблінгів на кожному рівні. `ploeg_layout.rs`
той самий прийом уже страхував `.iter().rev()`, а `extract_subtree` — ні.

**Фікс:** `stack.extend(kids.iter().rev())` — LIFO тепер знімає дітей зліва направо, порядок
даних збережено. Запінено на рівні причини (`org_tree.rs` тест `extract_subtree_keeps_sibling_order`)
і на рівні bridge (`reingoldTilford.invariants.test.ts` тест «естетика 2»). Канал «порядок
членів → x-порядок» у dept-grouping тепер прямий (був інверсний) — відповідні тести оновлено.

## 5. Інваріант → де перевірено

| Естетика | Перевірка (тест) | Статус |
|---|---|---|
| 1 рівні/паралельність | `естетика 1` | ✅ |
| 2 порядок даних | `естетика 2` + core `extract_subtree_keeps_sibling_order` | ✅ виправлено (gap#6) |
| 3 центр midpoint (сим.) | `естетика 3 — симетрія` | ✅ |
| 3 центр midpoint (асим.) ≠ bbox | `естетика 3 — асиметрія` | ✅ |
| 4 конгруентність піддерев | `естетика 4 — ізоморфні` | ✅ |
| 4 дзеркало | `естетика 4 — дзеркало` | ✅ |
| компактність/без накладань | `компактність` | ✅ |

## Первинні джерела

- Стаття: <https://www.spectalizer.com/blog/2025-02-reingold-tilford-in-python/> (4 естетики, 3-крокова інтуїція, midpoint-формула).
- Reingold & Tilford, *Tidier Drawings of Trees*, IEEE TSE 7 (1981) 223-228.
- Walker II, *A Node-Positioning Algorithm for General Trees*, UNC TR 89-034.
- Buchheim, Jünger, Leipert, *Improving Walker's Algorithm to Run in Linear Time*, GD 2002, LNCS 2528.
- Крейт `tidy-tree` 0.1: `with_layered_tidy` / `position_root` / `first_walk` / `separate`.
- Наш виклик: `packages/core/src/ploeg_layout.rs`, `packages/core/src/org_layout.rs`.
