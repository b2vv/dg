import { describe, expect, it } from '@rstest/core';
import { validateOrgHierarchy } from './orgTree.js';
import type { DiagramOrganization } from '../data/types.js';

/**
 * T77-M08 — validation is O(n): the `byId` map and the acyclic proof are built
 * once per call. A quadratic walk over a deep chain would take seconds here.
 */
function chain(n: number): DiagramOrganization[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `org-${i}`,
    name: `Org ${i}`,
    groupIds: [] as string[],
    ...(i > 0 ? { parentOrgId: `org-${i - 1}` } : {}),
  }));
}

describe('validateOrgHierarchy at scale', () => {
  it('success: a 20k-deep chain validates well under a second', () => {
    const orgs = chain(20_000);
    const t0 = performance.now();
    validateOrgHierarchy(orgs);
    expect(performance.now() - t0).toBeLessThan(500);
  });

  it('success: 20k flat siblings validate too', () => {
    const orgs: DiagramOrganization[] = [
      { id: 'root', name: 'Root', groupIds: [] },
      ...Array.from({ length: 20_000 }, (_, i) => ({
        id: `org-${i}`,
        name: `Org ${i}`,
        groupIds: [] as string[],
        parentOrgId: 'root',
      })),
    ];
    const t0 = performance.now();
    validateOrgHierarchy(orgs);
    expect(performance.now() - t0).toBeLessThan(500);
  });

  it('failure: a cycle deep in a long chain is still caught', () => {
    const orgs = chain(5_000);
    orgs[0] = { ...orgs[0]!, parentOrgId: 'org-4999' };
    expect(() => validateOrgHierarchy(orgs)).toThrow(/Cycle detected/);
  });
});
