type RouteInputPosition = {
  id: string;
  parentId?: string | null;
  deptId?: string;
  order?: number;
};

type RouteInputDepartment = {
  id: string;
  collapsed?: boolean;
  hidden?: boolean;
};

type NormalizedRoutePosition = Omit<RouteInputPosition, 'deptId'> & {
  deptId?: string | null;
};

type RouteInputErrorCode = 'dangling-parent' | 'self-parent' | 'cycle';

type RouteInputResult =
  | { ok: true; positions: NormalizedRoutePosition[]; diagnostics: string[] }
  | { ok: false; error: { code: RouteInputErrorCode } };

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePositions(left: RouteInputPosition, right: RouteInputPosition): number {
  const leftParent = left.parentId ?? null;
  const rightParent = right.parentId ?? null;
  if (leftParent !== rightParent) {
    if (leftParent === null) return -1;
    if (rightParent === null) return 1;
    return compareStrings(leftParent, rightParent);
  }
  return (left.order ?? 0) - (right.order ?? 0) || compareStrings(left.id, right.id);
}

function validateParentLinks(
  positions: readonly NormalizedRoutePosition[],
): RouteInputErrorCode | null {
  const byId = new Map(positions.map((position) => [position.id, position]));
  for (const position of positions) {
    if (position.parentId === position.id) return 'self-parent';
    if (position.parentId != null && !byId.has(position.parentId)) return 'dangling-parent';
  }

  const visited = new Set<string>();
  for (const position of positions) {
    const path = new Set<string>();
    let currentId: string | null | undefined = position.id;
    while (currentId != null && !visited.has(currentId)) {
      if (path.has(currentId)) return 'cycle';
      path.add(currentId);
      currentId = byId.get(currentId)?.parentId;
    }
    for (const id of path) visited.add(id);
  }
  return null;
}

export function validateRouteInput(
  positions: readonly RouteInputPosition[],
  departments: readonly RouteInputDepartment[],
): RouteInputResult {
  const departmentsById = new Map(departments.map((department) => [department.id, department]));
  const normalized: NormalizedRoutePosition[] = [];
  const diagnostics: string[] = [];

  for (const position of [...positions].sort(comparePositions)) {
    const department = position.deptId === undefined
      ? undefined
      : departmentsById.get(position.deptId);
    if (department?.collapsed === true || department?.hidden === true) continue;
    if (position.deptId !== undefined && department === undefined) {
      normalized.push({ ...position, deptId: null });
      diagnostics.push(`unknown-department:${position.id}:${position.deptId}`);
    } else {
      normalized.push({ ...position });
    }
  }

  const code = validateParentLinks(normalized);
  if (code !== null) return { ok: false, error: { code } };
  return { ok: true, positions: normalized, diagnostics };
}
