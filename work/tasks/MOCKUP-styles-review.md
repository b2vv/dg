# Mockup style & display rules (draft for review)

**Branch:** `cursor/gojs-migration-tasks-babc`  
**Demo tabs:** Orgs · Figma / Orgs · GoJS / Staff · Figma / Staff · GoJS  
**Data:** civilian corporate names only (GH Pages safe)

Confirm or correct each section. Tokens use hex for readability (`0x2a323c` → `#2a323c`).

---

## 1. Orgs · Figma

**Theme:** dark (forced)  
**Styles object:** `MOCKUP_FIGMA_STYLES.organization`  
**Layout:** tall cards `200×120`, gap H36 / V48, edges `spine-bus`  
**Chrome flag:** `orgSiblingGroupChrome: true` (blue dashed AABB around ≥2 siblings)

### Card tokens
| Token | Value |
|---|---|
| background | `#2a323c` |
| border | `#3d4a5c` / 1px / radius 8 |
| name | `#f1f5f9` / 13px |
| group caption | `#94a3b8` / 11px |
| symbol size | 56 |
| counts badge bg/text | `#1e293b` / `#e2e8f0` |
| temp badge | `#f59e0b` / white |

### What must appear
| Element | Rule |
|---|---|
| Brand mark | SVG letter tile on every org |
| Short name | under / beside symbol (`showShortName` on root) |
| Counts | `filledCount` + `vacantCount` as `N [M]` badge when present |
| Sibling frame | dashed blue frame around the five peer divisions only |
| Tree | Cedar Lake Group → Northwind Region → 5 divisions |
| Period / unit code / T | **off** on this mockup (Figma screen did not emphasize them) |

---

## 2. Orgs · GoJS

**Theme:** light (forced)  
**Styles object:** `MOCKUP_GOJS_STYLES.organization`  
**Layout:** compact cards `200×64`, gap H40 / V44, edges `spine-bus`  
**Chrome flag:** `orgSiblingGroupChrome: false`

### Card tokens
| Token | Value |
|---|---|
| background | `#ffffff` |
| border | `#cbd5e1` / 1.5px / radius 10 |
| name | `#0f172a` / 13px |
| symbol size | 36 |
| period line | `#15803d` |
| meta / unit code | `#64748b` |
| counts badge | `#f1f5f9` / `#334155` |
| temp T badge | `#f59e0b` / white |

### What must appear
| Element | Rule |
|---|---|
| Brand mark | smaller symbol (36) |
| Period line | on HQ + EMEA (`з … по т.ч.` / range) |
| Unit code | on EMEA (`EU-12`) |
| Temp badge | on Lisbon Hub (`isTemporary`) |
| Counts | on all orgs in fixture |
| Sibling dashed frame | **never** |
| Tree | Brightside Holdings → EMEA Operations → 5 hubs |

---

## 3. Staff · Figma

**Theme:** dark (forced)  
**Styles:** `MOCKUP_FIGMA_STYLES.person` + `staffZone` + `departmentCard`  
**Seat size:** landscape `248×72` (row layout: photo left, text right)  
**Render:** `staffZoneChrome: true`, `departmentStyle: 'card'`

### Person tokens
| Token | Value |
|---|---|
| card bg/border | `#2a323c` / `#3d4a5c` / radius 8 |
| permanent name | `#f1f5f9` |
| temporary name | `#f97316` |
| title | `#f1f5f9` / 12px |
| period chip | bg `#14532d` / text `#86efac` |
| vacant label | `#94a3b8` |

### Zone / dept tokens
| Token | Value |
|---|---|
| zone fill | `#1a222d` @ 0.55 |
| zone stroke | `#3b82f6` **dashed** |
| zone label | right-aligned `#e2e8f0` |
| dept card | fill `#1e3a5f`, stroke `#334155` |

### What must appear
| Element | Rule |
|---|---|
| Row seat | width ≥ 1.4× height → landscape chrome |
| Photo / avatar | left; initials if missing |
| Name color | orange iff `isTemporary` |
| Period chip | when `periodStart` / `periodEnd` set |
| Vacant seat | no person; vacant label |
| Zones | dashed blue named bands per staff block |
| Dept cards | card chrome around department clusters |
| Edges | solid admin; dotted cross-org (deputy → unit manager) |
| Topology | Lumen Holdings → Pacific Region (focus) → Current Business Unit |

---

## 4. Staff · GoJS

**Theme:** light (forced)  
**Styles:** `MOCKUP_GOJS_STYLES.person` + `staffZone` + `departmentCard`  
**Seat size:** portrait `136×156`  
**Render:** `staffZoneChrome: true`, `departmentStyle: 'blob'`, magnet contour (Variant B–like)

### Person tokens
| Token | Value |
|---|---|
| card bg/border | `#ffffff` / `#cbd5e1` / 1.5 / radius 10 |
| permanent name | `#0f172a` |
| temporary name | `#ea580c` |
| title | `#475569` |
| period chip | bg `#dcfce7` / text `#15803d` |
| vacant | `#64748b` |

### Zone / contour tokens
| Token | Value |
|---|---|
| zone fill | `#f8fafc` @ 0.85 |
| zone stroke | `#94a3b8` **solid** |
| zone label | left-aligned `#334155` |
| dept | **blob** wash (not card); padding/smooth sliders enabled |

### What must appear
| Element | Rule |
|---|---|
| Portrait seat | photo/initials top, name + title below |
| Temp name | orange when `isTemporary` |
| Period chip | green chip on acting window |
| Zones | solid (not dashed) |
| Dept grouping | magnetic blob contour (min 2 members) |
| Same people/topology as Staff · Figma | only chrome/layout differs |

---

## Cross-cutting rules (all four)

1. **No military / tactical naming** in labels, titles, or symbols.  
2. Mockup tabs **pin theme** (Figma→dark, GoJS→light); user theme toggle still reloads but tab re-entry re-pins.  
3. Symbol URLs are inline SVG data-URIs (letter tiles) or demo PNG — no external mil assets.  
4. Style correction loop: change tokens in `MOCKUP_FIGMA_STYLES` / `MOCKUP_GOJS_STYLES` or the display rules above, then re-check the matching tab.

---

## Checklist for you

Reply with corrections like:

- `[Orgs·Figma] sibling stroke → #60a5fa, pad 20`
- `[Staff·GoJS] departmentStyle → card (not blob)`
- `[Orgs·GoJS] hide counts on hubs`
- `OK as drafted`
