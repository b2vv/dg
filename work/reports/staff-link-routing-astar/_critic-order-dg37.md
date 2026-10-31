claude-opus-4-8

ДАЛІ: читаю probe/analysis-файли (_probe-tiergap, _probe-S2-lowtraverse, _diag-detour, _analysis-critic, _analysis-codex) і код staff_compose.rs/staff_layout.rs/staff_router.rs/staff_routes.rs — шукаю важіль Y-віяла tier1 відносно верху рамок tier2.

---

## ФАКТ (код, звірено) — важіль Y-віяла vs рамки

- `place()` staff_layout.rs:976 `child_top = top + bh[i] + vgap` — ЄДИНИЙ вертикальний важіль між рядком батька (ceo) і рядком дітей (dept-heads) у tree-block. vgap = `input.options.vertical_gap` (:1329). Однаковий для ВСІХ рівнів — окремого gap «ceo→dept-heads» нема.
- `department_frames_from_nodes` staff_layout.rs:1316 → `department_frame(..., content_padding, header=0.0)`. Отже frame.y = min_member_y − content_padding(36). Рамки обгортають ті самі member-ноди, що їх ставить `place()`.
- Віяло-грид-лінія: staff_router.rs:410 `wy.push(d.y - FRAME_MARGIN)`, FRAME_MARGIN=14. Віяло лягає на frame.y−14 — це РОУТИНГ-константа, завжди 14 над рамкою.
- ВИСНОВОК: віяло (frame.y−14) ЖОРСТКО зчеплене з рамками. vgap рухає рядок ceo І рамки РАЗОМ (probe: fan 266→626 ∥ frame 280→640 при vgap 120→480). tierGap (:1425) лише доповнює низ канви (compose_tiers:64). **Немає важеля, що рухає віяло незалежно від рамок.** Отже «відкрити смугу» лайаут-важелем структурно неможливо.

## РІШЕННЯ / ВЕРДИКТ

1. Порядок власника 3→2→1: крок 3 (tierGap-probe) зроблено — tierGap МЕРТВИЙ. Крок 1 («tierGap+low_traverse+channel-lane») мертвий ПОВНІСТЮ: всі три компоненти незалежно провалені (tierGap — цей probe; low_traverse — [274,266] порожній, sweep 1722→0 legal; T-CL — історія). Замінити «відкрити смугу» нема чим дешевим: єдиний живий важіль для residual-6 = ЛАЙАУТ-РЕОРДЕР (ana ближче до fin/dev; або порядок дітей ceo/депів) — це РІШЕННЯ власника + probe, не швидка перемога.
2. S1 (крок 2) — РЕАЛЬНИЙ, видимий, незалежний. Корінь: dept-head входить у frame.y, no-dept singleton (asst) — у card.y, що на content_padding(36) нижче (staff_routes.rs:594-608 + :1316 header=0). Лінія до помічника закінчується на 36px нижче лінії до dept-heads. Фікс у pack_tree_block (attachment-top alignment). Не чіпає роутинг → не конфліктує з майбутнім реордером (ортогональні осі). Низький ризик.
3. ПЕРШИМ видиме = **S1**. Причина «візуально все по-старому»: A/B/channel/low/tierGap смикали РОУТИНГ у насиченому коридорі (нема вертикального місця). S1 рухає ГЕОМЕТРІЮ (порт/ноду) — тому реально видно.
4. Шина (п.3 власника) — НЕ лягає на residual-6: ті перетини між РІЗНИМИ керівниками (cfo→ah vs ceo→hrd), а §5.3.3 забороняє шину різних керівників. Шина емерджентно вже є для сиблінгів одного керівника (exemption staff_router.rs:14-22), а fan-out одного керівника на mock3 майже нема. Прибрати шину з критичного шляху mock3.

Скоригований порядок: **S1 (видиме, зараз) → РІШЕННЯ власника про реордер (чи готові візуально змінити лайаут заради останніх 6; якщо ні — 6 є підлога цієї геометрії, зупинитись) → (за «так») probe реордеру → реордер**. Шину НЕ в цей ланцюг.

ДАЛІ: handback.
