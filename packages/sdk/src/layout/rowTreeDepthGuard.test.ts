import { describe, expect, it } from '@rstest/core';
import { computeOrgRowTreeLayout } from './rowTreeLayout.js';
import { computeAllContours } from '../contour/bridge.js';
import type { DiagramOrganization } from '../data/types.js';

/**
 * Acceptance block A — `work/reports/row-tree-depth/spec.md`.
 *
 * The measured failure this pins: a chain of 4 500 does not merely throw. It
 * traps the WASM module, and every later call into it fails — including
 * `computeAllContours`, an unrelated feature. `resetContourWasmForTests()` does
 * not bring it back, and `initContourWasm` holds one instance per process, so
 * for a host that means "the SDK is dead until the page reloads".
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
    expect(err!.name).toBe('OrgHierarchyError');
    expect(err!.message).toMatch(/2501/);
    expect(err!.message).toMatch(/2500/);
  });

  it('failure: the depth that used to trap WASM is refused the same way', async () => {
    const err = await computeOrgRowTreeLayout(expandedChain(4_500), 'org-0').then(
      () => null,
      (e: Error) => e,
    );
    expect(err).not.toBeNull();
    expect(err!.name).toBe('OrgHierarchyError');
  });

  it('success: the layout still works after a refusal', async () => {
    await computeOrgRowTreeLayout(expandedChain(4_500), 'org-0').catch(() => undefined);
    const res = await computeOrgRowTreeLayout(expandedChain(3), 'org-0');
    expect(res.nodes).toHaveLength(3);
  });

  it('success: an unrelated WASM feature still works after a refusal', async () => {
    await computeOrgRowTreeLayout(expandedChain(4_500), 'org-0').catch(() => undefined);
    const contours = await computeAllContours([
      { id: 'p1', departmentId: 'd1', col: 0, row: 0 },
    ]);
    expect(contours).toHaveLength(1);
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
    expect(err?.name).toBe('OrgHierarchyError');
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
