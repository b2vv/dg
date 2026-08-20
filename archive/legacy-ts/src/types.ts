/** Тип вузла ієрархії */
export type NodeType = 'root' | 'department' | 'position' | 'person' | 'custom';

/** Статус посади у штатній структурі */
export type PositionStatus = 'filled' | 'vacant' | 'acting';

/** Метадані вузла — довільні ключ-значення */
export type NodeMetadata = Record<string, string | number | boolean | null>;

/** Вхідні дані для створення вузла */
export interface HierarchyNodeInput {
  id: string;
  label: string;
  type?: NodeType;
  position?: string;
  person?: string;
  department?: string;
  status?: PositionStatus;
  metadata?: NodeMetadata;
  children?: HierarchyNodeInput[];
}

/** Вузол ієрархії після побудови */
export interface HierarchyNode {
  readonly id: string;
  readonly label: string;
  readonly type: NodeType;
  readonly position?: string;
  readonly person?: string;
  readonly department?: string;
  readonly status: PositionStatus;
  readonly metadata: NodeMetadata;
  readonly parent: HierarchyNode | null;
  readonly children: readonly HierarchyNode[];
  readonly depth: number;
  readonly isLeaf: boolean;
  findById(id: string): HierarchyNode | null;
  traverse(callback: (node: HierarchyNode, depth: number) => void): void;
  descendantCount(): number;
  maxDepth(): number;
  toInput(): HierarchyNodeInput;
}

/** Напрямок розташування діаграми */
export type LayoutDirection = 'vertical' | 'horizontal';

/** Опції алгоритму розкладки */
export interface LayoutOptions {
  direction?: LayoutDirection;
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  margin?: number;
}

/** Вузол після розрахунку координат */
export interface LayoutNode extends HierarchyNode {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Результат розкладки дерева */
export interface LayoutResult {
  readonly nodes: readonly LayoutNode[];
  readonly edges: readonly LayoutEdge[];
  readonly width: number;
  readonly height: number;
  readonly direction: LayoutDirection;
}

/** Ребро між вузлами */
export interface LayoutEdge {
  readonly from: LayoutNode;
  readonly to: LayoutNode;
  readonly path: string;
}

/** Стилі вузла для рендерингу */
export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  textColor?: string;
  fontSize?: number;
  borderRadius?: number;
}

/** Стилі ребра */
export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
}

/** Опції SVG-рендерера */
export interface SvgRenderOptions extends LayoutOptions {
  nodeStyle?: NodeStyle | ((node: LayoutNode) => NodeStyle);
  edgeStyle?: EdgeStyle;
  showVacantBadge?: boolean;
  className?: string;
  background?: string;
}

/** Опції HTML-рендерера */
export interface HtmlRenderOptions extends LayoutOptions {
  nodeClassName?: string | ((node: LayoutNode) => string);
  containerClassName?: string;
  showVacantBadge?: boolean;
}

/** Результат серіалізації */
export interface SerializedHierarchy {
  root: HierarchyNodeInput;
  version: string;
}

/** Помилки бібліотеки */
export class HierarchyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HierarchyError';
  }
}

export class DuplicateNodeError extends HierarchyError {
  constructor(public readonly nodeId: string) {
    super(`Вузол з id "${nodeId}" вже існує в ієрархії`);
    this.name = 'DuplicateNodeError';
  }
}

export class NodeNotFoundError extends HierarchyError {
  constructor(public readonly nodeId: string) {
    super(`Вузол з id "${nodeId}" не знайдено`);
    this.name = 'NodeNotFoundError';
  }
}

/** Значення за замовчуванням */
export const DEFAULT_LAYOUT_OPTIONS: Required<Omit<LayoutOptions, 'direction'>> = {
  nodeWidth: 200,
  nodeHeight: 72,
  horizontalGap: 40,
  verticalGap: 60,
  margin: 24,
};

export const DEFAULT_NODE_STYLE: Required<NodeStyle> = {
  fill: '#ffffff',
  stroke: '#cbd5e1',
  strokeWidth: 1.5,
  textColor: '#1e293b',
  fontSize: 13,
  borderRadius: 8,
};

export const DEFAULT_EDGE_STYLE: Required<EdgeStyle> = {
  stroke: '#94a3b8',
  strokeWidth: 1.5,
};

/** Кольори за типом вузла */
export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  root: '#dbeafe',
  department: '#e0e7ff',
  position: '#f0fdf4',
  person: '#fef3c7',
  custom: '#f8fafc',
};

/** Кольори за статусом посади */
export const STATUS_COLORS: Record<PositionStatus, string> = {
  filled: '#22c55e',
  vacant: '#ef4444',
  acting: '#f59e0b',
};
