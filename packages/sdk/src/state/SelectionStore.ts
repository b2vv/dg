import type { NodeRef } from '../interaction/types.js';
import {
  isSelectionToggleModifier,
  replaceSelection,
  sameSelectionSet,
  selectMany,
  toggleInSelection,
  type SelectionPointerMods,
} from '../interaction/selection.js';

/**
 * Selection state for {@link OrgHierarchyDiagram} (T76 / D4).
 * Pure set ops stay in `interaction/selection.ts`; this holds the live list.
 */
export class SelectionStore {
  private selections: NodeRef[] = [];

  constructor(private readonly onChange?: (selections: readonly NodeRef[]) => void) {}

  /** Full multi-select set (order = selection order). */
  get list(): readonly NodeRef[] {
    return this.selections;
  }

  /** Primary / first selected node. */
  get primary(): NodeRef | null {
    return this.selections[0] ?? null;
  }

  /** Replace set with one node (or clear). Returns whether the set changed. */
  replace(next: NodeRef | null): boolean {
    const result = replaceSelection(this.selections, next);
    if (!result.changed) return false;
    this.selections = result.selections;
    this.onChange?.(this.selections);
    return true;
  }

  /** Replace set with many nodes (deduped). */
  replaceMany(next: readonly NodeRef[]): boolean {
    const selections = selectMany(next);
    if (sameSelectionSet(this.selections, selections)) return false;
    this.selections = selections;
    this.onChange?.(this.selections);
    return true;
  }

  /** Toggle membership of one node. */
  toggle(node: NodeRef): boolean {
    const result = toggleInSelection(this.selections, node);
    if (!result.changed) return false;
    this.selections = result.selections;
    this.onChange?.(this.selections);
    return true;
  }

  /** Clear the set. */
  clear(): boolean {
    return this.replace(null);
  }

  /** Click / pointer: toggle modifiers → toggle; else replace. */
  handlePointerSelect(node: NodeRef, mods?: SelectionPointerMods): boolean {
    if (mods && isSelectionToggleModifier(mods)) {
      return this.toggle(node);
    }
    return this.replace(node);
  }
}
