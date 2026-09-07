# Plan Defense — collapsed-matrix (T113), гілка t113-collapsed-matrix

ДАЛІ: читаю plan.md, spec.md, tasks.md і код packages/sdk/src/layout/ перед формулюванням п'яти питань.

ФАКТ: план і спека прочитані. План §3.1 має вже дві "дірки" GATE 2 (порядок гвардії глибини,
parentId після розгортання) — обидві заявлені закритими "тут, до коду", ще нема коду. Це важливо
для питання 2 (відмова WASM/depth guard) — план явно каже про подвійну перевірку порогу і про
власне повідомлення, що називає сітку причиною.
План §6 Rollback: "git revert гілки цілком", і явно попереджає що відкат "по кроках" після К5
зламає доку (getOrgMode стане описаний без уточнення) — тобто вже названо один crack.
Спека §Межа: n=2 — no-op (ceil(sqrt(2))=2 колонки, той самий один ряд).
tasks.md: К1..К6 з "Готово, коли" критеріями. Ledger: один виконавець послідовно, паралельних
агентів немає — важливо для питання 3 (гонка): план явно НЕ проектує конкурентний виклик.

ДАЛІ: читаю код packages/sdk/src/layout/ — rowTreeLayout.ts, layoutBridge.ts (wasm bridge),
matrixGrid.ts, spineBusEdges.ts, siblingOrgGroups.ts, types.ts, і row-tree-depth/spec.md
(WASM poisoning class).
