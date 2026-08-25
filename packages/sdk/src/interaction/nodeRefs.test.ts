import { describe, expect, it } from 'vitest';
import { emptyDiagramData } from '../data/types.js';
import {
  orgNodeRef,
  personNodeRef,
  positionNodeRef,
  resolveNodeRefInData,
  seatNodeRef,
  testIdForRef,
} from './nodeRefs.js';

const data = {
  ...emptyDiagramData(),
  organizations: [{ id: 'o1', name: 'Cedar Lake', groupIds: [] }],
  persons: [{ id: 'per1', firstName: 'Ada', lastName: 'Byron' }],
  positions: [
    { id: 'p1', organizationId: 'o1', departmentId: 'd1', title: 'Lead', personId: 'per1' },
    { id: 'p2', organizationId: 'o1', title: 'Vacant seat' },
  ],
};

describe('nodeRefs', () => {
  it('success: seat ref carries org/department from the position', () => {
    const ref = personNodeRef(data, 'per1', 'p1');
    expect(ref).toMatchObject({ kind: 'person', organizationId: 'o1', departmentId: 'd1' });
    expect(positionNodeRef(data, 'p2')).toMatchObject({ kind: 'position', personId: undefined });
    expect(orgNodeRef('o1')).toEqual({ kind: 'organization', id: 'o1', organizationId: 'o1' });
  });

  it('success: a vacant seat resolves as a position, a filled one as its person', () => {
    expect(seatNodeRef(data, undefined, 'p2').kind).toBe('position');
    expect(seatNodeRef(data, 'per1', 'p1').kind).toBe('person');
  });

  it('success: raw ids try org → position → person; typed keys pin the kind', () => {
    expect(resolveNodeRefInData(data, 'o1')?.kind).toBe('organization');
    expect(resolveNodeRefInData(data, 'p2')?.kind).toBe('position');
    // A person id finds the seat that holds them.
    expect(resolveNodeRefInData(data, 'per1')).toMatchObject({ kind: 'person', positionId: 'p1' });
    expect(resolveNodeRefInData(data, 'position:p1')).toMatchObject({ positionId: 'p1' });
  });

  it('failure: unknown ids and mismatched kind hints resolve to null', () => {
    expect(resolveNodeRefInData(data, 'nope')).toBeNull();
    // 'o1' exists, but only as an organization.
    expect(resolveNodeRefInData(data, 'position:o1')).toBeNull();
    expect(testIdForRef(data, { kind: 'organization', id: 'gone' })).toBeNull();
  });

  it('success: test ids come from the entity, not the ref id', () => {
    expect(testIdForRef(data, orgNodeRef('o1'))).toBeTruthy();
    expect(testIdForRef(data, seatNodeRef(data, 'per1', 'p1'))).toBeTruthy();
  });
});
