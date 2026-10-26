import {
  contourDepartmentId,
  NO_DEPARTMENT_ID,
  type DiagramDepartment,
  type DiagramPosition,
  type DiagramReportLine,
} from '../../data/types.js';
import { aabbOverlap, type StaffGeom } from './coords.js';
import { layoutConnectedTree } from './orgBlockLayout.js';
import { adminParentMap } from './resolveHead.js';
import type { StaffNodeBox } from './types.js';

export interface StaffDeptGroupingResult {
  nodes: StaffNodeBox[];
  memberBoxesByDept: Map<string, StaffNodeBox[]>;
  diagnostics: string[];
}

type Region = Pick<StaffNodeBox, 'x' | 'y' | 'width' | 'height'>;

function regionBounds(nodes: StaffNodeBox[]): Region | undefined {
  const first = nodes[0];
  if (!first) return undefined;
  let x = first.x;
  let y = first.y;
  let right = first.x + first.width;
  let bottom = first.y + first.height;
  for (const node of nodes) {
    x = Math.min(x, node.x);
    y = Math.min(y, node.y);
    right = Math.max(right, node.x + node.width);
    bottom = Math.max(bottom, node.y + node.height);
  }
  return { x, y, width: right - x, height: bottom - y };
}

function compareDepartments(left: DiagramDepartment, right: DiagramDepartment): number {
  return (
    (left.order ?? 0) - (right.order ?? 0) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  );
}

/** Validated members of one org; their input order is the WASM sibling-order channel. */
export async function groupStaffByDepartment(
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
  departments: DiagramDepartment[],
  orgId: string,
  geom: StaffGeom,
): Promise<StaffDeptGroupingResult> {
  const buckets = new Map<string, DiagramPosition[]>();
  for (const position of positions) {
    const deptId = contourDepartmentId(position);
    const members = buckets.get(deptId);
    if (members) members.push(position);
    else buckets.set(deptId, [position]);
  }
  const deptIds = [...departments]
    .filter((department) => department.id !== NO_DEPARTMENT_ID && buckets.has(department.id))
    .sort(compareDepartments)
    .map((department) => department.id);
  if (buckets.has(NO_DEPARTMENT_ID)) deptIds.push(NO_DEPARTMENT_ID);

  const parents = adminParentMap(positions, reports, orgId);
  const nodes: StaffNodeBox[] = [];
  const memberBoxesByDept = new Map<string, StaffNodeBox[]>();
  const regions: Region[] = [];
  let cursorX = geom.margin;
  for (const deptId of deptIds) {
    const members = buckets.get(deptId);
    const first = members?.[0];
    if (!members || !first) continue;
    const ids = new Set(members.map((member) => member.id));
    const root =
      members.find((member) => {
        const parentId = parents.get(member.id);
        return parentId === undefined || !ids.has(parentId);
      }) ?? first;
    const local = await layoutConnectedTree(members, reports, orgId, root.id, geom, 'tree');
    const bounds = regionBounds(local);
    if (!bounds) continue;
    const region = { ...bounds, x: cursorX, y: geom.margin };

    // Each rightward ejection clears at least one region permanently. The guard
    // is bounded by the number of placed regions; never return an overlapping block.
    for (let guard = 0; guard <= regions.length; guard++) {
      const collision = regions.find((placed) =>
        aabbOverlap(region, placed, geom.horizontalGap, geom.verticalGap),
      );
      if (!collision) break;
      if (guard === regions.length) throw new Error('Department region packing did not converge');
      region.x = collision.x + collision.width + geom.horizontalGap;
    }
    const placed = local.map((node) => ({
      ...node,
      x: node.x - bounds.x + region.x,
      y: node.y - bounds.y + region.y,
    }));
    for (const node of placed) nodes.push(node);
    if (deptId !== NO_DEPARTMENT_ID) memberBoxesByDept.set(deptId, placed);
    regions.push(region);
    cursorX = region.x + region.width + geom.horizontalGap;
  }
  return { nodes, memberBoxesByDept, diagnostics: [] };
}
