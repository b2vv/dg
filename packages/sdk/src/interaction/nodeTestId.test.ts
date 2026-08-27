import { describe, expect, it } from '@rstest/core';
import {
  nodeDomTestId,
  normalizeTestIdKey,
  orgTestId,
  personTestId,
  positionTestId,
  resolveTestIdInData,
} from './nodeTestId.js';

const sample = {
  organizations: [
    { id: 'org-1', name: 'Root', groupIds: [], collapsed: true, testId: 'root' },
    { id: 'org-2', name: 'Child', groupIds: [], parentOrgId: 'org-1', collapsed: true },
  ],
  groups: [],
  departments: [],
  persons: [{ id: 'p1', fullName: 'Alice', testId: 'alice' }],
  positions: [
    {
      id: 'pos1',
      title: 'CEO',
      organizationId: 'org-1',
      groupIds: [],
      personId: 'p1',
      status: 'filled' as const,
      isTemporary: false,
    },
  ],
  reportLines: [],
};

describe('nodeTestId', () => {
  it('nodeDomTestId prefixes node-', () => {
    expect(nodeDomTestId('root')).toBe('node-root');
  });

  it('normalizeTestIdKey strips optional node- prefix', () => {
    expect(normalizeTestIdKey('node-root')).toBe('root');
    expect(normalizeTestIdKey('root')).toBe('root');
  });

  it('testId helpers fall back to id', () => {
    expect(orgTestId(sample.organizations[1]!)).toBe('org-2');
    expect(personTestId({ id: 'x', fullName: 'X' })).toBe('x');
    expect(
      positionTestId(
        {
          id: 'pos1',
          title: 'T',
          organizationId: 'org-1',
          groupIds: [],
          status: 'filled',
          isTemporary: false,
        },
        { id: 'p1', fullName: 'Alice', testId: 'alice' },
      ),
    ).toBe('alice');
    expect(
      positionTestId(
        {
          id: 'pos1',
          title: 'T',
          organizationId: 'org-1',
          groupIds: [],
          status: 'filled',
          isTemporary: false,
          testId: 'seat-1',
        },
        { id: 'p1', fullName: 'Alice', testId: 'alice' },
      ),
    ).toBe('seat-1');
  });

  it('resolveTestIdInData resolves org, person, and position', () => {
    expect(resolveTestIdInData(sample, 'root')?.kind).toBe('organization');
    expect(resolveTestIdInData(sample, 'node-root')?.id).toBe('org-1');
    expect(resolveTestIdInData(sample, 'alice')?.kind).toBe('person');
    expect(resolveTestIdInData(sample, 'pos1')?.kind).toBe('person');
    expect(resolveTestIdInData(sample, 'missing')).toBeNull();
  });
});
