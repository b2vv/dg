import type {
  DiagramGroup,
  DiagramOrganization,
  DiagramPerson,
  DiagramPosition,
} from '../data/types.js';
import type { ThemedMedia } from './types.js';

/** @deprecated Map host data to {@link ThemedMedia}; prefer `entity.media` on the model. */
export function resolveThemedMediaFromOrganization(org: DiagramOrganization): ThemedMedia | undefined {
  if (org.media) return org.media;
  const light = org.symbolUrlLight?.trim();
  const dark = org.symbolUrlDark?.trim();
  const fallback = org.symbolUrl?.trim();
  if (!light && !dark && !fallback) return undefined;
  const byTheme: Record<string, string> = {};
  if (light) byTheme.light = light;
  if (dark) byTheme.dark = dark;
  return { fallback, byTheme: Object.keys(byTheme).length > 0 ? byTheme : undefined };
}

/** @deprecated Prefer `person.media`. */
export function resolveThemedMediaFromPerson(person: DiagramPerson): ThemedMedia | undefined {
  if (person.media) return person.media;
  const fallback = person.photoUrl?.trim();
  return fallback ? { fallback } : undefined;
}

/** @deprecated Prefer `position.media`. */
export function resolveThemedMediaFromPosition(position: DiagramPosition): ThemedMedia | undefined {
  return position.media;
}

/** @deprecated Q29 — use org.media with entityType `group`. */
export function resolveThemedMediaFromGroup(_group: DiagramGroup): ThemedMedia | undefined {
  return undefined;
}
