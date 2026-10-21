/**
 * ⚠️ THROWAWAY probe scaffold — рішення рушія ШПС-роутера (plan `work/reports/shps-routing/plan.md`).
 * НЕ публічний API, НЕ в барелі. Знімається після plan-GATE (переможець промотується в роутер).
 *
 * Симетричний probe-контракт (SPIL): обидва рушії (A конструктив, B ELK) приймають ТОЙ САМИЙ
 * `RouteInput` і віддають ТУ САМУ `RouteOutput`; весь вимір — над виходом. Так ELK не валідує A.
 */

export interface ProbePoint {
  x: number;
  y: number;
}

export interface ProbeBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Вхідна посада схеми §10.1. parentId=null → корінь дерева підпорядкування. */
export interface ProbePositionInput {
  id: string;
  parentId: string | null;
  deptId: string | null;
  /** Порядок сусідів зліва направо (req §2). */
  order: number;
}

/** Вхідний департамент (routing-input §2). parentPositionId=null → кореневий департамент. */
export interface ProbeDepartmentInput {
  id: string;
  parentPositionId: string | null;
  order: number;
}

export interface RouteInput {
  positions: ProbePositionInput[];
  departments: ProbeDepartmentInput[];
  /** Репрезентативний розмір картки (dg default nodeWidth/nodeHeight). */
  cardWidth: number;
  cardHeight: number;
}

export type ProbeEdgeKind = 'admin' | 'inter-dept' | 'lead-org';

export interface RouteEdge {
  fromId: string;
  toId: string;
  kind: ProbeEdgeKind;
  /** Орто-полілінія (кути 90°). */
  points: ProbePoint[];
  /** §12: якщо це залишковий перетин, він МУСИТЬ бути позначений (чесний маркер). */
  marked?: boolean;
}

export interface RouteOutput {
  nodes: ProbeBox[];
  deptFrames: ProbeBox[];
  edges: RouteEdge[];
}

/** Рушій проби: чиста детермінована функція входу. */
export type ProbeEngine = (input: RouteInput) => RouteOutput;
