import type {
  HierarchyNode,
  HierarchyNodeInput,
  NodeMetadata,
  NodeType,
  PositionStatus,
} from './types.js';

let idCounter = 0;

/** Внутрішня реалізація вузла ієрархії */
export class HierarchyNodeImpl implements HierarchyNode {
  readonly id: string;
  readonly label: string;
  readonly type: NodeType;
  readonly position?: string;
  readonly person?: string;
  readonly department?: string;
  readonly status: PositionStatus;
  readonly metadata: NodeMetadata;
  parent: HierarchyNodeImpl | null = null;
  readonly children: HierarchyNodeImpl[] = [];

  constructor(data: HierarchyNodeInput) {
    this.id = data.id;
    this.label = data.label;
    this.type = data.type ?? 'custom';
    this.position = data.position;
    this.person = data.person;
    this.department = data.department;
    this.status = data.status ?? (data.person ? 'filled' : 'vacant');
    this.metadata = { ...(data.metadata ?? {}) };
  }

  get depth(): number {
    let d = 0;
    let current: HierarchyNodeImpl | null = this.parent;
    while (current) {
      d++;
      current = current.parent;
    }
    return d;
  }

  get isLeaf(): boolean {
    return this.children.length === 0;
  }

  /** Додати дочірній вузол */
  addChild(child: HierarchyNodeImpl): void {
    child.parent = this;
    this.children.push(child);
  }

  /** Знайти вузол за id (DFS) */
  findById(id: string): HierarchyNodeImpl | null {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    return null;
  }

  /** Обійти дерево (pre-order) */
  traverse(callback: (node: HierarchyNodeImpl, depth: number) => void, depth = 0): void {
    callback(this, depth);
    for (const child of this.children) {
      child.traverse(callback, depth + 1);
    }
  }

  /** Кількість нащадків */
  descendantCount(): number {
    return this.children.reduce(
      (sum, child) => sum + 1 + child.descendantCount(),
      0,
    );
  }

  /** Максимальна глибина піддерева */
  maxDepth(): number {
    if (this.isLeaf) return 0;
    return 1 + Math.max(...this.children.map((c) => c.maxDepth()));
  }

  /** Перетворити на plain object для серіалізації */
  toInput(): HierarchyNodeInput {
    return {
      id: this.id,
      label: this.label,
      type: this.type,
      position: this.position,
      person: this.person,
      department: this.department,
      status: this.status,
      metadata: { ...this.metadata },
      children: this.children.map((c) => c.toInput()),
    };
  }

  /** Створити з plain object */
  static fromInput(input: HierarchyNodeInput): HierarchyNodeImpl {
    const node = new HierarchyNodeImpl(input);
    if (input.children) {
      for (const childInput of input.children) {
        const child = HierarchyNodeImpl.fromInput(childInput);
        node.addChild(child);
      }
    }
    return node;
  }
}

/** Генерувати унікальний id */
export function generateId(prefix = 'node'): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

/** Скинути лічильник id (для тестів) */
export function resetIdCounter(): void {
  idCounter = 0;
}
