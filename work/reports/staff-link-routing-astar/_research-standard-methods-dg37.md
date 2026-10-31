# Дослідження: відомі методи рівної + 0-cross маршрутизації (dg37)

ДАЛІ: шукаю наукові/доко-джерела по Sugiyama framework (crossing-min через ordering, Brandes-Köpf x-coord), orthogonal edge routing + bend minimization, ELK layered+orthogonal, GoJS TreeLayout / dagre / d3-dag bus-routing. Далі — синтез під наш кейс (дерево департаментів + крос-деп мульти-джерело). Код не чіпаю.

---

## 1. Sugiyama framework (layered / hierarchical graph drawing)

Канонічний конвеєр для орієнтованих графів-«майже-дерев». Чотири фази виконуються
**послідовно й незалежно**, кожна фіксує вихід попередньої як вхід. Ключова ідея всього
підходу: **геометрію ліній не оптимізують наприкінці — її визначає ПОРЯДОК вузлів, зафіксований
ДО будь-якого розміщення координат.**

### (a) Layer assignment (ранжування)
Вузли розкладаються по дискретних шарах (ранги). Довгі ребра, що перетинають >1 шару,
**розбиваються на ланцюг dummy-вершин** (віртуальних вузлів) — по одній на кожен проміжний шар,
щоб КОЖНЕ ребро з'єднувало лише сусідні шари. Це фундамент: далі алгоритм працює тільки з
«короткими» ребрами між сусідніми рядами.
- Техніка: network-simplex ranking (Gansner et al., «A Technique for Drawing Directed Graphs»),
  або longest-path / tight-tree. Мінімізація кількості dummy-вершин = коротші й пряміші довгі ребра.

### (b) Crossing minimization — через ПОРЯДОК, не brute-force
Перетини НЕ рахуються й НЕ мінімізуються перебором геометрії. Замість цього мінімізується
кількість перетинів як функція **перестановки вузлів усередині кожного шару** (horizontal order).
- Глобальна задача NP-важка (навіть 2-layer crossing-min NP-важка), тому її РОЗБИВАЮТЬ:
  **layer-by-layer sweep** — тримаємо порядок шару L_i фіксованим, переставляємо L_{i+1} так, щоб
  мінімізувати перетини між цією парою («one-sided two-layer crossing minimization»). Прохід
  згори-вниз, тоді знизу-вгору, повторювати, поки перетини перестають зменшуватись.
- Евристики переставлення: **barycenter** (вузол ставиться у середнє X сусідів у суміжному шарі)
  та **median** (медіана позицій сусідів). Median має доведені межі якості; barycenter на практиці
  часто кращий. Підрахунок перетинів — білінійний метод Barth et al., O(|E| log|V|).
- Чому працює: перетин двох ребер між сусідніми шарами залежить ВИКЛЮЧНО від відносного порядку
  їхніх кінців у цих двох шарах. Тобто перетини — це функція перестановки, а не координат. Оптимізуй
  перестановку → перетини зникають ще до того, як призначено жодної координати.

### (c) Coordinate / x-assignment — робить лінії ПРЯМИМИ
Порядок у шарах уже фіксований (крок b). Тепер призначаються реальні X-координати з умовами:
мінімальний зазор між сусідами в шарі + **ребра якомога вертикальніші (прямі)**.
- **Brandes–Köpf «Fast and Simple Horizontal Coordinate Assignment»** — лінійний час. Ідея:
  вирівнювати вузол із **медіанним сусідом** у суміжному шарі у вертикальні «блоки», і особливо
  вирівнювати ланцюги dummy-вершин у ПРЯМУ лінію → довге ребро стає прямим вертикальним відрізком
  без зламів. Алгоритм робить 4 прогони (вгору/вниз × ліво/право) і бере медіану/усереднення — це
  балансує зміщення й дає симетрію. (Є erratum 2020: Brandes, Walter, Zink — дві вади в підпрограмі
  вирівнювання, обидві в одному місці; варто взяти виправлену версію.)
- Альтернатива: x-coord як оптимізація, розв'язана **network simplex** (Gansner) — оптимально
  мінімізує суму |відхилень| ребер від вертикалі.
- Суть: **прямизна ліній — це наслідок вирівнювання у блоки на кроці coord-assignment, а НЕ
  окремого роутингу.** dummy-ланцюг, вирівняний у вертикаль, = пряме довге ребро.

