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
