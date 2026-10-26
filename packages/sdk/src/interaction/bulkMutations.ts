import { InteractionError } from '../core/index.js';
import type { DiagramData, DiagramOrganization, DiagramReportLine } from '../data/types.js';
import { extractSubtree, OrgHierarchyError, validateOrgHierarchy } from '../layout/orgTree.js';
import { rosterOf } from './positionReparent.js';

export interface TransferChildrenSummary {
  movedChildIds: string[];
  fromPositionId: string;
  toPositionId: string;
}

export interface DeleteSubtreeSummary {
  removedPositionIds: string[];
  removedPersonIds: string[];
  removedReportLineCount: number;
}

function adminChildrenOf(reports: readonly DiagramReportLine[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  // Unlike adminParentsOf, retain every edge so malformed multiple-parent data
  // cannot hide a descendant from validation or deletion.
  for (const report of reports) {
    if (report.kind !== 'admin') continue;
    const siblings = children.get(report.fromId) ?? [];
    siblings.push(report.toId);
    children.set(report.fromId, siblings);
  }
  return children;
}

function subtreeIds(children: ReadonlyMap<string, readonly string[]>, rootId: string): Set<string> {
  const seen = new Set([rootId]);
  const queue = [rootId];
  for (const cursor of queue) {
    for (const child of children.get(cursor) ?? []) {
      if (seen.has(child)) continue;
      seen.add(child);
      queue.push(child);
    }
  }
  return seen;
}

export function transferChildren(
  data: DiagramData,
  fromPositionId: string,
  toPositionId: string,
): { data: DiagramData; summary: TransferChildrenSummary } {
  const summary: TransferChildrenSummary = { fromPositionId, toPositionId, movedChildIds: [] };
  const { knownIds } = rosterOf(data.positions);
  if (!knownIds.has(fromPositionId) || !knownIds.has(toPositionId)) {
    throw new InteractionError('Cannot transfer children: unknown position');
  }
  if (fromPositionId === toPositionId) return { data, summary };
  const children = adminChildrenOf(data.reportLines);
  if (subtreeIds(children, fromPositionId).has(toPositionId)) {
    throw new InteractionError('Cannot transfer children: cycle');
  }
  const movedIds = new Set(children.get(fromPositionId) ?? []);
  if (movedIds.size === 0) return { data, summary };
  summary.movedChildIds = [...movedIds];
  // Same replace semantics as reparentPosition, in one pass; its per-seat
  // root/unchanged guards do not belong to the bulk-transfer contract.
  const reportLines = data.reportLines.filter((r) => !(r.kind === 'admin' && movedIds.has(r.toId)));
  for (const toId of movedIds) reportLines.push({ fromId: toPositionId, toId, kind: 'admin' });
  return { data: { ...data, reportLines }, summary };
}

export function deleteSubtree(
  data: DiagramData,
  positionId: string,
): { data: DiagramData; summary: DeleteSubtreeSummary } {
  const { knownIds, headIds } = rosterOf(data.positions);
  if (!knownIds.has(positionId)) throw new InteractionError('Cannot delete subtree: unknown position');
  const removedIds = subtreeIds(adminChildrenOf(data.reportLines), positionId);
  for (const id of removedIds) {
    if (headIds.has(id)) throw new InteractionError('Cannot delete subtree: head position');
  }
  const positions = data.positions.filter((p) => !removedIds.has(p.id));
  const survivingPersonIds = new Set(positions.map((p) => p.personId));
  const removedPersonIds = new Set(data.positions.filter((p) => removedIds.has(p.id)).map((p) => p.personId));
  const removedPersons = data.persons.filter((p) => removedPersonIds.has(p.id) && !survivingPersonIds.has(p.id));
  const orphanIds = new Set(removedPersons.map((p) => p.id));
  const persons = data.persons.filter((p) => !orphanIds.has(p.id));
  const reportLines = data.reportLines.filter((r) => !removedIds.has(r.fromId) && !removedIds.has(r.toId));
  const departments = data.departments.map((department) =>
    department.parentPositionId != null && removedIds.has(department.parentPositionId)
      ? { ...department, parentPositionId: null }
      : department,
  );
  return {
    data: { ...data, positions, persons, reportLines, departments },
    summary: {
      removedPositionIds: [...removedIds].filter((id) => knownIds.has(id)),
      removedPersonIds: [...orphanIds],
      removedReportLineCount: data.reportLines.length - reportLines.length,
    },
  };
}

export interface TransferOrgsSummary {
  movedOrgIds: string[];
  fromOrgId: string;
  toOrgId: string;
}

export interface DeleteOrgSubtreeSummary {
  removedOrgIds: string[];
  removedDepartmentIds: string[];
  removedPositionIds: string[];
  removedPersonIds: string[];
  removedGroupIds: string[];
  removedReportLineCount: number;
  removedOrgLinkCount: number;
}

function validatedOrgSubtree(data: DiagramData, orgId: string): DiagramOrganization[] {
  try {
    // extractSubtree assumes an acyclic hierarchy; validate before its recursive walk.
    validateOrgHierarchy(data.organizations);
    return extractSubtree(data.organizations, orgId);
  } catch (error) {
    if (error instanceof OrgHierarchyError) throw new InteractionError(error.message);
    throw error;
  }
}

export function transferChildOrgs(
  data: DiagramData,
  fromOrgId: string,
  toOrgId: string,
): { data: DiagramData; summary: TransferOrgsSummary } {
  const summary: TransferOrgsSummary = { fromOrgId, toOrgId, movedOrgIds: [] };
  const knownIds = new Set(data.organizations.map((org) => org.id));
  if (!knownIds.has(fromOrgId) || !knownIds.has(toOrgId)) {
    throw new InteractionError('Cannot transfer child orgs: unknown organization');
  }
  if (fromOrgId === toOrgId) return { data, summary };
  if (validatedOrgSubtree(data, fromOrgId).some((org) => org.id === toOrgId)) {
    throw new InteractionError('Cannot transfer child orgs: cycle');
  }
  summary.movedOrgIds = data.organizations.filter((org) => org.parentOrgId === fromOrgId).map((org) => org.id);
  if (summary.movedOrgIds.length === 0) return { data, summary };
  const organizations = data.organizations.map((org) =>
    org.parentOrgId === fromOrgId ? { ...org, parentOrgId: toOrgId } : org,
  );
  return { data: { ...data, organizations }, summary };
}

export function deleteOrgSubtree(
  data: DiagramData,
  orgId: string,
): { data: DiagramData; summary: DeleteOrgSubtreeSummary } {
  const target = data.organizations.find((org) => org.id === orgId);
  if (!target) throw new InteractionError('Cannot delete org subtree: unknown organization');
  if (!target.parentOrgId) throw new InteractionError('Cannot delete org subtree: root organization');
  const removedOrgIds = new Set(validatedOrgSubtree(data, orgId).map((org) => org.id));
  const organizations = data.organizations.filter((org) => !removedOrgIds.has(org.id));
  const removedPositions = data.positions.filter((p) => removedOrgIds.has(p.organizationId));
  const removedPositionIds = new Set(removedPositions.map((p) => p.id));
  const positions = data.positions.filter((p) => !removedPositionIds.has(p.id));
  const removedDepartments = data.departments.filter((d) => removedOrgIds.has(d.organizationId));
  // Вцілілий департамент міг тримати routing-anchor (parentPositionId) на посаду у ВИДАЛЕНІЙ орг
  // (крос-орг дозволено, OQ2). Занулюємо такий dangling-реф — симетрично N1 у deleteSubtree.
  const departments = data.departments
    .filter((d) => !removedOrgIds.has(d.organizationId))
    .map((d) =>
      d.parentPositionId != null && removedPositionIds.has(d.parentPositionId)
        ? { ...d, parentPositionId: null }
        : d,
    );
  const reportLines = data.reportLines.filter((r) => !removedPositionIds.has(r.fromId) && !removedPositionIds.has(r.toId));
  const originalOrgLinks = data.orgLinks ?? [];
  const orgLinks = originalOrgLinks.filter((link) => !removedOrgIds.has(link.fromOrgId) && !removedOrgIds.has(link.toOrgId));
  const removedPersonRefs = new Set(removedPositions.map((p) => p.personId));
  const survivingPersonRefs = new Set(positions.map((p) => p.personId));
  const removedPersons = data.persons.filter((p) => removedPersonRefs.has(p.id) && !survivingPersonRefs.has(p.id));
  const removedPersonIds = new Set(removedPersons.map((p) => p.id));
  const persons = data.persons.filter((p) => !removedPersonIds.has(p.id));
  // Positions can keep a group alive independently of every surviving organization.
  const survivingGroupIds = new Set([
    ...organizations.flatMap((org) => org.groupIds),
    ...positions.flatMap((p) => p.groupIds),
  ]);
  const removedGroups = data.groups.filter((group) => !survivingGroupIds.has(group.id));
  const groups = data.groups.filter((group) => survivingGroupIds.has(group.id));
  return {
    data: { ...data, organizations, positions, departments, reportLines, orgLinks, persons, groups },
    summary: {
      removedOrgIds: [...removedOrgIds],
      removedDepartmentIds: removedDepartments.map((d) => d.id),
      removedPositionIds: [...removedPositionIds],
      removedPersonIds: [...removedPersonIds],
      removedGroupIds: removedGroups.map((group) => group.id),
      removedReportLineCount: data.reportLines.length - reportLines.length,
      removedOrgLinkCount: originalOrgLinks.length - orgLinks.length,
    },
  };
}
