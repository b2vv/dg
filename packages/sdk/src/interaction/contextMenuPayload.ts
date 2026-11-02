import type {
  DiagramData,
  DiagramDepartment,
  DiagramOrganization,
  DiagramPerson,
  DiagramPosition,
  DiagramReportLine,
} from '../data/types.js';
import type { MenuItem, NodeRef } from '../core/index.js';

/** Snapshot of diagram entities for the node under the cursor. */
export interface ContextMenuNodeData {
  ref: NodeRef;
  organization?: DiagramOrganization;
  person?: DiagramPerson;
  position?: DiagramPosition;
  department?: DiagramDepartment;
}

export interface ContextMenuPointer {
  clientX: number;
  clientY: number;
  canvasX?: number;
  canvasY?: number;
}

export interface ContextMenuRequest {
  node: ContextMenuNodeData;
  items: MenuItem[];
  pointer: ContextMenuPointer;
  /**
   * The admin link **into** the node — its manager edge, `payload` included —
   * or `null` when it has none (a head, an organization). Not a click on a line.
   * Always set by the SDK; optional only so a request built by hand (a host
   * test) still compiles after 1.0.
   */
  incomingLink?: DiagramReportLine | null;
}

/**
 * The admin edge whose `toId` is the position, by the same rule as
 * `adminParentsOf`: self-edges skipped, the last one wins.
 */
export function incomingAdminLink(
  reports: readonly DiagramReportLine[],
  positionId: string | undefined,
): DiagramReportLine | null {
  if (!positionId) return null;
  let found: DiagramReportLine | null = null;
  for (const r of reports) {
    if (r.kind === 'admin' && r.toId === positionId && r.fromId !== r.toId) found = r;
  }
  return found;
}

export function resolveContextMenuNodeData(
  data: DiagramData,
  ref: NodeRef,
): ContextMenuNodeData {
  const organizationId = ref.organizationId;
  const organization = organizationId
    ? data.organizations.find((o) => o.id === organizationId)
    : data.organizations.find((o) => o.id === ref.id);

  const position =
    (ref.positionId
      ? data.positions.find((p) => p.id === ref.positionId)
      : undefined) ??
    (ref.kind === 'position' ? data.positions.find((p) => p.id === ref.id) : undefined) ??
    (ref.personId
      ? data.positions.find((p) => p.personId === ref.personId)
      : undefined) ??
    (ref.kind === 'person'
      ? data.positions.find((p) => p.personId === ref.id)
      : undefined);

  const personId = ref.personId ?? position?.personId ?? (ref.kind === 'person' ? ref.id : undefined);
  const person = personId ? data.persons.find((p) => p.id === personId) : undefined;

  const departmentId = ref.departmentId ?? position?.departmentId;
  const department = departmentId
    ? data.departments.find((d) => d.id === departmentId)
    : undefined;

  return {
    ref: {
      ...ref,
      organizationId: ref.organizationId ?? organization?.id ?? position?.organizationId,
      departmentId: ref.departmentId ?? department?.id,
      positionId: ref.positionId ?? position?.id,
      personId: ref.personId ?? person?.id,
    },
    organization,
    person,
    position,
    department,
  };
}
