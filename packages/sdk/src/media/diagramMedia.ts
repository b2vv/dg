import type { DiagramData, DiagramOrganization } from '../data/types.js';
import type { NodeRef } from '../interaction/types.js';
import { resolvePersonPhotoUrl } from '../render/PersonNode.js';
import { getOrgSymbolUrl, resolveTheme } from '../render/theme.js';
import type { LodLevel } from '../render/lod.js';
import type { ThemeMode } from '../render/types.js';
import {
  resolveThemedMediaFromOrganization,
  resolveThemedMediaFromPerson,
} from './index.js';
import type { ThemedMedia } from './types.js';

/**
 * Which media the diagram binds, kept away from the facade (T106).
 *
 * These three read data and answer a question; none of them touches the host,
 * the renderer or the camera. Living on `OrgHierarchyDiagram` they were three
 * private methods nothing could reach — including the cycle guard below, which
 * had no test of its own despite guarding host data.
 *
 * Extracted as functions the callers invoke **directly**, not behind thin
 * methods on the class: a wrapper that only forwards `this.data` would be the
 * pass-through the audit asks to remove, and would leave the facade the same
 * length it was.
 */

/**
 * Organisations whose whole ancestor chain is open.
 *
 * `collapsed` on an organisation hides its **children**, not itself, so an org
 * is open when no ancestor above it is collapsed. The guard set matters:
 * `parentOrgId` is host data and a cycle in it would otherwise spin forever
 * (T97 row 10).
 */
export function expandedOrgIds(organizations: readonly DiagramOrganization[]): Set<string> {
  const byId = new Map(organizations.map((o) => [o.id, o]));
  const open = new Set<string>();
  for (const org of organizations) {
    let cursor = org.parentOrgId;
    let visible = true;
    const guard = new Set<string>();
    while (cursor && !guard.has(cursor)) {
      guard.add(cursor);
      const parent = byId.get(cursor);
      // A parent that does not exist makes this org a root rather than an
      // orphan to hide — the reading `revealOrgPath` already takes.
      if (!parent) break;
      if (parent.collapsed) {
        visible = false;
        break;
      }
      cursor = parent.parentOrgId;
    }
    if (visible) open.add(org.id);
  }
  return open;
}

/** URLs currently bound to a node (for `diagram.media.refresh`). */
export function mediaUrlsForRef(input: {
  data: DiagramData;
  themeMode: ThemeMode;
  ref: NodeRef;
}): string[] {
  const { data, themeMode, ref } = input;
  const out = new Set<string>();
  const theme = resolveTheme(themeMode);
  if (ref.kind === 'organization') {
    const org = data.organizations.find((o) => o.id === ref.id);
    if (!org) return [];
    const media = org.media ?? resolveThemedMediaFromOrganization(org);
    if (media?.fallback) out.add(media.fallback.trim());
    if (media?.byTheme) {
      for (const u of Object.values(media.byTheme)) {
        if (u?.trim()) out.add(u.trim());
      }
    }
    const active = getOrgSymbolUrl(org, theme);
    if (active?.trim()) out.add(active.trim());
    return [...out];
  }
  const personId = ref.personId ?? (ref.kind === 'person' ? ref.id : undefined);
  const person = personId ? data.persons.find((p) => p.id === personId) : undefined;
  const photo = resolvePersonPhotoUrl(person);
  if (photo) out.add(photo);
  return [...out];
}

/** What {@link prefetchOpenMedia} needs from the media service. */
export interface MediaPrefetcher {
  hasPrefetchThemes: boolean;
  prefetch(media: ThemedMedia | undefined, revision?: string | number): void;
}

/**
 * M4: preload alternate theme keys when the host opts in via
 * `prefetchMediaThemeKeys`.
 *
 * Only for what is **open**. This walked the whole dataset — every organisation
 * and every person, collapsed branches included — which is the one place that
 * ignored «images load for expanded organisations» (T97 §В3).
 *
 * Accepted consequence: prefetch exists to make a theme switch instant, so a
 * branch opened after the prefetch will flicker on the next switch. Not
 * fetching what nobody opened wins over that.
 */
export function prefetchOpenMedia(input: {
  data: DiagramData;
  lodLevel: LodLevel;
  service: MediaPrefetcher | null;
}): void {
  const { data, lodLevel, service } = input;
  if (!service?.hasPrefetchThemes) return;
  // The two gates answer different questions and do not overlap: below `farMax`
  // a card draws no image at all (M6), so there is nothing worth preloading —
  // the LOD decides *whether any* image is wanted, expansion decides *which*
  // ones may load.
  if (lodLevel === 'far') return;

  const open = expandedOrgIds(data.organizations);
  for (const org of data.organizations) {
    if (!open.has(org.id)) continue;
    const media = org.media ?? resolveThemedMediaFromOrganization(org);
    service.prefetch(media, media?.revision);
  }

  // A person is reachable only through a position, so an org nobody opened
  // takes its people with it.
  const openPeople = new Set<string>();
  for (const position of data.positions) {
    if (position.personId && open.has(position.organizationId)) {
      openPeople.add(position.personId);
    }
  }
  for (const person of data.persons) {
    if (!openPeople.has(person.id)) continue;
    const media = person.media ?? resolveThemedMediaFromPerson(person);
    service.prefetch(media, media?.revision);
  }
}
