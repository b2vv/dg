import type { DiagramData } from '../data/types.js';
import { parseNodeEntityKey } from './nodeKey.js';
import { orgTestId, personTestId, positionTestId } from './nodeTestId.js';
import type { NodeRef } from './types.js';

/**
 * Data → NodeRef resolution. Kept free of renderer state so the same rules
 * serve clicks, test anchors, promote overlays and programmatic focus.
 */

export function orgNodeRef(orgId: string): NodeRef {
  return { kind: 'organization', id: orgId, organizationId: orgId };
}

export function personNodeRef(
  data: DiagramData,
  personId: string,
  positionId: string,
): NodeRef {
  const position = data.positions.find((p) => p.id === positionId);
  return {
    kind: 'person',
    id: personId,
    organizationId: position?.organizationId,
    departmentId: position?.departmentId,
    positionId,
    personId,
  };
}

export function positionNodeRef(data: DiagramData, positionId: string): NodeRef {
  const position = data.positions.find((p) => p.id === positionId);
  return {
    kind: 'position',
    id: positionId,
    organizationId: position?.organizationId,
    departmentId: position?.departmentId,
    positionId,
    personId: position?.personId,
  };
}

/** Seat ref that prefers the person when the seat is filled. */
export function seatNodeRef(
  data: DiagramData,
  personId: string | undefined,
  positionId: string,
): NodeRef {
  return personId
    ? personNodeRef(data, personId, positionId)
    : positionNodeRef(data, positionId);
}

/**
 * Resolve a raw or typed (`kind:id`) node id. Without a kind hint the id is
 * tried as org → position → person, so a person id still finds its seat.
 */
export function resolveNodeRefInData(data: DiagramData, nodeId: string): NodeRef | null {
  const parsed = parseNodeEntityKey(nodeId);
  const raw = parsed?.id ?? nodeId;
  const kindHint = parsed?.kind;

  if (kindHint === 'organization' || !kindHint) {
    const org = data.organizations.find((o) => o.id === raw);
    if (org) return orgNodeRef(org.id);
    if (kindHint === 'organization') return null;
  }
  if (kindHint === 'position' || !kindHint) {
    const position = data.positions.find((p) => p.id === raw);
    if (position) return seatNodeRef(data, position.personId, position.id);
    if (kindHint === 'position') return null;
  }
  if (kindHint === 'person' || !kindHint) {
    const byPerson = data.positions.find((p) => p.personId === raw);
    if (byPerson?.personId) return personNodeRef(data, byPerson.personId, byPerson.id);
  }
  return null;
}

/** Stable DOM test id for a ref, or null when the entity is gone. */
export function testIdForRef(data: DiagramData, ref: NodeRef): string | null {
  if (ref.kind === 'organization') {
    const org = data.organizations.find((o) => o.id === ref.id);
    return org ? orgTestId(org) : null;
  }
  if (ref.kind === 'person') return personSeatTestId(data, ref);
  const position = data.positions.find((p) => p.id === (ref.positionId ?? ref.id));
  if (!position) return null;
  const person = position.personId
    ? data.persons.find((p) => p.id === position.personId)
    : undefined;
  return positionTestId(position, person);
}

function personSeatTestId(data: DiagramData, ref: NodeRef): string | null {
  const position = ref.positionId
    ? data.positions.find((p) => p.id === ref.positionId)
    : data.positions.find((p) => p.personId === (ref.personId ?? ref.id));
  const person = ref.personId
    ? data.persons.find((p) => p.id === ref.personId)
    : position?.personId
      ? data.persons.find((p) => p.id === position.personId)
      : undefined;
  if (position) return positionTestId(position, person);
  if (person) return personTestId(person);
  return null;
}
