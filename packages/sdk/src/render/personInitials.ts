/** Initials from a person display name (Latin / Cyrillic). */
export function personInitials(fullName: string | undefined | null): string {
  const raw = (fullName ?? '').trim();
  if (!raw || raw === '—') return '?';
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const w = parts[0]!;
    return Array.from(w).slice(0, 2).join('').toUpperCase();
  }
  const a = Array.from(parts[0]!)[0];
  const b = Array.from(parts[parts.length - 1]!)[0];
  return `${a ?? ''}${b ?? ''}`.toUpperCase() || '?';
}
