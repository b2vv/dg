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

/**
 * Stable muted fill for avatar discs when no photo is shown.
 * Avoids a single slate-gray (or bright purple) for every person.
 */
export function avatarColorFromName(fullName: string | undefined | null): number {
  const raw = (fullName ?? '').trim();
  const key = !raw || raw === '—' ? '?' : raw;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const palette = [
    0x3d5a6c, // slate blue-gray
    0x4a6741, // moss
    0x6b5344, // warm brown
    0x2f5d62, // teal slate
    0x4a5568, // cool gray
    0x6b4f3a, // copper brown
    0x3f5f4a, // forest
    0x5a4d63, // deep mauve (muted, not bright purple)
  ];
  return palette[Math.abs(h) % palette.length]!;
}
