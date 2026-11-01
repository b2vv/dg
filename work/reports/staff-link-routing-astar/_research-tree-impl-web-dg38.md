# dg38 — Дослідження в інтернеті: як published-бібліотеки роблять layout + edge-routing деревних/ієрархічних діаграм

claude-opus-4-8 · 2026-10-31

Мета: заземлити «routing-слайс» (детерміновані рівні лінії ієрархії + A* лише для крос-ребер) у РЕАЛЬНИХ реалізаціях published-бібліотек, не в переказі з памʼяті. Кожен факт — з URL. no-verbatim: метод своїми словами, без цитування чужого коду.

ДАЛІ: Тема 1 — Reingold–Tilford / Walker tidy-tree (d3-hierarchy d3.tree): як рахують позиції, contour threading, коли НЕ підходить (DAG/крос-ребра). Шукаю першоджерела: Walker 1990, Buchheim et al. 2002 (linear-time), d3-hierarchy docs/README.

---

## ТЕМА 1 — Tidy-tree (Reingold–Tilford / Walker / d3.tree)

ФАКТ: Reingold–Tilford (1981 «Tidier drawings of trees») — базовий метод layered-малюнка дерева: вузли однакової глибини вирівняні по одній осі (рівень). Walker (1990) розширив на дерева довільного степеня (unbounded degree). Buchheim, Jünger, Leipert (GD 2002, LNCS 2528) показали, що форма Walker у поданому вигляді квадратична, і дали ревізію, що дає ТІ САМІ layout-и за лінійний час. Van der Ploeg (2013/14) — перший лінійний алгоритм для NON-layered tidy-tree (діти на фіксованій відстані від батька), модифікація RT.
МЕТОД (своїми словами): кожне піддерево рахується знизу-вгору; підтримується лівий/правий «контур» (contour) піддерева — ланцюг крайніх вузлів на кожному рівні. При зливанні сусідніх піддерев контури «пробігаються» паралельно й зсув визначається так, щоб мінімальний горизонтальний зазор дотримувався; threading — прийом, коли контур одного піддерева не збігається глибиною з сусіднім, і «нитки» (threads) звʼязують крайні вузли, щоб контур обходився за лінійний час без повного спуску. Зсуви накопичуються як modifier/prelim і застосовуються одним проходом зверху-вниз.
КОЛИ НЕ ПІДХОДИТЬ: чистий tidy-tree вимагає СПРАВЖНЬОГО дерева (один батько). DAG / мульти-батьки / крос-ребра поза моделлю — RT/Walker не вміють ані кількох джерел, ані ребер що йдуть не вниз-по-рівнях. Для цього потрібен layered (Sugiyama), див. тему 2.
ДЖЕРЕЛА:
- Buchheim/Jünger/Leipert «Improving Walker's Algorithm to Run in Linear Time» — https://link.springer.com/doi/10.1007/3-540-36151-0_32
- (Ploeg non-layered linear time) згадано core.ac.uk — https://core.ac.uk/download/301654972.pdf
- d3.layout.tree спирається на Buchheim et al. (HN, непервинне) — https://news.ycombinator.com/item?id=10366299

