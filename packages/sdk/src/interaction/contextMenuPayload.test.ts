import { describe, expect, it } from '@rstest/core';
import type { DiagramData } from '../data/types.js';
import { resolveContextMenuNodeData } from './contextMenuPayload.js';

function data(): DiagramData {
  return {
    organizations: [{ id: 'org1', name: 'Ops', groupIds: [] }],
    groups: [],
    departments: [{ id: 'IT', name: 'IT', organizationId: 'org1' }],
    persons: [{ id: 'p1', fullName: 'Alice Smith' }],
    positions: [
      {
        id: 'pos1',
        title: 'CEO',
        organizationId: 'org1',
        departmentId: 'IT',
        groupIds: [],
        personId: 'p1',
        status: 'filled',
        isTemporary: false,
      },
    ],
    reportLines: [],
  };
}

describe('resolveContextMenuNodeData', () => {
  it('success: person ref resolves person, position, org, dept', () => {
    const payload = resolveContextMenuNodeData(data(), {
      kind: 'person',
      id: 'p1',
      personId: 'p1',
      positionId: 'pos1',
      organizationId: 'org1',
      departmentId: 'IT',
    });
    expect(payload.person?.fullName).toBe('Alice Smith');
    expect(payload.position?.title).toBe('CEO');
    expect(payload.organization?.name).toBe('Ops');
    expect(payload.department?.name).toBe('IT');
    expect(payload.ref.positionId).toBe('pos1');
  });

  it('failure: unknown ids → sparse payload, still has ref', () => {
    const payload = resolveContextMenuNodeData(data(), {
      kind: 'person',
      id: 'missing',
    });
    expect(payload.person).toBeUndefined();
    expect(payload.ref.id).toBe('missing');
  });
});
