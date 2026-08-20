import { createWorkerMessageHandler, type MapperRegistry } from './bridge.js';
import { flatRowsToDiagram, normalizeDiagram } from '../mappers/flatToDiagram.js';
import { dispatchComputeHandler, computeHandlerKeys } from './compute-handlers.js';
import {
  handleBuildSearchIndex,
  handleBuildSearchIndexPositions,
  searchHandlerKeys,
} from '../interaction/searchHandlers.js';
import type { DiagramData } from '../data/types.js';
import type { PositionSearchRow } from '../interaction/searchIndex.js';

/** Реєстр mapper + WASM compute keys для worker */
const defaultRegistry: MapperRegistry = {
  flatRowsToDiagram: (input) =>
    flatRowsToDiagram(input as Parameters<typeof flatRowsToDiagram>[0]),
  normalizeDiagram: (input) =>
    normalizeDiagram(input as Parameters<typeof normalizeDiagram>[0]),
  [computeHandlerKeys.computeDeptContour]: (input) =>
    dispatchComputeHandler(computeHandlerKeys.computeDeptContour, input),
  [computeHandlerKeys.computeAllContours]: (input) =>
    dispatchComputeHandler(computeHandlerKeys.computeAllContours, input),
  [computeHandlerKeys.computeLayout]: (input) =>
    dispatchComputeHandler(computeHandlerKeys.computeLayout, input),
  [computeHandlerKeys.buildFromFlat]: (input) =>
    dispatchComputeHandler(computeHandlerKeys.buildFromFlat, input),
  [computeHandlerKeys.computeOrgRowTreeLayout]: (input) =>
    dispatchComputeHandler(computeHandlerKeys.computeOrgRowTreeLayout, input),
  [searchHandlerKeys.buildSearchIndex]: (input) =>
    handleBuildSearchIndex(input as DiagramData),
  [searchHandlerKeys.buildSearchIndexPositions]: (input) =>
    handleBuildSearchIndexPositions(input as PositionSearchRow[]),
};

createWorkerMessageHandler(defaultRegistry);

export { defaultRegistry };
