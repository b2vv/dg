# staff-root-recenter — доробити пробу Cass2 (4311)

Жива нота (persist у репо — Obsidian-фолбек). Append по ходу.

ДАЛІ: productionize пробу root-centering у layoutConnectedTree → чистий коментар, перейменувати
_recenterProbe.test.ts у нормальний тест без debug-логу, повні гейти, візуальна звірка в demo, коміт+пуш (PR #95 підхопить).

---
КОНТЕКСТ (знайдено):
- 4311 origin (_recovered-vision.md:32): per-node w×h у Rust tidy, щоб ШПС = мокап; off-center
  visualEdgeBox — ОКРЕМИЙ owner-gated баг (render-шар, не цей).
- Проба (orgBlockLayout.ts:87-101, layoutConnectedTree): WASM layered-tidy ставить корінь у midpoint
  першої/останньої дитини → для асиметричних піддерев зсунутий; проба рухає ЛИШЕ корінь-ноду до
  bbox-центру всіх вузлів. Ребра деривуються з боксів downstream (не запікаються) — підтверджено
  тестом, що класифікує маршрути з боксів.
- Стан: проба проходить власний тест; повний світ зелений З пробою (demo 104/0). Нічого не ламає.
  «Незавершена» = exploratory shape (назва _recenter**Probe**, [[PROBE]] console.log, коментар ПРОБА).
- Рішення зберегти bbox-над-усіма-вузлами (не children-only): для реалістичного випадку (корінь вужчий
  за проліт дітей) ідентично, простіше, вибір автора. KISS.

РІШЕННЯ: productionize без зміни поведінки. Коміт окремий (layout-fidelity), PR #95 підхопить.
