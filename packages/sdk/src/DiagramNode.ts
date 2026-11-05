import type { NodeRef } from './core/types.js';
import type { DiagramOrganization, DiagramPerson, DiagramPosition } from './data/types.js';

/** Live accessor for one entity; getData copies only its top-level fields. */
export interface DiagramNode {
  readonly ref: Readonly<NodeRef>;
  getData(): DiagramPosition | DiagramOrganization | DiagramPerson | null;
  getState(): { selected: boolean; hovered: boolean; expanded: boolean; collapsed: boolean };
}