## ТЕМА 2 — Layered (Sugiyama): dagre / ELK / Graphviz dot
ФАКТ: ELK розбиває Sugiyama на 5 фаз: (1) cycle breaking, (2) layer assignment, (3) crossing minimization, (4) node placement (coord-assignment), (5) edge routing — з intermediate-processing слотами між фазами.
ФАКТ (ordering): ELK дефолт crossing-min = LAYER_SWEEP (barycenter heuristic Сугіями), плюс Forster constraint-resolving поверх барицентра.
ФАКТ (coordinate-assignment → прямі лінії): ELK дефолт node placement = Brandes–Köpf «Fast and simple horizontal coordinate assignment» (GD 2001). Орієнтує вузли top-left, можна балансувати. Саме BK дає переважно ПРЯМІ вертикальні пробіги ребер.
МЕТОД (BK, своїми словами): довгі ребра розбиваються на dummy-вузли на кожному проміжному рівні, тож ребро стає ланцюгом вузлів. BK шукає вертикальні «вирівнювання» (alignments): кожен вузол тяжіє вирівнятися з медіанним сусідом у суміжному рівні; conflicting-вирівнювання (що перетнули б ребро) відкидаються. Будуються 4 набори координат (left/right × top/bottom-biased), потім медіануються/балансуються. Результат — ланцюги dummy-вузлів лежать на одній вертикалі → довге ребро стає прямою вертикаллю між своїми кінцями.
ФАКТ: dagre (JS) має той самий конвеєр: network-simplex layering → crossing-min → Brandes–Köpf coordinate assignment (підтверджено через vendored dart_dagre у пакеті elk-dart).
ДЖЕРЕЛА:
- ELK layered overview — https://eclipse.dev/elk/blog/posts/2025/25-08-21-layered.html
- ELK «explain the layered algorithm» — https://forums.basehub.com/eclipse-elk/elk/1
- Eiglsperger/Siebenhaller/Kaufmann efficient Sugiyama — https://www.academia.edu/90278027/An_Efficient_Implementation_of_Sugiyamas_Algorithm_for_Layered_Graph_Drawing
- rust-sugiyama (barycenter/median + BK) — https://www.lib.rs/crates/rust-sugiyama

ДАЛІ: фетчу ELK layered overview (первинне) для точних фаз + edge routing (orthogonal/bus), і шукаю dagre internals + ELK edge routing (OrthogonalEdgeRouter, hyperedge/bus).

## ТЕМА 4 — Edge routing (ГОЛОВНЕ): прямі ієрархічні + окрема маршрутизація крос
ФАКТ (ELK фаза 5): edge routing визначає x-координати вузлів І маршрути ребер; підтримує polyline / orthogonal / spline. x може зсуватися під час routing бо вертикальні сегменти ребер штовхають вузли. NETWORK_SIMPLEX node-flexibility може динамічно збільшувати висоту вузла, щоб ВИПРЯМИТИ ребра.
ФАКТ (ortho = backbone/bus, ПРЯМИЙ ПРЕЦЕДЕНТ нашого «спільна шина»): orthogonal routing у layered-графах малює лише H/V сегменти; ребро = 1 горизонтальний або 3 сегменти. Для ГІПЕРребра: спершу створюється ВЕРТИКАЛЬНИЙ backbone-сегмент, потім горизонтальні сегменти між рядами підключаються до backbone за потреби. Це рівно модель «спільна шина/trunk»: один стовбур + відводи. (Kiel thesis; layered hypergraphs macau).
ФАКТ: ELK трактує кілька ребер, що ділять ті самі порти, як ОДНЕ гіперребро (multi-source/target) → спільний маршрут; junctionPoints маркують розгалуження. Це і є механізм «ребра одного керівника на спільній шині».
ФАКТ (libavoid/Adaptagrams — окремий obstacle-avoiding роутер): libavoid — C++ бібліотека швидкого object-avoiding orthogonal+polyline connector routing для ІНТЕРАКТИВНИХ редакторів; опції вмикають hyperedges from common source та improve-hyperedge-routes. ELK має alg-libavoid backend.
ФАКТ (прецедент поділу «мало редакторів автоматизують ortho-hyperedge»): Wybrow/Marriott/Stuckey (Diagrams 2012) — 3 алгоритми orthogonal hyperedge routing; зазначають, що майже жоден редактор не автоматизує ortho-hyperedge connectors.
ДЖЕРЕЛА:
- ELK layered overview (фази, node-flex straighten) — https://eclipse.dev/elk/blog/posts/2025/25-08-21-layered.html
- ELK junctionPoints — https://eclipse.dev/elk/reference/options/org-eclipse-elk-junctionPoints.html
- ELK libavoid backend — https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-alg-libavoid.html
- Kiel thesis ortho routing (1/3 segм.) — https://rtsys.informatik.uni-kiel.de/~biblio/downloads/theses/thw-bt.pdf
- Layered hypergraphs backbone — https://macau.uni-kiel.de/receive/macau_mods_00001789
- Orthogonal hyperedge routing (Wybrow 2012) — https://findanexpert.unimelb.edu.au/scholarlywork/345909-orthogonal-hyperedge-routing
- ELK-dev hyperedge segments — https://www.eclipse.org/lists/elk-dev/msg00002.html

