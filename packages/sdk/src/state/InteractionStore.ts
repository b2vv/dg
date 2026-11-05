import type { NodeRef } from '../core/index.js';
import type { InteractionState } from '../interaction/interactionState.js';
import { sameNodeRef, type SelectionPointerMods } from '../interaction/selection.js';
import { SelectionStore } from './SelectionStore.js';

type InteractionListener = (state: InteractionState) => void;

/** Composes persistent selection with transient hover, without data or renderer coupling. */
export class InteractionStore {
  private readonly selection: SelectionStore;
  private hovered: NodeRef | null = null;
  private readonly listeners = new Set<{ callback: InteractionListener }>();
  private readonly warnedListeners = new WeakSet<InteractionListener>();

  constructor(opts?: { onSelectionChange?: (selected: readonly NodeRef[]) => void }) {
    this.selection = new SelectionStore((selected) => {
      this.emit();
      opts?.onSelectionChange?.(selected);
    });
  }

  get state(): InteractionState {
    return { selected: this.list, primary: this.primary, hovered: this.hovered };
  }

  get list(): readonly NodeRef[] {
    return this.selection.list;
  }

  get primary(): NodeRef | null {
    return this.selection.primary;
  }

  replace(next: NodeRef | null): boolean {
    return this.selection.replace(next);
  }

  replaceMany(next: readonly NodeRef[]): boolean {
    return this.selection.replaceMany(next);
  }

  toggle(node: NodeRef): boolean {
    return this.selection.toggle(node);
  }

  clear(): boolean {
    return this.selection.clear();
  }

  handlePointerSelect(node: NodeRef, mods?: SelectionPointerMods): boolean {
    return this.selection.handlePointerSelect(node, mods);
  }

  setHovered(next: NodeRef | null): boolean {
    if (this.hovered === next || sameNodeRef(this.hovered, next)) return false;
    this.hovered = next;
    this.emit();
    return true;
  }

  reconcile(isPresent: (ref: NodeRef) => boolean): void {
    if (this.hovered !== null && !isPresent(this.hovered)) this.setHovered(null);
  }

  subscribe(callback: InteractionListener): () => void {
    const entry = { callback };
    this.listeners.add(entry);
    return () => { this.listeners.delete(entry); };
  }

  private emit(): void {
    const state = this.state;
    for (const { callback } of [...this.listeners]) {
      try {
        callback(state);
      } catch (error) {
        if (!this.warnedListeners.has(callback)) {
          this.warnedListeners.add(callback);
          console.warn('InteractionStore: subscriber threw', error);
        }
      }
    }
  }
}
