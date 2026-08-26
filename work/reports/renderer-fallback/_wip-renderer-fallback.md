# WIP — фолбек рендеру на Canvas2D без GPU

⚠️ Obsidian MCP недоступний у цій сесії → жива нота веде́ться в репо (fallback за `CLAUDE.local.md` п.2).

## Старт — 2026-08-26

**Предмет:** T83. Гілка `cursor/renderer-canvas-fallback` від `1f78456`, PR у `main`.
**Дім артефактів:** `work/reports/renderer-fallback/` (за `## Артефакти` маніфесту).

**Поріг:** спрацював — `## Поріг пайплайна` → «змінюється публічний API SDK». Опція вибору
рушія стає частиною конфігу, який описує `docs/USAGE.md`.

**Що вже відомо до старту (виміряно, не припущення):**
- `autoDetectRenderer` уже падає webgl → webgpu → canvas, але лише коли `isWebGLSupported()`
  каже «ні»; під SwiftShader WebGL підтримується, тож фолбек мовчить.
- Вимикач — `failIfMajorPerformanceCaveat` (дефолт `false` з v6, `AbstractRenderer.mjs:341`).
- Прототип з `preference: ['webgl','canvas'] + failIfMajorPerformanceCaveat: true` перевірено:
  без GPU сцена їде на Canvas2D, з GPU — на WebGL. Staff·1M 1.4 с/4 fps → 0.28 с/121 fps.
  e2e 41/41. Прототип **відкочено**, дерево чисте.
- Незакрите: різниця картинки на зумі-аут (Canvas2D малює волосяні лінії без субпіксельного
  згладжування); blacklisted-драйвери теж поїдуть на канвас; `isWebGLSupported` кешує вердикт.

**Делегування:** grilling → GATE 1. Далі plan + acceptance-spec, GATE 2 (plan-critique,
plan-defense, конституція), tasks, tdd, code-review, ship-report.
