import { describe, expect, it } from '@rstest/core';
import { computeOrgRowTreeLayout } from './rowTreeLayout.js';
// Deliberately the barrel, not './orgTree.js': what this pins is that a host
// can catch the guard by type, and a host only ever sees the barrel.
import { OrgHierarchyError } from '../index.js';
import type { DiagramOrganization } from '../data/types.js';

/**
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

describe('row-tree depth guard', () => {
  it('failure: one org past the limit is refused by contract, not by a stack overflow', async () => {
    const err = await computeOrgRowTreeLayout(expandedChain(2_501), 'org-0').then(
      () => null,
      (e: Error) => e,
    );
    expect(err).not.toBeNull();
    expect(err).toBeInstanceOf(OrgHierarchyError);
    expect(err!.message).toMatch(/2501/);
    expect(err!.message).toMatch(/2500/);
  });

  it('failure: the depth that used to trap WASM is refused the same way', async () => {
    const err = await computeOrgRowTreeLayout(expandedChain(4_500), 'org-0').then(
      () => null,
      (e: Error) => e,
    );
    expect(err).not.toBeNull();
    expect(err).toBeInstanceOf(OrgHierarchyError);
  });

  it('success: the layout still works after a refusal', async () => {
    await computeOrgRowTreeLayout(expandedChain(4_500), 'org-0').catch(() => undefined);
    const res = await computeOrgRowTreeLayout(expandedChain(3), 'org-0');
    expect(res.nodes).toHaveLength(3);
  });

  it('success: exactly the limit still lays out', async () => {
    const res = await computeOrgRowTreeLayout(expandedChain(2_500), 'org-0');
    expect(res.nodes).toHaveLength(2_500);
  });

  it('success: a 50k-deep chain is refused in well under a second', async () => {
    const t0 = performance.now();
    const err = await computeOrgRowTreeLayout(expandedChain(50_000), 'org-0').then(
      () => null,
      (e: Error) => e,
    );
    const ms = performance.now() - t0;
    expect(err).toBeInstanceOf(OrgHierarchyError);
    // It used to take 12.8 s to reach the trap. The guard stops at the first
    // node past the limit, so the remaining 47 500 are never walked.
    expect(ms).toBeLessThan(500);
  });

  it('success: depth is the expanded subtree, not the size of the array', async () => {
    const orgs = expandedChain(50_000).map((o, i) =>
      i < 10 ? o : { ...o, collapsed: true },
    );
    const res = await computeOrgRowTreeLayout(orgs, 'org-0');
    // Ten expanded, plus the first collapsed node that is still drawn as a leaf.
    expect(res.nodes).toHaveLength(11);
  });

  it('success: a single expanded root lays out', async () => {
    const res = await computeOrgRowTreeLayout(expandedChain(1), 'org-0');
    expect(res.nodes).toHaveLength(1);
  });

  it('failure: a cycle is still reported as a cycle, not as depth', async () => {
    const orgs = expandedChain(3_000);
    orgs[0] = { ...orgs[0]!, parentOrgId: 'org-2999' };
    const err = await computeOrgRowTreeLayout(orgs, 'org-0').then(
      () => null,
      (e: Error) => e,
    );
    expect(err?.message).toMatch(/Cycle detected/);
  });
});
