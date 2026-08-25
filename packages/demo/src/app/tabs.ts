import { defaultLodThresholds, type LodThresholds } from '@org-hierarchy/sdk';

export type DemoTab =
  | 'variant-b'
  | 'staff-tree'
  | 'mockup-orgs-figma'
  | 'mockup-orgs-gojs'
  | 'mockup-staff-figma'
  | 'mockup-staff-magnetic'
  | 'mockup-staff-flood'
  | 'mockup-staff-gojs'
  | 'staff-1m'
  | 'flat-orgs'
  | 'scale-100k'
  | 'mapper'
  | 'worker';

/**
 * One row per tab instead of a switch per question. `family` pins the theme the
 * mockup was approved in, `contourControls` enables the Padding / Smooth
 * sliders for the tabs whose departments are magnetic contours.
 */
export interface DemoTabMeta {
  label: string;
  family?: 'figma' | 'gojs';
  contourControls?: boolean;
}

export const TAB_META: Record<DemoTab, DemoTabMeta> = {
  'variant-b': { label: 'Variant B', contourControls: true },
  'staff-tree': { label: 'Staff tree' },
  'mockup-orgs-figma': { label: 'Orgs · Figma', family: 'figma' },
  'mockup-orgs-gojs': { label: 'Orgs · GoJS', family: 'gojs' },
  'mockup-staff-figma': { label: 'Staff · Figma', family: 'figma' },
  'mockup-staff-magnetic': { label: 'Staff · Magnetic', family: 'figma', contourControls: true },
  'mockup-staff-flood': { label: 'Staff · Flood', family: 'figma', contourControls: true },
  'mockup-staff-gojs': { label: 'Staff · GoJS', family: 'gojs', contourControls: true },
  'staff-1m': { label: 'Staff · 1M' },
  'flat-orgs': { label: 'Flat orgs' },
  'scale-100k': { label: '100k orgs' },
  mapper: { label: 'Mapper' },
  worker: { label: 'Worker' },
};

export function tabsInFamily(family: DemoTabMeta['family']): ReadonlySet<DemoTab> {
  return new Set(
    (Object.keys(TAB_META) as DemoTab[]).filter((tab) => TAB_META[tab].family === family),
  );
}

export const FIGMA_MOCKUP_TABS = tabsInFamily('figma');
export const GOJS_MOCKUP_TABS = tabsInFamily('gojs');
export const ALL_MOCKUP_TABS: ReadonlySet<DemoTab> = new Set([
  ...FIGMA_MOCKUP_TABS,
  ...GOJS_MOCKUP_TABS,
]);

/** Keep mockup cards at mid/near LOD — avoid fitView zoom-out to symbol-only far LOD (<0.45). */
export const MOCKUP_FIT_MIN_SCALE = 0.55;
/** fitView lands ~0.55–0.9; default midMax 1.2 kept cards in mid LOD — force near for mockup chrome. */
export const MOCKUP_LOD_THRESHOLDS: LodThresholds = {
  farMax: defaultLodThresholds.farMax,
  midMax: 0.5,
};

export interface ContourControls {
  paddingCells: number;
  smoothIterations: number;
}

/** Playwright hooks when `?e2e=1`. */
