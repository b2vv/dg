import { emptyDiagramData, type DiagramData } from '../data/types.js';

/**
 * Diagram data holder for {@link OrgHierarchyDiagram} (T76 / D4).
 * Facade still owns mappers / search rebuild side-effects.
 */
export class DataStore {
  private data: DiagramData = emptyDiagramData();

  get snapshot(): DiagramData {
    return this.data;
  }

  /** Replace entire dataset. */
  replace(next: DiagramData): void {
    this.data = next;
  }

  /** In-place structural update (same object identity helpers may mutate). */
  update(fn: (current: DiagramData) => DiagramData): DiagramData {
    this.data = fn(this.data);
    return this.data;
  }
}