ДАЛІ: libavoid nudging/obstacle-avoid internals (як уникає ВЖЕ-прокладених ребер — ключ до нашого reserve-first + A*), GoJS TreeLayout/LayeredDigraphLayout routing, тема 3 (multi-parent barycenter placement).

## ТЕМА 4 (ч.2) — libavoid internals + GoJS TreeLayout/LayeredDigraph
ФАКТ (libavoid = ГЛОБАЛЬНИЙ, не per-edge): Wybrow (maintainer) — libavoid маршрутизує конектори по ЄДИНОМУ visibility graph, зібраному з ВСІХ перешкод діаграми. Повільно O(n² log n) при багатьох перешкодах. Тобто A*-пошук іде по спільному visibility-графу, а не по приватній сітці кожного ребра.
ФАКТ (nudging = constraint-solve, не per-edge euristic): кожен сегмент дістає channel перед nudging; сам nudging розвʼязується як CONSTRAINT problem із separation-constraints. Shared paths зі спільним endpoint за замовч. розсуваються (nudge), опційно можна лишити повний overlap. Penalise-shared-paths — окрема опція (off by default), штрафує/перемаршрутизовує ortho shared-paths, що завершуються у спільній junction/pin.
ВИСНОВОК: «дорослий» obstacle-avoider НЕ робить незалежний A* на ребро — він тримає ГЛОБАЛЬНИЙ граф видимості + глобальний constraint-solve на розсування. Це контраст до per-edge A*.
ФАКТ (GoJS, ПРЯМИЙ ПРЕЦЕДЕНТ поділу tree-links vs non-tree): TreeLayout НЕ маршрутизує не-tree links (крос-ребра) взагалі. Прямі parent→child: кастомний роутер випрямляє ВЕРТИКАЛЬНІ сегменти tree-links на фіксованому offset від дитини, пропускає горизонтальні; лише для orthogonal links. Для оверлапів many-ortho/AvoidsNodes — окреме розширення AvoidsLinksRouter розсуває паралельні сегменти. AvoidsNodes = найненадійніший варіант під цими layout-ами; звичайний фікс = кастомний роутер / AvoidsLinksRouter.
ВИСНОВОК: GoJS явно РОЗДІЛЯЄ: детерміновані tree-links (прямі елбоу, фікс-offset) ↔ окрема маршрутизація не-tree/крос-ребер. Це рівно наш поділ det-елбоу / A*-крос. Прецедент підтверджено.
ДЖЕРЕЛА:
- Adaptagrams Avoid namespace — https://www.adaptagrams.org/documentation/namespaceAvoid.html
- libavoid single visibility graph O(n²logn) (Wybrow, Inkscape list) — https://lists.inkscape.org/hyperkitty/list/inkscape-devel@lists.inkscape.org/message/VZBAC6P2KNC6N5F74CC6CCVWRZD4UXEF
- ELK nudgeSharedPathsWithCommonEndPoint — https://eclipse.dev/elk/reference/options/org-eclipse-elk-alg-libavoid-nudgeSharedPathsWithCommonEndPoint.html
- Adaptagrams nudging як constraint (issue 67) — https://github.hscsec.cn/mjwybrow/adaptagrams/issues/67
- GoJS routers (кастомний straighten tree-links) — https://gojs.net/intro/routers.html
- GoJS TreeLayout non-tree links / AvoidsNodes — https://forum.nwoods.com/t/gojs-avoid-overlapping-of-links-in-tree-layout/9878

