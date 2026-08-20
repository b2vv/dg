import type { HierarchyNodeImpl } from './HierarchyNode.js';
import {
  DEFAULT_LAYOUT_OPTIONS,
  type HierarchyNode,
  type LayoutDirection,
  type LayoutEdge,
  type LayoutNode,
  type LayoutOptions,
  type LayoutResult,
} from './types.js';

interface InternalLayoutNode {
  node: HierarchyNodeImpl;
  x: number;
  y: number;
  mod: number;
  prelim: number;
  shift: number;
  change: number;
  ancestor: InternalLayoutNode;
  number: number;
  parent: InternalLayoutNode | null;
  children: InternalLayoutNode[];
  thread: InternalLayoutNode | null;
}

/**
 * Алгоритм розкладки дерева (модифікований Reingold–Tilford)
 * для вертикальних та горизонтальних org-chart діаграм.
 */
export class TreeLayout {
  private readonly options: Required<Omit<LayoutOptions, 'direction'>> & {
    direction: LayoutDirection;
  };

  constructor(options: LayoutOptions = {}) {
    this.options = {
      direction: options.direction ?? 'vertical',
      nodeWidth: options.nodeWidth ?? DEFAULT_LAYOUT_OPTIONS.nodeWidth,
      nodeHeight: options.nodeHeight ?? DEFAULT_LAYOUT_OPTIONS.nodeHeight,
      horizontalGap: options.horizontalGap ?? DEFAULT_LAYOUT_OPTIONS.horizontalGap,
      verticalGap: options.verticalGap ?? DEFAULT_LAYOUT_OPTIONS.verticalGap,
      margin: options.margin ?? DEFAULT_LAYOUT_OPTIONS.margin,
    };
  }

  /** Розрахувати координати для дерева */
  layout(root: HierarchyNode): LayoutResult {
    const impl = root as HierarchyNodeImpl;
    const internalRoot = this.buildInternalTree(impl, null, 0);
    this.firstWalk(internalRoot);
    this.secondWalk(internalRoot, 0, 0);

    const isHorizontal = this.options.direction === 'horizontal';
    const { nodeWidth, nodeHeight, horizontalGap, verticalGap, margin } = this.options;

    const layoutNodes: LayoutNode[] = [];
    this.collectNodes(internalRoot, layoutNodes, isHorizontal, nodeWidth, nodeHeight, horizontalGap, verticalGap);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const n of layoutNodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }

    const offsetX = margin - minX;
    const offsetY = margin - minY;

    const normalizedNodes: LayoutNode[] = layoutNodes.map((n) => ({
      ...n,
      x: n.x + offsetX,
      y: n.y + offsetY,
    }));

    const nodeMap = new Map(normalizedNodes.map((n) => [n.id, n]));
    const edges: LayoutEdge[] = [];

    for (const n of normalizedNodes) {
      if (n.parent) {
        const parent = nodeMap.get(n.parent.id);
        if (parent) {
          edges.push({
            from: parent,
            to: n,
            path: this.buildEdgePath(parent, n, isHorizontal),
          });
        }
      }
    }

