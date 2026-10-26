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

  // Контракт host-read: `role` (org) і `external` (position) мають протікати у
  // node БЕЗ втрати — host HTML-overlay читає їх назад через listPromoteCandidates.
  it('passthrough: org.role and position.external survive into node', () => {
    const d = data();
    d.organizations[0]!.role = 'leading';
    d.positions[0]!.external = true;
    const payload = resolveContextMenuNodeData(d, {
      kind: 'position',
      id: 'pos1',
      positionId: 'pos1',
      organizationId: 'org1',
    });
    expect(payload.organization?.role).toBe('leading');
    expect(payload.position?.external).toBe(true);
  });

  // Контракт host-read: routing-input поля департаменту (`parentPositionId`, `order`,
  // routing-input §2) мають протікати у node БЕЗ втрати — staff-роутер читає їх зі
  // знімка; ingest (mergeById) заміняє об'єкт цілком по id, тож поля виживають.
  it('passthrough: department.parentPositionId and order survive into node', () => {
    const d = data();
    d.departments[0]!.parentPositionId = 'pos1';
    d.departments[0]!.order = 3;
    const payload = resolveContextMenuNodeData(d, {
      kind: 'position',
      id: 'pos1',
      positionId: 'pos1',
      departmentId: 'IT',
    });
    expect(payload.department?.parentPositionId).toBe('pos1');
    expect(payload.department?.order).toBe(3);
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
