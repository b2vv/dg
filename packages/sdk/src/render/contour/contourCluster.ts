import type { ContourPositionInput } from '../../contour/bridge.js';
import { resolveMagnetRadius } from '../../contour/magnetRadius.js';

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

  // Neighbours are looked up by cell instead of compared pair by pair: at
  // radius 1.5 a seat has at most a handful, while the old double loop walked
  // every other seat in the department — 400 seats meant 160 000 comparisons
  // per department, per frame (T107).
  //
  // The key is a hash, so two cells can share a bucket. That is safe in one
  // direction only, and this is the safe one: a bucket may hold seats that are
  // not neighbours — the Manhattan test below rejects them — but it can never
  // miss a seat that is, because every seat is filed under its own cell's key.
  const cellKey = (col: number, row: number): number => col * 73_856_093 + row;
  const byCell = new Map<number, number[]>();
  for (let i = 0; i < n; i += 1) {
    const key = cellKey(positions[i]!.col, positions[i]!.row);
    const bucket = byCell.get(key);
    if (bucket) bucket.push(i);
    else byCell.set(key, [i]);
  }

  const span = Math.ceil(radius);
  const unionWithCell = (i: number, col: number, row: number): void => {
    const bucket = byCell.get(cellKey(col, row));
    if (!bucket) return;
    for (const j of bucket) {
      if (j <= i) continue;
      if (manhattan(positions[i]!, positions[j]!) <= radius) union(i, j);
    }
  };

  for (let i = 0; i < n; i += 1) {
    const p = positions[i]!;
    for (let dc = -span; dc <= span; dc += 1) {
      for (let dr = -span; dr <= span; dr += 1) unionWithCell(i, p.col + dc, p.row + dr);
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