    return {
      nodes: normalizedNodes,
      edges,
      width: maxX - minX + margin * 2,
      height: maxY - minY + margin * 2,
      direction: this.options.direction,
    };
  }

  private buildInternalTree(
    node: HierarchyNodeImpl,
    parent: InternalLayoutNode | null,
    index: number,
  ): InternalLayoutNode {
    const internal: InternalLayoutNode = {
      node,
      x: 0,
      y: 0,
      mod: 0,
      prelim: 0,
      shift: 0,
      change: 0,
      ancestor: null as unknown as InternalLayoutNode,
      number: index,
      parent,
      children: [],
      thread: null,
    };
    internal.ancestor = internal;
    internal.children = node.children.map((child, i) =>
      this.buildInternalTree(child as HierarchyNodeImpl, internal, i),
    );
    return internal;
  }

  private firstWalk(v: InternalLayoutNode): void {
    if (v.children.length === 0) {
      const leftSibling = this.getLeftSibling(v);
      v.prelim = leftSibling ? leftSibling.prelim + this.siblingSeparation() : 0;
    } else {
      let defaultAncestor = v.children[0];
      for (const child of v.children) {
        this.firstWalk(child);
        defaultAncestor = this.apportion(child, defaultAncestor);
      }
      this.executeShifts(v);

      const midpoint =
        (v.children[0].prelim + v.children[v.children.length - 1].prelim) / 2;
      const leftSibling = this.getLeftSibling(v);

      if (leftSibling) {
        v.prelim = leftSibling.prelim + this.siblingSeparation();
        v.mod = v.prelim - midpoint;
      } else {
        v.prelim = midpoint;
      }
    }
  }

  private secondWalk(v: InternalLayoutNode, modSum: number, depth: number): void {
    v.x = v.prelim + modSum;
    v.y = depth;
    for (const child of v.children) {
      this.secondWalk(child, modSum + v.mod, depth + 1);
    }
  }

  private apportion(v: InternalLayoutNode, defaultAncestor: InternalLayoutNode): InternalLayoutNode {
    const leftSibling = this.getLeftSibling(v);
    if (!leftSibling) return defaultAncestor;

    let vir: InternalLayoutNode | null = v;
    let vor: InternalLayoutNode | null = v;
    let vil: InternalLayoutNode | null = leftSibling;
    let vol: InternalLayoutNode = v.parent!.children[0];

    let sir = vir.mod;
    let sor = vor.mod;
    let sil = vil.mod;
    let sol = vol.mod;

    let nextRight = this.nextRight(vil);
    let nextLeft = this.nextLeft(vir);

    while (nextRight && nextLeft) {
      vil = nextRight;
      vir = nextLeft;
      vol = this.nextLeft(vol)!;
      vor = this.nextRight(vor)!;

      vor!.ancestor = v;
      const shift = (vil.prelim + sil) - (vir.prelim + sir) + this.subtreeSeparation();
      if (shift > 0) {
        this.moveSubtree(this.getAncestor(vil, v, defaultAncestor), v, shift);
        sir += shift;
        sor += shift;
      }
      sil += vil.mod;
      sir += vir.mod;
      sol += vol.mod;
      sor += vor!.mod;

      nextRight = this.nextRight(vil);
      nextLeft = this.nextLeft(vir);
    }

    if (nextRight && !this.nextRight(vor!)) {
      vor!.thread = nextRight;
      vor!.mod += sil - sor;
    }

    if (nextLeft && !this.nextLeft(vol)) {
      vol.thread = nextLeft;
      vol.mod += sir - sol;
      defaultAncestor = v;
    }

    return defaultAncestor;
  }

  private moveSubtree(wl: InternalLayoutNode, wr: InternalLayoutNode, shift: number): void {
    const subtrees = wr.number - wl.number;
    if (subtrees <= 0) return;
    wr.change -= shift / subtrees;
    wr.shift += shift;
    wl.change += shift / subtrees;
    wr.prelim += shift;
    wr.mod += shift;
  }

  private executeShifts(v: InternalLayoutNode): void {
    let shift = 0;
    let change = 0;
    for (let i = v.children.length - 1; i >= 0; i--) {
      const child = v.children[i];
      child.prelim += shift;
      child.mod += shift;
      change += child.change;
      shift += child.shift + change;
    }
  }

  private getAncestor(vil: InternalLayoutNode, v: InternalLayoutNode, defaultAncestor: InternalLayoutNode): InternalLayoutNode {
    return vil.ancestor.parent === v.parent ? vil.ancestor : defaultAncestor;
  }

  private getLeftSibling(v: InternalLayoutNode): InternalLayoutNode | null {
    if (!v.parent || v.number === 0) return null;
    return v.parent.children[v.number - 1];
  }

  private nextLeft(v: InternalLayoutNode | null): InternalLayoutNode | null {
    if (!v) return null;
    return v.children.length > 0 ? v.children[0] : v.thread;
  }

  private nextRight(v: InternalLayoutNode | null): InternalLayoutNode | null {
    if (!v) return null;
    return v.children.length > 0 ? v.children[v.children.length - 1] : v.thread;
  }

  private siblingSeparation(): number {
    const { nodeWidth, horizontalGap } = this.options;
    return nodeWidth + horizontalGap;
  }

  private subtreeSeparation(): number {
    return this.siblingSeparation();
  }

  private collectNodes(
    internal: InternalLayoutNode,
    result: LayoutNode[],
    isHorizontal: boolean,
    nodeWidth: number,
    nodeHeight: number,
    horizontalGap: number,
    verticalGap: number,
  ): void {
    const x = isHorizontal
      ? internal.y * (nodeWidth + horizontalGap)
      : internal.x * (nodeWidth + horizontalGap);
    const y = isHorizontal
      ? internal.x * (nodeHeight + verticalGap)
      : internal.y * (nodeHeight + verticalGap);

    result.push(
      Object.assign(internal.node, { x, y, width, height }) as LayoutNode,
    );

    for (const child of internal.children) {
      this.collectNodes(child, result, isHorizontal, nodeWidth, nodeHeight, horizontalGap, verticalGap);
    }
  }

  private buildEdgePath(from: LayoutNode, to: LayoutNode, isHorizontal: boolean): string {
    if (isHorizontal) {
      const x1 = from.x + from.width;
      const y1 = from.y + from.height / 2;
      const x2 = to.x;
      const y2 = to.y + to.height / 2;
      const midX = (x1 + x2) / 2;
      return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
    }

    const x1 = from.x + from.width / 2;
    const y1 = from.y + from.height;
    const x2 = to.x + to.width / 2;
    const y2 = to.y;
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`;
  }
}

/** Швидка функція розкладки */
export function computeLayout(root: HierarchyNode, options?: LayoutOptions): LayoutResult {
  return new TreeLayout(options).layout(root);
}