### (d) Edge routing
Після видалення dummy-вершин їхні позиції стають bend-point'ами. Ребро малюється як полілінія або
сплайн через ці точки. Якщо крок (c) вирівняв dummy у пряму — ребро вже пряме, роутинг тривіальний.
Тобто **роутинг у Sugiyama майже нічого не «вирішує» — усю роботу зробили порядок (b) і
координати (c).**

Джерела:
- Wikipedia «Layered graph drawing / Sugiyama scheme»: https://en.wikipedia.org/wiki/Layered_graph_drawing
- Eiglsperger, Siebenhaller, Kaufmann, «An Efficient Implementation of Sugiyama's Algorithm» (JGAA 2005): https://jgaa.info/index.php/jgaa/article/view/paper111
- Brandes & Köpf, «Fast and Simple Horizontal Coordinate Assignment» (LNCS 2002): https://rd.springer.com/content/pdf/10.1007/3-540-45848-4_3.pdf
- Erratum (Brandes, Walter, Zink 2020): https://arxiv.org/pdf/2008.01252
- Gansner et al. «A Technique for Drawing Directed Graphs» (основа dagre/Graphviz dot).

## 2. Orthogonal edge routing + bend minimization

Два світи: (A) ортогональна маршрутизація ПОВЕРХ уже розміщених вузлів (obstacle-avoiding), та
(B) топологічний bend-minimum (Tamassia), де shape будується разом із топологією.

### (A) Obstacle-avoiding орто-роутер (libavoid / yFiles EdgeRouter)
Прокладає Manhattan-лінії між портами, огинаючи вузли. Ключові техніки:
- **Port assignment / port candidates**: роутер зіставляє набори портів-кандидатів з обмеженнями
  на обох кінцях; вищий штраф, якщо вхід і вихід на одній стороні вузла.
- **Bend мінімізується через ВАГИ-штрафи**, не через точний оптимум: штраф за поворот, штраф за
  довжину, штраф за shared-сегменти на спільному кінці. Роутер шукає шлях мін. вартості.
- **Nudging / channel routing**: паралельні сегменти, що йдуть «пучком», розводяться по каналах
  (VPSC-модель — free/fixed сегменти, кожному призначається канал), центруються у вільному просторі.
  Це і дає чистий вигляд пучка ліній, що йдуть паралельно без накладань.

### (B) Bus / trunk routing для деревних ребер (yFiles BusRouter)
Багато ребер діляться **спільним магістральним сегментом (backbone)**; до кожного вузла — лише
короткий відвід. Усі сегменти, крім першого й останнього, лягають один на одного → один «автобус».
Для org-chart це рівно те, що робить «гребінку» зв'язків «батько → багато дітей» чистою: один
горизонтальний стовбур + вертикальні відводи, замість N окремих ліній.

### (B2) Tamassia topology-shape-metrics (bend-optimum)
Для планарних графів із фіксованим вкладенням. Три фази: planarization (топологія) →
orthogonalization (shape) → compaction (метрики/координати). **Bend-minimum зводиться до min-cost
flow** у мережі, де вузли й грані графа — вузли потоку; потік вартості k ⟺ орто-представлення з k
зламами. Без фіксованого вкладення — NP-важко (Garg & Tamassia). Compaction — теж min-cost flow,
мінімізує сумарну довжину ребер. Висновок для нас: **bend-min — це глобальна flow-оптимізація над
усіма ребрами разом, а не per-edge жадібний пошук.**

Джерела:
- yFiles BusRouter: https://docs.yworks.com/yfiles-html/api/BusRouter.html
- yFiles OrthogonalEdgeRouter: https://docs.yworks.com/yfiles/doc/api/y/layout/router/OrthogonalEdgeRouter.html
- libavoid (Adaptagrams): https://www.adaptagrams.org/documentation/namespaceAvoid.html
- Sander, «Fast Heuristic for Hierarchical Manhattan Layout»: https://link.springer.com/content/pdf/10.1007/BFb0021828.pdf
- Tamassia TSM / bend-min (GD 2019 slides): https://kam.mff.cuni.cz/gd2019/part1.pdf та KIT slides: https://algo.iti.kit.edu/_media/teaching/winter2019/graphvis/graphvis-ws19-v07.pdf

## 3. ELK (Eclipse Layout Kernel)

