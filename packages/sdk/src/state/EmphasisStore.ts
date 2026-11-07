export interface EmphasisState {
  readonly found: ReadonlySet<string> | null;
  readonly highlight: string | null;
}

/** Host-driven emphasis, independent of selection and pointer hover. */
export class EmphasisStore {
  private foundIds: ReadonlySet<string> | null = null;
  private highlightId: string | null = null;

  get state(): EmphasisState {
    return { found: this.found, highlight: this.highlight };
  }

  get found(): ReadonlySet<string> | null {
    return this.foundIds;
  }

  get highlight(): string | null {
    return this.highlightId;
  }

  setFound(ids: ReadonlySet<string> | null): void {
    this.foundIds = ids;
  }

  setHighlight(id: string | null): void {
    this.highlightId = id || null;
  }

  clearEmphasis(): void {
    this.foundIds = null;
    this.highlightId = null;
  }
}
