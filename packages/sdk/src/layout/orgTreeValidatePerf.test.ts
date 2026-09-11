import { describe, expect, it } from '@rstest/core';
import { validateOrgHierarchy } from './orgTree.js';
import type { DiagramOrganization } from '../data/types.js';

/**
 * Поведінкова половина. Вартісна половина живе в `orgTreeValidatePerf.measure.test.ts`
 * і **не** входить у дефолтну сюїту — див. коментар у `rstest.config.ts`.
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
  it('failure: a cycle deep in a long chain is still caught', () => {
    const orgs = chain(5_000);
    orgs[0] = { ...orgs[0]!, parentOrgId: 'org-4999' };
    expect(() => validateOrgHierarchy(orgs)).toThrow(/Cycle detected/);
  });
});
