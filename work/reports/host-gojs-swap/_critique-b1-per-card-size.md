
ФАКТ (верифікація входу/поверхонь):
- StaffNodeSize вже існує і TS-експортується (types.rs:311-315, generated:204); size_map-патерн уже в staff_layout.rs:87-94 (fallback на geom). Повторне використання для mockup `sizes` — чисте.
- DiagramPosition.width/height optional (data/types.ts:142-143).
- Усі TS/demo-поверхні вже per-card: positionNode несе n.width/n.height; ShpsStaffCard бере screenRect.width/height (:109-110); promoteMath box.width*scale (:51); StaffChromeBackdrop читає n.width/f.width (:90-110,:135). Жодного хардкоду 300/112 на alpha-рендері не знайдено.
- Висновок: фіча майже цілком Rust-внутрішня + проводка sizes у buildStaffMockupInput. TS plan правильно НЕ чіпає рендер.
- stats_core приймає СКАЛЯРНІ cw/ch (:988-991); викликається з repair-loop (:1190) і mockup_stats (:1248) — сигнатура мусить стати per-card.
- Шину можна вивести з cards[child].1 (діти рівня top-aligned) замість проводки row_h у роутер — простіша альтернатива, план не розглянув.

РІШЕННЯ: критика завершена. Блокери: (1) план не задає потік row-heights у роутер під формулу Int-шини; (2) тести (г)/(є)/(д) зелені без фічі, якщо фікстури/бейзлайн не закріпити. Решта — неблокувальні уточнення. Межу переліку названо у фінальному звіті.