ELK Layered — промислова реалізація Sugiyama. Edge routing має три режими: `straight`,
`orthogonal`, `splines`. При `orthogonal` роутер поважає довільні обмеження на порти.
- Чистота + мало перетинів ELK досягає НЕ роутером, а самим Sugiyama-конвеєром: network-simplex
  layering → layer-sweep crossing-min → coordinate-assignment (варіанти, включно з Brandes–Köpf).
  Орто-роутинг лише «вирисовує» вже впорядкований результат.
- Для складного obstacle-avoiding орто-роутингу ELK окремо підключає **libavoid**
  (`org.eclipse.elk.alg.libavoid`) з опціями nudging/shared-paths (Penalise Orthogonal Shared Paths,
  Nudge Shared Paths With Common Endpoint — on by default).
- Ключові опції Layered: `elk.edgeRouting` (ORTHOGONAL), spacing (edgeSpacing, edgeNodeSpacing),
  `addUnnecessaryBendpoints`, wrapping, а також `considerModelOrder` — фіксувати порядок вузлів.

Джерела:
- ELK Layered reference: https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html
- ELK libavoid alg: https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-alg-libavoid.html

## 4. GoJS TreeLayout / dagre / d3-dag

### GoJS TreeLayout
Спеціалізований на дереві (кожен вузол ≤1 батько, без циклів) — тому ДЕШЕВШИЙ і ЧИСТІШИЙ за
загальний layered: немає crossing-min як окремої NP-фази, бо дерево планарне за побудовою, якщо
діти йдуть у порядку й не перетинаються. Параметри: `angle` (напрям росту 0/90/180/270),
`alignment` (де батько відносно дітей — AlignmentStart/Center/Bus...), `nodeSpacing`/`layerSpacing`,
`sorting` (порядок дітей). Лінки — `routing: Orthogonal`, `corner` для заокруглень.
- **Bus-alignment**: батько з'єднується з дітьми через спільний ортогональний стовбур — та сама
  bus-ідея, що й yFiles BusRouter, але вбудована в layout дерева.
- Відмінність від загального layered: TreeLayout не має фази усунення перетинів «взагалі» — порядок
  піддерев + відсутність крос-ребер гарантують 0 перетинів деревних ребер. Перетини з'являються
  лише коли додаються НЕдеревні (крос-)ребра — і саме тут org-chart інструменти переходять на
  окремий layered/роутер.

Джерело: https://gojs.net/intro/trees.html

### dagre / d3-dag
dagre повторює скелет Gansner et al.: cycle removal → network-simplex rank → layer-sweep ordering
(crossing-min, Barth counting) → **Brandes–Köpf coordinate assignment** → edge routing (тільки
bend-points зі збережених dummy-позицій). d3-dag дає вибір пресетів: greedy coords (швидко) vs
**simplex coords** (якісніше, пряміші лінії), two-layer decrossing. Тобто обидва — Sugiyama без
власного складного роутера; прямизна = coordinate-assignment.

Джерела:
- dagre pipeline (Rust-порт opис): https://docs.rs/crate/dagre/0.1.1/source/src/layout/mod.rs
- d3-dag: https://erikbrinkman.github.io/d3-dag/ (CoordSimplex: https://erikbrinkman.github.io/d3-dag/interfaces/CoordSimplex.html)

## 5. Застосування до НАШОГО кейсу + що ми робимо не так