ДАЛІ: GoJS routers.html первинне (деталі straighten); тема 3 multi-parent barycenter/median placement; тема 5 Tamassia TSM / network-simplex bend-min (per-edge A* → зигзаги).

## ТЕМА 3 — Мульти-батьківські вузли (ключ до ana/sec)
ФАКТ (barycenter): у Sugiyama позиція вузла = СЕРЕДНЄ позицій сусідів у суміжному рівні; ties — довільно. Може бути Ω(√n) гірше оптимуму на патологіях.
ФАКТ (median, краща гарантія): вузол бере МЕДІАННУ позицію сусідів; med(G) ≤ 3·opt, час O(|E|). Для k сусідів береться v⌈k/2⌉; без сусідів → 0.
ФАКТ (вузол з БАТЬКАМИ й дітьми одночасно): Telerik Sugiyama balance-criterion — батька ставлять у barycenter його ДІТЕЙ. Confluent-layered: центр дерева = середня x його листків, конфлікти розвʼязуються розміщенням центрів у sorted-порядку.
ВИСНОВОК для ana/sec (вузол з кількома джерелами): «дорослий» підхід — median/barycenter позицій УСІХ інцидентних (батьків+дітей) сусідів, а не привʼязка до «першого-оголошеного» джерела. Median дешевший за barycenter на викиди і має доведену 3-apx межу.
⚠️ СУПЕРЕЧИТЬ dg37-висновку (88827ea: «head мульті-деп = перший-оголошений root»): first-declared — це ties-broken-arbitrarily окремий випадок, не median. Для cross=1 це могло спрацювати, але median/barycenter — канонічне правило. Треба звірити: чи first-declared у mock3 ВИПАДКОВО збігся з median, чи це справжнє правило. Якщо з'являться >2 джерел — first-declared дасть зсув, median — ні.
ДЖЕРЕЛА:
- KIT graphvis барицентр/медіана + межі — https://algo.iti.kit.edu/_media/teaching/winter2019/graphvis/graphvis-ws19-v11.pdf
- Telerik Sugiyama balance (parent at barycenter of children) — https://docs.telerik.com/devtools/wpf/api/telerik.windows.diagrams.core.sugiyamalayout
- Confluent layered (tree center = avg x листків) — https://arxiv.org/pdf/cs/0507051

## ТЕМА 5 — Orthogonal bend-minimization: глобальний vs per-edge
ФАКТ (Tamassia TSM): topology-shape-metrics — для ФІКСОВАНОГО embedding bend-minimal ortho-малюнок рахується за поліном як MIN-COST FLOW по структурі ГРАНЕЙ: вузли→грані (к-сть π/2 на грань), грань→сусідню грань (к-сть вигинів у бік сусіда). Теорема: валідна ortho-репрезентація з k вигинами ⟺ потік вартості k. Саме розвʼязання потоку по ВСІЙ структурі граней робить оптимізацію ГЛОБАЛЬНОЮ, не per-edge.
ФАКТ: без фіксованого embedding bend-min = NP-hard (Garg–Tamassia 2001); Mutzel–Weiskircher — через MILP.
ВИСНОВОК (чому per-edge A* дає зигзаги — РОЗСУД, не пряма цитата): Tamassia мінімізує вигини глобально по бюджету всіх граней; libavoid теж тримає ГЛОБАЛЬНИЙ visibility-граф + nudging як глобальний constraint-solve (тема 4.ч2). Per-edge A* оптимізує кожне ребро ІЗОЛЬОВАНО проти перешкод — не має поняття спільного bend-бюджету ані узгодженості сусідніх ребер, тож кожне ребро шукає локальний мінімум обходу й «смикається» (зигзаг) там, де глобальний солвер зсунув би сегмент/вузол. Це узгоджується з тим, що ОБИДВІ дорослі системи (TSM, libavoid) уникають per-edge-незалежності.
ДЖЕРЕЛА:
- KIT graphvis ortho/TSM min-cost-flow — https://algo.iti.kit.edu/_media/teaching/winter2019/graphvis/graphvis-ws19-v07.pdf
- TSM framework (ortho-radial), Tamassia огляд — https://arxiv.org/pdf/1703.06040

