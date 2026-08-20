# T07 — Contour algorithm gaps: M4, magnetRadius, G6 explicit

**Пріоритет:** P2  
**Статус:** todo  
**Оцінка складності:** середня  
**Залежності:** contour.rs ✅, TD03

---

## Мета

Закрити розрив між **специфікацією magnetism** (REQUIREMENTS §4.6.1) та **поточною impl** у `packages/core/src/contour.rs`.

---

## Gaps

### Gap 1 — M4: disconnected own components

**Spec:** якщо own cells не 4-connected (відстань > magnet radius) → **кілька контурів** одного dept.

**Impl:** один flood-fill → один contour на dept.

**Example:**

```
IT positions:
  P1 (0,0)  P2 (5,0)   ← дві групи, gap 3 cells
```

Expected: 2 `DeptContourResult` з одним `departmentId` або `components: ContourComponent[]`

**Algorithm:**

```
1. own cells → union-find / BFS with max distance magnetRadius
2. components = connected clusters
3. for each component: flood + perimeter + smooth
4. return Vec<DeptContourResult> or single result with multiple paths
```

### Gap 2 — G1 magnetRadius

**Spec:** `magnetRadius` (default 1.5 grid units) обмежує злиття own cells.

**Impl:** всі own seeds одразу в одному flood — необмежене злиття через empty cells.

**Fix:** перед flood — cluster own cells де Manhattan distance ≤ magnetRadius; окремий contour per cluster.

### Gap 3 — G6 explicit far-side wall removal

**Spec:** не малювати борт з боку foreign, де немає own cells за foreign.

**Impl:** G6 досягається **implicit** — foreign блокує flood, perimeter не проходить через foreign. Але edge cases можливі при складних notch.

**Fix (optional post-pass):**

```
for each perimeter segment S adjacent to foreign cell F:
  if no own cell exists beyond F in outward normal direction:
    mark S for removal (G6)
re-chain remaining segments
```

### Gap 4 — Config unification (TD03)

Align Rust `ContourMagnetConfig`:

```rust
pub struct ContourMagnetConfig {
    pub magnet_radius: f32,      // NEW default 1.5
    pub padding_cells: i32,
    pub corridor_cells: i32,
    pub cell_width: f32,
    pub cell_height: f32,
    pub smooth_iterations: u32,
    pub prefer_notch: bool,      // optional, default true
}
```

SDK bridge оновити відповідно.

---

## Tests to add

| Test | Assert |
|------|--------|
| `disconnected_own_two_contours` | 2 paths for same dept |
| `magnet_radius_limits_merge` | cells at distance 3 not merged when radius=1.5 |
| `g6_no_wall_variant_b` | explicit: no segment at x=right(CEO) |
| `config_defaults_match_spec` | serde defaults documented |

---

## API impact

**Breaking (minor):**

```ts
interface DeptContourResult {
  departmentId: string;
  components?: Array<{  // NEW if multiple
    points: ContourPoint[];
    path: string;
    cornerCount: number;
  }>;
  // OR keep flat and return multiple results from computeAllContours
}
```

Рекомендація: `computeDeptContour` returns `DeptContourResult[]` (one per component) — breaking change, bump minor version.

---

## Acceptance criteria

- [ ] M4 test passes — 2 contours for disconnected own
- [ ] magnetRadius respected in clustering
- [ ] G6 post-pass або documented proof that implicit suffices
- [ ] TD03 closed — single config schema docs + TS + Rust
- [ ] Existing variant A/B tests still pass
- [ ] `npm run build:wasm` + committed pkg updated

---

## Референси

- `packages/core/src/contour.rs`
- `work/tech-debt/TD03-contour-config-drift.md`
- `docs/REQUIREMENTS.md` §4.6.1 D, E, F
