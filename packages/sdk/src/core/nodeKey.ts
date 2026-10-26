import type { NodeKind } from './types.js';

/** Typed box / promote key so person and position ids never collide. */
export function nodeEntityKey(kind: NodeKind, id: string): string {
  return `${kind}:${id}`;
}

export function parseNodeEntityKey(
  key: string,
): { kind: NodeKind; id: string } | null {
  const i = key.indexOf(':');
  if (i <= 0) return null;
  const kind = key.slice(0, i);
  const id = key.slice(i + 1);
  if (!id) return null;
  if (kind !== 'person' && kind !== 'position' && kind !== 'organization') return null;
  return { kind, id };
}
