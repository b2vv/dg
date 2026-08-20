import { createWorkerMessageHandler, type MapperRegistry } from './bridge.js';
import { flatRowsToDiagram, normalizeDiagram } from '../mappers/flatToDiagram.js';

/** Реєстр mapper keys для worker — розширюйте custom mappers host-додатком */
const defaultRegistry: MapperRegistry = {
  'flatRowsToDiagram': (input) => flatRowsToDiagram(input as Parameters<typeof flatRowsToDiagram>[0]),
  'normalizeDiagram': (input) => normalizeDiagram(input as Parameters<typeof normalizeDiagram>[0]),
};

createWorkerMessageHandler(defaultRegistry);

export { defaultRegistry };
