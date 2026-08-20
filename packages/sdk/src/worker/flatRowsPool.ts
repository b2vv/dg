import { emptyDiagramData } from '../data/types.js';
import type { DiagramData } from '../data/types.js';
import {
  flatRowsToDiagram,
  mergeDiagramData,
  normalizeDiagram,
  type FlatDiagramRow,
} from '../mappers/flatToDiagram.js';
import { createPooledArrayMapper, type PooledMapResult } from './mapArrayFacade.js';

/**
 * Facade: flat rows → DiagramData via auto chunked WorkerPool (or main fallback).
 *
 * @example
 * const { data } = await mapFlatRowsInPool(rows);
 */
export const mapFlatRowsInPool = createPooledArrayMapper<
  FlatDiagramRow,
  DiagramData,
  DiagramData
>({
  mapperKey: 'flatRowsToDiagram',
  mapChunk: (chunk) => flatRowsToDiagram(chunk),
  merge: async (parts) => {
    const merged = parts.reduce<DiagramData>(
      (acc, part) => mergeDiagramData(acc, part),
      emptyDiagramData(),
    );
    return normalizeDiagram(merged);
  },
});

export type FlatRowsPoolResult = PooledMapResult<DiagramData>;
