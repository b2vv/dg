# T36 — Card & chrome polish (T33 C*)

**Пріоритет:** P2  
**Статус:** done  
**План:** [T33](./T33-demo-live-audit-plan.md) C1–C8

## Delivered

### Cards
- Initials on avatar circle when no real photo; 1×1 placeholder PNGs ignored
- Per-name stable avatar disc colors (muted palette, not one slate for all)
- Soft card shadow on person / org near+mid cards
- Darker title / group colors (WCAG-friendlier)
- Person/org hover ring; thicker borders & staff edges
- Org card text vertically centered
- Variant B names without redundant «IT» / «CEO» suffixes; no fake photoUrl
- Staff demo: no 1×1 avatar URLs

### Demo chrome
- Variant B caption (tiers + orange T = temporary)
- Initial Fit without animation (correct zoom immediately)
- Slightly clearer UI font stack
- Dark theme `--muted` lightened for caption/status contrast

## Tests
- `personInitials.test.ts`
- PersonNode initials assertion
- theme titleColor

## Verify

```bash
npm test && npm run typecheck
```
