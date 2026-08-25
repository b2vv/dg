/**
 * Barrel for the mockup fixtures — the demo tabs, the node-compare gallery and
 * the fixture tests all import from here.
 */
export { brandMarkSymbol, fullBleedOrgSymbol } from './mockupSymbols.js';
export {
  FIGMA_SEAT,
  FIGMA_ORG_LAYOUT,
  FIGMA_STAFF_LAYOUT,
  MAGNETIC_STAFF_LAYOUT,
  MAGNETIC_CELL,
  FLOOD_CELL,
  FLOOD_STAFF_LAYOUT,
} from './mockupLayouts.js';
export { buildMockupOrgsFigmaData, buildMockupOrgsGojsData } from './mockupOrgs.js';
export {
  buildMockupStaffFigmaData,
  buildMockupStaffMagneticData,
  buildMockupStaffFloodData,
  buildMockupStaffGojsData,
  withLooseSeat,
} from './mockupStaff.js';
export {
  MOCKUP_FIGMA_STYLES,
  MOCKUP_MAGNETIC_STYLES,
  MOCKUP_GOJS_STYLES,
  MOCKUP_DARK_STYLES,
} from './mockupStyles.js';

import { buildMockupOrgsFigmaData } from './mockupOrgs.js';
import { buildMockupStaffFigmaData } from './mockupStaff.js';

/** @deprecated Use buildMockupOrgsFigmaData */
export const buildMockupOrgsData = buildMockupOrgsFigmaData;
/** @deprecated Use buildMockupStaffFigmaData */
export const buildMockupStaffData = buildMockupStaffFigmaData;
