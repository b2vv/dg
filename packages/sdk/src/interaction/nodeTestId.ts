import type { DiagramData, DiagramOrganization, DiagramPerson, DiagramPosition } from '../data/types.js';
import type { NodeRef } from './types.js';
import type { NodeKind } from './types.js';

/** DOM attribute value: `data-testid="node-<testId>"`. */
export function nodeDomTestId(testId: string): string {
  return `node-${testId}`;
}

/** Normalize query / selector → lookup key (strip optional `node-` prefix). */
export function normalizeTestIdKey(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('node-')) return t.slice(5);
  return t;
}

export function orgTestId(org: DiagramOrganization): string {
  return org.testId ?? org.id;
}

export function personTestId(person: DiagramPerson): string {
  return person.testId ?? person.id;
}

export function positionTestId(position: DiagramPosition, person?: DiagramPerson): string {
  return position.testId ?? person?.testId ?? position.personId ?? position.id;
}

/** Resolve stable testId → node ref (first match). */
export function resolveTestIdInData(data: DiagramData, raw: string): NodeRef | null {
  const key = normalizeTestIdKey(raw);

  for (const org of data.organizations) {
    if (orgTestId(org) === key || org.id === key) {
      return { kind: 'organization', id: org.id, organizationId: org.id };
    }
  }

  for (const person of data.persons) {
    if (personTestId(person) === key || person.id === key) {
      const position = data.positions.find((p) => p.personId === person.id);
      if (position) {
        return {
          kind: 'person',
          id: person.id,
          organizationId: position.organizationId,
          departmentId: position.departmentId,
          positionId: position.id,
          personId: person.id,
        };
      }
    }
  }

  for (const position of data.positions) {
    const person = position.personId
      ? data.persons.find((p) => p.id === position.personId)
      : undefined;
    const tid = positionTestId(position, person);
    if (tid === key || position.id === key) {
      if (position.personId) {
        return {
          kind: 'person',
          id: position.personId,
          organizationId: position.organizationId,
          departmentId: position.departmentId,
          positionId: position.id,
          personId: position.personId,
        };
      }
      return {
        kind: 'position',
        id: position.id,
        organizationId: position.organizationId,
        departmentId: position.departmentId,
        positionId: position.id,
      };
    }
  }

  return null;
}

export interface TestAnchorCandidate {
  testId: string;
  kind: NodeKind;
  ref: NodeRef;
  world: { x: number; y: number; width: number; height: number };
}
