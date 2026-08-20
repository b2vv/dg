# T28 — Dark theme actually paints Pixi

**Пріоритет:** P1  
**Статус:** done  

## Problem

Theme toggle only flipped CSS `data-theme`; Pixi always used `defaultNodeTheme` (light) and canvas `0xf8fafc`.

## Fix

- `darkNodeTheme` + `resolveNodeTheme(light|dark)`
- `canvasBackgroundForTheme` → `PixiHost.setBackground`
- Theme-aware staff/org edge strokes
- Promote card uses CSS variables
