import { HierarchyNodeImpl, generateId } from './HierarchyNode.js';
import {
  DuplicateNodeError,
  HierarchyError,
  NodeNotFoundError,
  type HierarchyNode,
  type HierarchyNodeInput,
  type NodeMetadata,
  type NodeType,
  type PositionStatus,
  type SerializedHierarchy,
} from './types.js';

type BuilderCallback = (builder: HierarchyBuilder) => void;

/**
 * Fluent API для побудови ієрархічної / штатно-посадової структури.
 */
export class HierarchyBuilder {
  private readonly data: HierarchyNodeInput;
  private readonly childBuilders: HierarchyBuilder[] = [];
  private readonly registry: Map<string, HierarchyBuilder>;

  private constructor(
    id: string,
    registry: Map<string, HierarchyBuilder>,
  ) {
    if (registry.has(id)) {
      throw new DuplicateNodeError(id);
    }
    this.registry = registry;
    this.registry.set(id, this);
    this.data = { id, label: id, children: [] };
  }

  /** Створити кореневий вузол */
  static create(id?: string): HierarchyBuilder {
    const registry = new Map<string, HierarchyBuilder>();
    return new HierarchyBuilder(id ?? generateId('root'), registry);
  }

  /** Відновити з серіалізованих даних */
  static fromInput(input: HierarchyNodeInput): HierarchyBuilder {
    const registry = new Map<string, HierarchyBuilder>();
    return HierarchyBuilder.fromInputRecursive(input, registry);
  }

  /** Відновити з JSON */
  static fromJSON(json: string): HierarchyBuilder {
    const parsed = JSON.parse(json) as SerializedHierarchy | HierarchyNodeInput;
    const input = 'root' in parsed && 'version' in parsed
      ? (parsed as SerializedHierarchy).root
      : (parsed as HierarchyNodeInput);
    return HierarchyBuilder.fromInput(input);
  }

  private static fromInputRecursive(
    input: HierarchyNodeInput,
    registry: Map<string, HierarchyBuilder>,
  ): HierarchyBuilder {
    const builder = new HierarchyBuilder(input.id, registry);
    builder.data.label = input.label;
    builder.data.type = input.type;
    builder.data.position = input.position;
    builder.data.person = input.person;
    builder.data.department = input.department;
    builder.data.status = input.status;
    builder.data.metadata = input.metadata ? { ...input.metadata } : undefined;

    if (input.children) {
      for (const childInput of input.children) {
        const childBuilder = HierarchyBuilder.fromInputRecursive(childInput, registry);
        builder.childBuilders.push(childBuilder);
      }
    }
    return builder;
  }

  label(value: string): this {
    this.data.label = value;
    return this;
  }

  type(value: NodeType): this {
    this.data.type = value;
    return this;
  }

  position(value: string): this {
    this.data.position = value;
    return this;
  }

  person(value: string): this {
    this.data.person = value;
    if (!this.data.status) {
      this.data.status = 'filled';
    }
    return this;
  }

  department(value: string): this {
    this.data.department = value;
    return this;
  }

  status(value: PositionStatus): this {
    this.data.status = value;
    return this;
  }

  meta(key: string, value: string | number | boolean | null): this {
    if (!this.data.metadata) {
      this.data.metadata = {};
    }
    this.data.metadata[key] = value;
    return this;
  }

  metadata(value: NodeMetadata): this {
    this.data.metadata = { ...this.data.metadata, ...value };
    return this;
  }

  child(id: string, configure?: BuilderCallback): this {
    const childBuilder = new HierarchyBuilder(id, this.registry);
    configure?.(childBuilder);
    this.childBuilders.push(childBuilder);
    return this;
  }

  children(items: Array<{ id: string; configure?: BuilderCallback }>): this {
    for (const item of items) {
      this.child(item.id, item.configure);
    }
    return this;
  }

  find(id: string): HierarchyBuilder {
    const found = this.registry.get(id);
    if (!found) {
      throw new NodeNotFoundError(id);
    }
    return found;
  }

  moveTo(nodeId: string, newParentId: string): this {
    if (nodeId === newParentId) {
      throw new HierarchyError('Вузол не може бути батьком самому собі');
    }
    const nodeBuilder = this.find(nodeId);
    const newParentBuilder = this.find(newParentId);

    let ancestor: HierarchyBuilder | undefined = newParentBuilder;
    while (ancestor) {
      if (ancestor === nodeBuilder) {
        throw new HierarchyError('Переміщення створить циклічну залежність');
      }
      ancestor = ancestor.findParent();
    }

    const currentParent = nodeBuilder.findParent();
    if (currentParent) {
      const idx = currentParent.childBuilders.indexOf(nodeBuilder);
      if (idx >= 0) currentParent.childBuilders.splice(idx, 1);
    } else if (nodeBuilder !== this) {
      throw new HierarchyError('Кореневий вузол не можна перемістити');
    }

    newParentBuilder.childBuilders.push(nodeBuilder);
    return this;
  }

  private findParent(): HierarchyBuilder | undefined {
    for (const [, builder] of this.registry) {
      if (builder.childBuilders.includes(this)) {
        return builder;
      }
    }
    return undefined;
  }

  build(): HierarchyNode {
    return this.buildNode();
  }

  private buildNode(): HierarchyNodeImpl {
    const node = new HierarchyNodeImpl({ ...this.data, children: undefined });
    for (const childBuilder of this.childBuilders) {
      node.addChild(childBuilder.buildNode());
    }
    return node;
  }

  toJSON(): SerializedHierarchy {
    return {
      version: '1.0.0',
      root: this.buildNode().toInput(),
    };
  }

  serialize(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}

/** Побудова з плоского списку (id + parentId) */
export function buildFromFlat(
  items: Array<{
    id: string;
    parentId?: string | null;
    label: string;
    type?: NodeType;
    position?: string;
    person?: string;
    department?: string;
    status?: PositionStatus;
    metadata?: NodeMetadata;
  }>,
): HierarchyNode {
  const roots = items.filter((i) => !i.parentId);
  if (roots.length !== 1) {
    throw new HierarchyError(
      `Очікується рівно один кореневий вузол, знайдено: ${roots.length}`,
    );
  }

  const builder = HierarchyBuilder.create(roots[0].id);
  applyFlatItem(builder, roots[0]);

  const builderMap = new Map<string, HierarchyBuilder>();
  builderMap.set(roots[0].id, builder);

  const queue = [roots[0].id];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const parentBuilder = builderMap.get(parentId)!;
    const children = items.filter((i) => i.parentId === parentId);

    for (const child of children) {
      const childBuilder = parentBuilder.child(child.id, (b) => applyFlatItem(b, child));
      builderMap.set(child.id, childBuilder);
      queue.push(child.id);
    }
  }

  const connected = new Set(builderMap.keys());
  const orphans = items.filter((i) => !connected.has(i.id));
  if (orphans.length > 0) {
    throw new HierarchyError(
      `Знайдено вузли без зв'язку з коренем: ${orphans.map((o) => o.id).join(', ')}`,
    );
  }

  return builder.build();
}

function applyFlatItem(
  b: HierarchyBuilder,
  item: {
    label: string;
    type?: NodeType;
    position?: string;
    person?: string;
    department?: string;
    status?: PositionStatus;
    metadata?: NodeMetadata;
  },
): void {
  b.label(item.label);
  if (item.type) b.type(item.type);
  if (item.position) b.position(item.position);
  if (item.person) b.person(item.person);
  if (item.department) b.department(item.department);
  if (item.status) b.status(item.status);
  if (item.metadata) b.metadata(item.metadata);
}
