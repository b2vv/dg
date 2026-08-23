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

/** @deprecated Prefer `group.media`. */
export function resolveThemedMediaFromGroup(group: DiagramGroup): ThemedMedia | undefined {
  if (group.media) return group.media;
  const fallback = group.emblemUrl?.trim();
  return fallback ? { fallback } : undefined;
}

/** @deprecated Use entity-specific resolver or read `media` directly. */
export function resolveThemedMediaFromLegacy(
  source: DiagramOrganization | DiagramPerson | DiagramPosition | DiagramGroup,
): ThemedMedia | undefined {
  if ('symbolUrl' in source || 'symbolUrlLight' in source) {
    return resolveThemedMediaFromOrganization(source as DiagramOrganization);
  }
  if ('photoUrl' in source && !('title' in source)) {
    return resolveThemedMediaFromPerson(source as DiagramPerson);
  }
  if ('title' in source && 'organizationId' in source) {
    return resolveThemedMediaFromPosition(source as DiagramPosition);
  }
  return resolveThemedMediaFromGroup(source as DiagramGroup);
}
