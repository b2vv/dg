/**
 * Bounded top-k selection: keeps the `limit` smallest items by `compare`
 * without holding — or sorting — the whole match set.
 *
 * Search over a large diagram can match tens of thousands of entries while the
 * host shows fifty. Sorting everything costs O(N log N) collator comparisons;
 * a max-heap of size k costs O(N log k) and allocates k slots.
 */
export class TopKCollector<T> {
  private readonly heap: T[] = [];

  /** @param limit maximum kept items; `<= 0` keeps nothing. */
  constructor(
    private readonly limit: number,
    private readonly compare: (a: T, b: T) => number,
  ) {}

  get size(): number {
    return this.heap.length;
  }

  push(item: T): void {
    if (this.limit <= 0) return;
    if (this.heap.length < this.limit) {
      this.heap.push(item);
      this.siftUp(this.heap.length - 1);
      return;
    }
    // Root holds the current worst kept item; replace it only on improvement.
    if (this.compare(item, this.heap[0]!) >= 0) return;
    this.heap[0] = item;
    this.siftDown(0);
  }

  /** Kept items in ascending `compare` order. */
  drain(): T[] {
    return [...this.heap].sort(this.compare);
  }

  private siftUp(start: number): void {
    let i = start;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.heap[i]!, this.heap[parent]!) <= 0) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  private siftDown(start: number): void {
    const n = this.heap.length;
    let i = start;
    for (;;) {
      const left = i * 2 + 1;
      const right = left + 1;
      let worst = i;
      if (left < n && this.compare(this.heap[left]!, this.heap[worst]!) > 0) worst = left;
      if (right < n && this.compare(this.heap[right]!, this.heap[worst]!) > 0) worst = right;
      if (worst === i) return;
      this.swap(i, worst);
      i = worst;
    }
  }

  private swap(a: number, b: number): void {
    const tmp = this.heap[a]!;
    this.heap[a] = this.heap[b]!;
    this.heap[b] = tmp;
  }
}