НАШ кейс = дерево департаментів-блоків (деревні зв'язки «батько→діти») + крос-деп лінії зв'язку
(мульти-джерело, secondary). Це гібрид: планарне дерево + додаткові НЕ-деревні ребра поверх нього.

**Що ми робимо концептуально НЕ так (tree-block placement + per-edge A* + brute-force parent-eval):**

1. **Ми мінімізуємо перетини ГЕОМЕТРІЄЮ (brute-force min-cross, per-edge A*), а канон мінімізує їх
   ПОРЯДКОМ вузлів ДО роутингу.** У Sugiyama перетини — функція перестановки у шарах, і їх прибирають
   layer-sweep'ом (barycenter/median) ще до призначення координат. Ми ж залишаємо порядок як є, а
   потім героїчно обводимо ребра A*-ом — це лікування симптому. Brute-force над геометрією не має
   важеля, яким володіє ordering, тому дає «потворний» локальний оптимум.

2. **Ми робимо роутинг ПЕР-РЕБРО й жадібно, а прямизна+мало-зламів — це ГЛОБАЛЬНІ оптимізації.**
   Прямизна в каноні = coordinate-assignment (Brandes–Köpf вирівнює у вертикальні блоки, dummy-ланцюг
   у пряму). Bend-min у Tamassia = min-cost flow над УСІМА ребрами разом. Per-edge A* не бачить
   сусідніх ребер → не може ні вирівняти пучок, ні звести глобальні злами.

3. **Для деревних ребер ми не використовуємо bus/trunk.** Канонічний org-chart малює «батько→діти»
   одним спільним стовбуром + короткі відводи (GoJS Bus alignment / yFiles BusRouter). Це автоматично
   рівно й без перетинів між самими деревними ребрами. Окремі A*-лінії на кожну дитину — надлишок.

4. **Ми не розділяємо deterministic-дерево й крос-ребра.** Деревні зв'язки планарні → 0 перетинів
   безкоштовно через TreeLayout + bus. Проблема лише у крос-деп ребрах — їх треба (a) врахувати при
   ВИБОРІ ПОРЯДКУ піддерев/блоків (щоб джерело й ціль опинялися поруч), і лише (b) залишок розвести
   nudging-каналами. Brute-force parent-eval — це спроба підібрати порядок навмання; канон робить це
   цілеспрямовано barycenter/median-евристикою.

---

## СИНТЕЗ: 2-3 техніки, що найбільше стосуються нас, і як вони дають «чисто + 0-cross разом»

**Техніка 1 — Crossing-minimization через ORDERING ПЕРЕД роутингом (Sugiyama b, barycenter/median
layer-sweep).** Це головне концептуальне виправлення. Перетини — наслідок ПОРЯДКУ вузлів у рядах,
а не геометрії ліній. Спершу зафіксуй порядок блоків/посад у кожному тирі так, щоб кінці крос-деп
ребер були близько (barycenter: став вузол у середнє X його крос-сусідів; sweep згори-вниз і назад
до стабілізації). Тоді 0/мало перетинів досягається СТРУКТУРНО, а не перебором. Це прибирає потребу
в brute-force min-cross.

**Техніка 2 — Coordinate-assignment для прямизни (Brandes–Köpf / simplex x-coord).** Коли порядок
фіксовано, призначай X так, щоб ребра були максимально вертикальні: вирівнюй вузли (і ланцюги
dummy-вершин довгих крос-ребер) у вертикальні блоки навколо медіанного сусіда. Прямі лінії —
БЕЗКОШТОВНИЙ наслідок цього кроку, а не окремого A*. Довге крос-деп ребро → ланцюг dummy між тирами
→ вирівняний у пряму вертикаль.

**Техніка 3 — Bus/trunk routing для деревних ребер + nudging для залишку крос-ребер.** Деревні
зв'язки «батько→діти» малюй одним спільним ортогональним стовбуром + короткі відводи (GoJS Bus /
yFiles BusRouter) — це дає рівну «гребінку» з нульовими взаємними перетинами безкоштовно. Крос-деп
ребра, що лишилися після правильного ordering, розводь каналами/nudging (libavoid), а не окремими
жадібними A*-шляхами — nudging центрує паралельні пучки й не плодить зламів.

**Правильний конвеєр для нас (заміна «placement + per-edge A* + brute-parent»):**
1. Layer/tier assignment блоків і посад (вже майже є — дерево).
2. **Ordering**: barycenter/median sweep над порядком піддерев/блоків, вагований крос-деп ребрами
   (включно з мульти-джерелом: вузол тягнеться до середнього своїх кількох джерел). ← прибирає перетини.
3. Dummy-ланцюги для довгих крос-деп ребер (через тири, що вони перетинають).
4. **Coordinate-assignment** (Brandes–Köpf-стиль або локальний simplex): вертикальне вирівнювання
   блоків і dummy → прямі лінії. ← прибирає зигзаги/злами.
5. Deterministic bus-routing деревних ребер; nudging-канали для крос-деп залишку. ← чистий вигляд.

Головний здвиг мислення: **«чисто + 0-cross» — це НЕ дві окремі метрики, які балансує роутер; це
один наслідок правильного ПОРЯДКУ (крок 2) + правильних КООРДИНАТ (крок 4). Роутер (крок 5) лише
вирисовує вже-чистий результат.** Наша помилка — перекласти обидві цілі на геометричний пошук
(brute-cross + per-edge A*), який за побудовою не має важелів ordering та глобального coord/flow.

ГОТОВО: дослідження завершене, усі 5 пунктів + синтез записані.
