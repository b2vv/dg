# T78 — Critique remediation після T77 (`CRITIQUE-dg_9352d52`)

**Пріоритет:** P0 → P2  
**Статус:** 🟡 P0 done · P1 open  
**Базис:** `dg@9352d52` (`main` після #59/#60/#61)  
**Джерело:** [CRITIQUE-dg_9352d52.md](../tech-debt/CRITIQUE-dg_9352d52.md)

Чотири незалежні огляди після T77: Option B не дочищена, нові P0 в layout/export, тести що охороняють мертвий Rust contour.

## Мікрозадачі

| ID | Що | P | Статус |
|----|-----|---|--------|
| **C2** | Grid/flat `paintContours` з `contourMemberBoxesByDept` (як staff) | P0 | ✅ |
| **L1** | Drag origin per staff tier, не перший `gridCell` | P0 | ✅ |
| **L2** | Hybrid floating siblings не в одній точці; eject між floaters | P0 | ✅ |
| **L3** | Row-tree ліс: усі expanded roots (T65), не `findExpandedRootId`×1 | P0 | ✅ |
| **L4** | `export()` org id = `inferStaffCurrentOrgId` / той самий, що canvas; переписати `export.test.ts:254` | P0 | ✅ |
| **C3** | SVG grid-гілка = `paintMagneticGroups`, не Rust flood | P0 | ✅ |
| **L9** | PNG без Pixi → `ExportError` (як PDF), не `fillRect` | P0 | ✅ |
| **T3** | Variant B тести на живий paint (`paintMagneticGroups` / boxes), не `computeAllContours` | P0 | ✅ |
| **T4** | `magnetRadius` NaN/Inf reject (як layout metrics); JS і Rust однаково | P0 | ✅ |
| **C1** | Видалити мертвий `computeContours` wiring **або** знову wire | P1 | 📋 |
| **L5** | Vacant position: select по `positionId` | P1 | 📋 |
| **L6** | Drag preview оновлює member AABB | P1 | 📋 |
| **L7** | `placeOrgAtMatrixCell`: floor eject, no-op без `onLayoutChange`, не писати `inMatrix ?? false` на default member | P1 | 📋 |
| **L8** | Canvas blob не union-AABB через notch (або свідомо задокументувати відхід від G5–G7) | P1 | 📋 |
| **T1** | `e2e/node-compare` — хоча б один `expect` (не лише screenshot) | P1 | 📋 |
| **T2** | `expandIdsForDepth` cycle: contents, не `Array.isArray` | P1 | 📋 |

## Acceptance

- [x] P0 C2/L1/L2/L3/L4/C3/L9 зелені (unit + failure).
- [x] T3/T4: Variant B і magnet тести падають на зіпсованому paint, не на мертвому WASM.
- [ ] T1/T2 тести здатні падати.
- [x] Scorecard у [CRITIQUE-dg_9352d52.md](../tech-debt/CRITIQUE-dg_9352d52.md) оновлено.
