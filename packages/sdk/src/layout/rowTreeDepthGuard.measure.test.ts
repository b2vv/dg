import { describe, expect, it } from '@rstest/core';
import { computeOrgRowTreeLayout } from './rowTreeLayout.js';
// Deliberately the barrel, not './orgTree.js': what this pins is that a host
// can catch the guard by type, and a host only ever sees the barrel.
import { OrgHierarchyError } from '../index.js';
import type { DiagramOrganization } from '../data/types.js';

/**
 * ⚠️ **Не входить у дефолтну сюїту** (`rstest.config.ts` → `exclude`): читає годинник.
 * Запуск: `npm run measure -w @org-hierarchy/sdk`. Поведінкова половина — у
 * `rowTreeDepthGuard.test.ts`.
 *
 * Acceptance block A — `work/reports/row-tree-depth/spec.md`.
 *
 * 🔴 **Read the next paragraph before citing this file as proof of anything.**
 * The previous version of this comment claimed these tests pin the measured
 * WASM trap — «a chain of 4 500 traps the module, and every later call fails».
 * They do not, and they cannot: `MAX_ROW_TREE_DEPTH` refuses at 2 500 on the JS
 * side, so the trap at ~4 500 is unreachable through any public path. That
 * measurement was taken by hand (`work/reports/row-tree-depth/spec.md`) and has
 * never had an automated witness. The comment outliving the fact is exactly how
 * it misled the T80 spec into planning work that was not needed.
 *
 * What these tests actually pin is the other half, and it is the half that has
 * a defect to guard: **the refusal is clean**. The guard rejects by contract
 * before WASM is touched, so the module stays usable afterwards — which is why
 * `:54` calls the layout again and expects it to work.
 *
 * Depth is measured over the *expanded* subtree, so every org here is
 * `collapsed: false` — the default is collapsed (`isOrgCollapsed` is
 * `collapsed !== false`), and a chain built without it lays out one node and
 * reports a comfortable green for the wrong reason.
 */
function expandedChain(n: number): DiagramOrganization[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `org-${i}`,
    name: `Org ${i}`,
    groupIds: [] as string[],
    collapsed: false,
    ...(i > 0 ? { parentOrgId: `org-${i - 1}` } : {}),
  }));
}

describe('row-tree depth guard — вартість', () => {
  it('success: a 50k-deep chain is refused in milliseconds, not in the 12.8 s it cost before', async () => {
    const orgs = expandedChain(50_000);
    await computeOrgRowTreeLayout(orgs, 'org-0').catch(() => undefined); // прогрів
    const t0 = performance.now();
    const err = await computeOrgRowTreeLayout(orgs, 'org-0').then(
      () => null,
      (e: Error) => e,
    );
    const ms = performance.now() - t0;
    expect(err).toBeInstanceOf(OrgHierarchyError);

    // 🔴 **Стеля була 500 мс і червоніла в повному прогоні.** Виміряно тут:
    // поодинці **41 · 42 · 57 мс**, під паралельною сюїтою **195 · 227 · 407 мс**
    // — тобто стара стеля лишала ×1,2 запасу там, де навантаження дає ×10.
    // Дефект, який цей рядок стереже, коштував **12 800 мс**, тож стеля 4 000
    // сидить ×10 над найгіршим виміряним і ×3,2 під дефектом. Число з виміру,
    // не з відчуття «скільки має бути швидко».
    //
    // ⚠️ Частка тут **не** працює, і це виміряно: увосьмеро довший ланцюг дає
    // ×14,7 … ×18,3, а не ×1. Бо відмова коштує O(входу), а не O(межі): перед
    // гвардією йдуть `validateOrgHierarchy` і два індекси по **всьому** масиву
    // (`rowTreeLayout.ts:145,70-76`). Ранній вихід економить обхід дерева, а не
    // виклик — попередня редакція коментаря стверджувала протилежне.
    expect(ms).toBeLessThan(4_000);
  });

});
