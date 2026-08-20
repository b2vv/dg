import type { DiagramData } from '../data/types.js';

/**
 * Мапер: сирий тип host → канонічна DiagramData.
 * @example
 * const mapper: DataMapper<MyRow[], DiagramData> = (rows) => ({ ... });
 */
export type DataMapper<TInput, TOutput = DiagramData> = (
  input: TInput,
  ctx?: MapperContext,
) => TOutput | Promise<TOutput>;

export interface MapperContext {
  /** Поточна тема (для symbol URL) */
  theme?: 'light' | 'dark' | 'auto';
  /** Довільні опції від host */
  options?: Record<string, unknown>;
}

/** Набір маперів для різних етапів */
export interface DiagramMappers<TRaw = unknown> {
  /** TRaw → DiagramData */
  toDiagram?: DataMapper<TRaw, DiagramData>;
  /** DiagramData → DiagramData (нормалізація, dedupe) */
  normalize?: DataMapper<DiagramData, DiagramData>;
  /** Incremental: новий chunk → patch */
  append?: DataMapper<TRaw, Partial<DiagramData>>;
}

export interface MapResult<T> {
  data: T;
  durationMs: number;
  warnings: string[];
}

/** Синхронний map з таймінгом */
export async function runMapper<TIn, TOut>(
  mapper: DataMapper<TIn, TOut>,
  input: TIn,
  ctx?: MapperContext,
): Promise<MapResult<TOut>> {
  const start = performance.now();
  const warnings: string[] = [];
  const data = await mapper(input, ctx);
  return {
    data,
    durationMs: performance.now() - start,
    warnings,
  };
}

/** Композиція маперів: a → b → c */
export function composeMappers<A, B, C>(
  ab: DataMapper<A, B>,
  bc: DataMapper<B, C>,
): DataMapper<A, C> {
  return async (input, ctx) => bc(await ab(input, ctx), ctx);
}

/** Identity mapper для DiagramData */
export const identityMapper: DataMapper<DiagramData, DiagramData> = (d) => d;
