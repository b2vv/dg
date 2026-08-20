import { describe, expect, it } from 'vitest';
import { computeMatrixLayout, swapMatrixOrder } from './matrixLayout.js';
import { validateOrgHierarchy } from './orgTree.js';
import type { DiagramOrganization } from '../data/types.js';

function org(id: string, order?: number, parent?: string, extra: Partial<DiagramOrganization> = {}): DiagramOrganization {
  return { id, name: id, groupIds: [], matrixOrder: order, parentOrgId: parent, ...extra };
}

describe('computeMatrixLayout', () => {
  it('success: places 10 orgs on grid', () => {
    const orgs = Array.from({ length: 10 }, (_, i) => org(`o${i}`, i));
    const layout = computeMatrixLayout(orgs, []);
    expect(layout.mode).toBe('matrix');
    expect(layout.nodes).toHaveLength(10);
    expect(layout.width).toBeGreaterThan(0);
  });

  it('success: square 2×2 with overflow column', () => {
    const orgs = Array.from({ length: 5 }, (_, i) => org(`o${i}`, i));
    const layout = computeMatrixLayout(orgs, [], {
      matrixShape: 'square',
      matrixColumns: 2,
    });
    const inMatrix = layout.nodes.filter((n) => n.inMatrix);
    const overflow = layout.nodes.filter((n) => n.inMatrix === false);
    expect(inMatrix).toHaveLength(4);
    expect(overflow).toHaveLength(1);
    expect(overflow[0]?.x).toBeGreaterThan(inMatrix[0]?.x ?? 0);
  });

  it('success: foreign org ejects matrix occupant visually', () => {
    const orgs = [
      org('a', 0),
      org('b', 1),
      org('foreign', 2, undefined, { inMatrix: false, matrixRow: 0, matrixCol: 0 }),
    ];
    const layout = computeMatrixLayout(orgs, [], {
      matrixShape: 'square',
      matrixColumns: 2,
    });
    const foreignNode = layout.nodes.find((n) => n.orgId === 'foreign');
    const evictedNode = layout.nodes.find((n) => n.orgId === 'a');
    expect(foreignNode?.inMatrix).toBe(false);
    expect(foreignNode?.matrixCol).toBe(0);
    expect(evictedNode?.inMatrix).toBe(false);
    expect(evictedNode?.matrixCol).toBe(2);
    expect(evictedNode?.x).toBeGreaterThan(foreignNode?.x ?? 0);
  });

  it('failure: empty organizations → empty layout', () => {
    const layout = computeMatrixLayout([], []);
    expect(layout.nodes).toHaveLength(0);
    expect(layout.edges).toHaveLength(0);
  });
});

describe('swapMatrixOrder', () => {
  it('success: reorders matrixOrder indices', () => {
    const orgs = [org('a', 0), org('b', 1), org('c', 2)];
    const next = swapMatrixOrder(orgs, 'c', 0);
    expect(next.find((o) => o.id === 'c')?.matrixOrder).toBe(0);
  });
});

describe('validateOrgHierarchy', () => {
  it('failure: cycle in parentOrgId throws', () => {
    const orgs = [
      org('a', 0, 'b'),
      org('b', 1, 'a'),
    ];
    expect(() => validateOrgHierarchy(orgs)).toThrow(/cycle/i);
  });

  it('failure: duplicate ids throw', () => {
    expect(() => validateOrgHierarchy([org('a'), org('a')])).toThrow(/duplicate/i);
  });
});
