import type { DiagramData } from '../data/types.js';
import {
  buildSearchIndex,
  buildSearchIndexFromPositionRows,
  searchIndexToDTO,
  type PositionSearchRow,
  type SearchIndexDTO,
} from './searchIndex.js';

export const searchHandlerKeys = {
  buildSearchIndex: 'buildSearchIndex',
  buildSearchIndexPositions: 'buildSearchIndexPositions',
} as const;

export function handleBuildSearchIndex(data: DiagramData): SearchIndexDTO {
  return searchIndexToDTO(buildSearchIndex(data));
}

export function handleBuildSearchIndexPositions(rows: PositionSearchRow[]): SearchIndexDTO {
  return searchIndexToDTO(buildSearchIndexFromPositionRows(rows));
}
