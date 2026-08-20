# T24 — Layout diagnostics API

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** staff hybrid/matrix layout ✅

---

## Goal

Surface soft layout warnings (anchor overlap, skipped expands, …) that layout already computes but hosts could not read.

---

## TDD

### Success
- [x] Overlapping matrix anchors → `getLayoutDiagnostics()` includes `Anchor overlap: …`
- [x] `onLayoutDiagnostics` fires after render with the same messages
- [x] Clean layout → empty diagnostics

### Failure
- [x] (covered) empty list when no overlaps / no staff canvas path issues

---

## API

```ts
diagram.getLayoutDiagnostics(): readonly string[]

callbacks: {
  onLayoutDiagnostics?(messages: readonly string[]): void;
}
```

## Also in this task

- Sync stale SPEC §8 / REQUIREMENTS phase checklists to current v1 reality

## Out of scope

- Auto-resolve overlapping anchors
- TD07 promote overlay
