# T27 — Fix Pages CSS path / mobile black canvas

**Пріоритет:** P0  
**Статус:** done  
**Залежності:** T25 Pages

## Problem

On https://b2vv.github.io/dg/ the HTML linked `/styles.css` (site root) → **404**.  
Without CSS the mount had ~0 height; Pixi `resizeTo` collapsed the canvas. PDF still worked (off-screen buffer). Phones showed a black empty layout.

## Fix

- Relative `styles.css` (works under `/dg/`)
- Grid/`100dvh` stage so mount fills remaining viewport on wrapped mobile toolbars
- Drop Pixi `resizeTo`; ResizeObserver with min 320×240