## РЕКОМЕНДАЦІЇ для нашого routing-слайсу (det/ast + bus)
1. **Поділ det-елбоу ↔ A*-крос — ПІДТВЕРДЖЕНО як «дорослий» патерн.** GoJS буквально так і робить: TreeLayout не маршрутизує не-tree links, прямі tree-links випрямляються кастомним роутером на фікс-offset; крос/оверлап — окремий AvoidsLinksRouter. Наш det/ast поділ — не винахід, а галузевий стандарт. ЗАСТОСУВАТИ впевнено.
2. **Спільна шина = backbone/trunk — ПІДТВЕРДЖЕНО.** ELK ortho-hyperedge робить саме «вертикальний backbone + горизонтальні відводи», трактуючи ребра зі спільним портом як одне гіперребро. Наш bus_y PER-MANAGER (один стовбур на керівника) = канон. ЗАСТОСУВАТИ. Риск: ми рахуємо bus_y per-edge (staff_router.rs:928-935) — це відхилення від backbone-моделі, треба на per-manager (як у design D2).
3. **Reserve-first для детермінованих — OK, але усвідомити межу.** Дорослі obstacle-avoider (libavoid) НЕ роблять незалежний A* на ребро: вони тримають ГЛОБАЛЬНИЙ visibility-граф + nudging як ГЛОБАЛЬНИЙ constraint-solve. Наш reserve-first (det займає, A* обходить occ) — дешева локальна апроксимація глобального узгодження. Прийнятно для малих графів, але це НЕ те саме, що робить libavoid; при зростанні крос-ребер наш per-edge A* ризикує зигзагами, яких глобальний солвер не дав би.
4. **Мульти-батьки: перейти на median/barycenter, перевірити first-declared.** ⚠️ СУПЕРЕЧНІСТЬ з dg37 (перший-оголошений root). Канон = median позицій усіх інцидентних сусідів (3-apx, O(E)). Перевірити чи first-declared у mock3 збігся з median випадково; для >2 джерел ana/sec first-declared дасть косу лінію, median — ні. РЕКОМЕНДАЦІЯ: закласти median як правило, first-declared лишити лише як tie-break.
5. **НЕ будувати глобальний bend-мінімізатор — YAGNI, але знати стелю.** Tamassia TSM (min-cost-flow по гранях) — глобальний оптимум вигинів, але це важка машинерія (NP-hard без фікс-embedding). Для нашого масштабу per-edge A* проти occupancy — прагматичний компроміс. Де ризикуємо винайти гірше: якщо нарощувати A*-евристики на зигзаг per-edge, впремося в межу, яку галузь давно вирішила ГЛОБАЛЬНО (flow/constraint). Краще вкладатися в ПОРЯДОК вузлів + координати (щоб крос-ребер було мало й короткі), ніж у розумніший per-edge роутер — що й підтверджує dg37-канон «чисто+0 перетинів = наслідок ПОРЯДКУ+КООРДИНАТ, не геом-пошуку».

## ЗВІРКА з dg37-канонами
- dg37 «чисто+0 = наслідок ПОРЯДКУ+КООРДИНАТ, не геом-пошуку» → ПІДТВЕРДЖЕНО галуззю (BK coord-assignment + crossing-min ordering роблять лінії прямими ДО будь-якого роутингу; TSM/libavoid глобальні). Рек.5.
- dg37 «мокап = det елбоу на спільній шині (резерв першими) + A* лише крос» → ПІДТВЕРДЖЕНО (GoJS tree vs non-tree; ELK backbone-hyperedge). Рек.1,2.
- dg37 «head мульті-деп = перший-оголошений root» → ⚠️ ЧАСТКОВО СУПЕРЕЧИТЬ: канон = median/barycenter, не first-declared. Рек.4.
