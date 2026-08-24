import type { ContourPositionInput } from '../contour/bridge.js';
import { resolveMagnetRadius } from './magnetRadius.js';

function manhattan(a: ContourPositionInput, b: ContourPositionInput): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

/** Union-find clusters: merge when Manhattan distance ≤ magnetRadius (Rust parity). */
export function clusterPositionIds(
  positions: readonly ContourPositionInput[],
  magnetRadius = 1.5,
): string[][] {
  const radius = resolveMagnetRadius(magnetRadius);
  const n = positions.length;
  if (n === 0) return [];
  const parent = positions.map((_, i) => i);

  const find = (i: number): number => {
    let x = i;
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };

  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (manhattan(positions[i]!, positions[j]!) <= radius) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, string[]>();
  for (let i = 0; i < n; i += 1) {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(positions[i]!.id);
    groups.set(root, list);
  }

  return [...groups.values()].sort((a, b) => a[0]!.localeCompare(b[0]!));
}

export function clusterPositionsByDepartment(
  inputs: readonly ContourPositionInput[],
  departmentId: string,
  magnetRadius = 1.5,
): string[][] {
  return clusterPositionIds(
    inputs.filter((p) => p.departmentId === departmentId),
    magnetRadius,
  );
}
