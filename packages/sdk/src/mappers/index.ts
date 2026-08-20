export type { DataMapper, DiagramMappers, MapperContext, MapResult } from './types.js';
export { runMapper, composeMappers, identityMapper } from './types.js';
export {
  flatRowsToDiagram,
  mergeDiagramData,
  normalizeDiagram,
  type FlatDiagramRow,
} from './flatToDiagram.js';
