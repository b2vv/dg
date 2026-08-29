import type { DiagramData, OrgHierarchyConfig } from '@org-hierarchy/sdk';
import type { FlatDiagramRow } from '@org-hierarchy/sdk';
import {
  flatRowsToDiagram,
  recommendWorkerPoolSize,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_VERTICAL_GAP,
  VARIANT_B_MAGNET_RADIUS,
} from '@org-hierarchy/sdk';
import { buildVariantBData } from '../scenarios/variantB.js';
import { buildStaffTreeData } from '../scenarios/staffTree.js';
import {
  buildMockupOrgsFigmaData,
  buildMockupOrgsGojsData,
  buildMockupStaffFigmaData,
  buildMockupStaffGojsData,
  buildMockupStaffFloodData,
  buildMockupStaffMagneticData,
  FIGMA_ORG_LAYOUT,
  FIGMA_STAFF_LAYOUT,
  FLOOD_CELL,
  FLOOD_STAFF_LAYOUT,
  MAGNETIC_CELL,
  MAGNETIC_STAFF_LAYOUT,
  MOCKUP_FIGMA_STYLES,
  MOCKUP_GOJS_STYLES,
  MOCKUP_MAGNETIC_STYLES,
} from '../scenarios/mockups.js';
import type { ScaleOrgsWindow } from '../scenarios/scaleOrgs.js';
import type { ScaleStaffWindow } from '../scenarios/scaleStaff.js';
import { SAMPLE_MAPPER_ROWS } from '../scenarios/sampleMapper.js';
import { MOCKUP_LOD_THRESHOLDS, type ContourControls, type DemoTab } from './tabs.js';

/** What a tab config needs from the app: theme, slider state and the windows. */
export interface TabConfigDeps {
  theme: 'light' | 'dark';
  contourControls: ContourControls;
  flatOrgsData: DiagramData;
  /** Rows loaded through the pooled mapper, if the user loaded any (tab «Mapper»). */
  mapperData?: DiagramData | null;
  /** Materialized window for the 100k-org tab (built on first use). */
  scaleOrgsWindow(): ScaleOrgsWindow;
  /** Materialized window for the 1M-seat tab (built on first use). */
  scaleStaffWindow(): ScaleStaffWindow;
}

/**
 * Per-tab diagram configuration. Kept out of `App` because it is a pure
 * mapping — tab in, config out — and it is where a new demo scene is added.
 */
export function buildTabConfig(tab: DemoTab, deps: TabConfigDeps): OrgHierarchyConfig<unknown> {
  const base = {
    theme: deps.theme,
    useWorker: true,
    workerPoolSize: recommendWorkerPoolSize(),
    render: {
      cellWidth: 140,
      cellHeight: 160,
      paddingCells: deps.contourControls.paddingCells,
      smoothIterations: deps.contourControls.smoothIterations,
    },
  };

  switch (tab) {
    case 'variant-b':
      return {
        ...base,
        data: buildVariantBData(),
        staffCurrentOrgId: 'org1',
        // Corridor gaps so report edges are readable; contour pitch = cell + gap.
        staffLayout: {
          horizontalGap: VARIANT_B_HORIZONTAL_GAP,
          verticalGap: VARIANT_B_VERTICAL_GAP,
          margin: 0,
          refCellWidth: 140,
          refCellHeight: 160,
          nodeWidth: 136,
          nodeHeight: 156,
        },
        render: {
          ...base.render,
          magnetRadius: VARIANT_B_MAGNET_RADIUS,
          // Hide singleton CEO wash so the IT notch stays empty (T46).
          minContourMembers: 2,
          smoothIterations: deps.contourControls.smoothIterations,
        },
      };
    case 'staff-tree':
      return {
        ...base,
        data: buildStaffTreeData(),
        staffCurrentOrgId: 'ops',
        // The department card's label is always right-aligned with no option to
        // move it, so a right-aligned zone label lands in the same corner and the
        // card frame draws over it. Left is the fix for this tab; reserving a
        // label band in the tier is T94 and would move geometry everywhere.
        styles: { staffZone: { labelAlign: 'left' } },
        render: {
          ...base.render,
          staffZoneChrome: true,
          departmentStyle: 'card',
        },
        staffLayout: {
          horizontalGap: 40,
          verticalGap: 52,
          tierGap: 36,
          margin: 24,
          nodeWidth: 136,
          nodeHeight: 156,
          orgCardWidth: 200,
          orgCardHeight: 64,
          refCellWidth: 140,
          refCellHeight: 160,
          collapseUnexpandedPositions: true,
        },
      };
    case 'mockup-orgs-figma':
      return {
        ...base,
        theme: 'dark',
        data: buildMockupOrgsFigmaData(),
        styles: MOCKUP_FIGMA_STYLES,
        lodThresholds: MOCKUP_LOD_THRESHOLDS,
        orgLayout: FIGMA_ORG_LAYOUT,
        // Frame 1264:8121 shows bare cards — no tree expander chrome.
        orgTreeChrome: false,
        render: {
          ...base.render,
          orgSiblingGroupChrome: true,
        },
      };
    case 'mockup-orgs-gojs':
      return {
        ...base,
        theme: 'dark',
        data: buildMockupOrgsGojsData(),
        styles: MOCKUP_GOJS_STYLES,
        lodThresholds: MOCKUP_LOD_THRESHOLDS,
        orgLayout: {
          nodeWidth: 220,
          nodeHeight: 121,
          horizontalGap: 40,
          verticalGap: 48,
          margin: 40,
          orgEdgeStyle: 'spine-bus',
        },
        render: {
          ...base.render,
          orgSiblingGroupChrome: true,
          orgSiblingGroupStyle: 'outline',
        },
      };
    case 'mockup-staff-figma':
      return {
        ...base,
        theme: 'dark',
        data: buildMockupStaffFigmaData(),
        styles: MOCKUP_FIGMA_STYLES,
        lodThresholds: MOCKUP_LOD_THRESHOLDS,
        // Frame 1264:7906 has two zones — managing tier + current tier; the
        // tier-3 expand-in-place demo lives on the GoJS staff tab.
        staffCurrentOrgId: 'region',
        staffLayout: FIGMA_STAFF_LAYOUT,
        render: {
          ...base.render,
          staffZoneChrome: true,
          departmentStyle: 'card',
          cellWidth: FIGMA_STAFF_LAYOUT.refCellWidth,
          cellHeight: FIGMA_STAFF_LAYOUT.refCellHeight,
        },
      };
    case 'mockup-staff-magnetic':
      return {
        ...base,
        theme: 'dark',
        data: buildMockupStaffMagneticData(),
        styles: MOCKUP_MAGNETIC_STYLES,
        lodThresholds: MOCKUP_LOD_THRESHOLDS,
        staffCurrentOrgId: 'region',
        staffLayout: MAGNETIC_STAFF_LAYOUT,
        render: {
          ...base.render,
          // Department = magnetic contour (pre-T64 default), org = zone block.
          staffZoneChrome: true,
          departmentStyle: 'blob',
          magnetRadius: VARIANT_B_MAGNET_RADIUS,
          minContourMembers: 1,
          cellWidth: MAGNETIC_CELL.width,
          cellHeight: MAGNETIC_CELL.height,
        },
      };
    case 'mockup-staff-flood':
      return {
        ...base,
        theme: 'dark',
        data: buildMockupStaffFloodData(),
        styles: MOCKUP_MAGNETIC_STYLES,
        lodThresholds: MOCKUP_LOD_THRESHOLDS,
        staffCurrentOrgId: 'region',
        staffLayout: FLOOD_STAFF_LAYOUT,
        render: {
          ...base.render,
          staffZoneChrome: true,
          departmentStyle: 'blob',
          // Same scene as Staff · Magnetic, other geometry: Rust cell flood.
          contourEngine: 'cell-flood',
          magnetRadius: VARIANT_B_MAGNET_RADIUS,
          minContourMembers: 1,
          cellWidth: FLOOD_CELL.width,
          cellHeight: FLOOD_CELL.height,
        },
      };
    case 'staff-1m': {
      const win = deps.scaleStaffWindow();
      return {
        ...base,
        theme: 'dark',
        data: win.data,
        styles: MOCKUP_MAGNETIC_STYLES,
        // Default LOD bands on purpose: the mockup override pins «near» up to
        // 0.5, so the first frame drew text for every seat in the window.
        staffCurrentOrgId: 'current-org',
        staffExpandedOrgIds: ['sub-0'],
        staffLayout: {
          ...MAGNETIC_STAFF_LAYOUT,
          // Denser than the mockup: a window is a wall of seats, not a scene.
          horizontalGap: 24,
          verticalGap: 28,
          refCellWidth: 248,
          refCellHeight: 44,
        },
        render: {
          ...base.render,
          staffZoneChrome: true,
          departmentStyle: 'blob',
          magnetRadius: VARIANT_B_MAGNET_RADIUS,
          minContourMembers: 2,
          cellWidth: 272,
          cellHeight: 72,
        },
      };
    }
    case 'mockup-staff-gojs':
      return {
        ...base,
        theme: 'dark',
        data: buildMockupStaffGojsData(),
        styles: MOCKUP_GOJS_STYLES,
        lodThresholds: MOCKUP_LOD_THRESHOLDS,
        staffCurrentOrgId: 'region',
        staffExpandedOrgIds: ['unit-current'],
        staffLayout: {
          horizontalGap: 36,
          verticalGap: 40,
          tierGap: 48,
          margin: 28,
          nodeWidth: 200,
          nodeHeight: 98,
          orgCardWidth: 220,
          orgCardHeight: 121,
          refCellWidth: 220,
          refCellHeight: 72,
          collapseUnexpandedPositions: false,
        },
        render: {
          ...base.render,
          staffZoneChrome: true,
          departmentStyle: 'card',
          cellWidth: 220,
          cellHeight: 72,
        },
      };
    case 'flat-orgs':
      return {
        ...base,
        data: deps.flatOrgsData,
        orgLayout: {
          nodeWidth: 200,
          nodeHeight: 64,
          horizontalGap: 36,
          verticalGap: 44,
          margin: 40,
        },
      };
    case 'scale-100k': {
      const win = deps.scaleOrgsWindow();
      return {
        ...base,
        orgTreeChrome: false,
        data: win.data,
        orgLayout: {
          nodeWidth: 160,
          nodeHeight: 52,
          horizontalGap: 20,
          verticalGap: 24,
          margin: 24,
        },
      };
    }
    case 'mapper': {
      // Already-mapped rows (pooled worker path) win over the built-in sample —
      // otherwise «Load sample JSON» would have to rebuild the scene by hand and
      // would lose the callbacks and overlays that `reload()` sets up.
      if (deps.mapperData) {
        return { ...base, data: deps.mapperData, staffCurrentOrgId: 'org-it' };
      }
      // The only tab with a mapper: its config is type-checked against the row
      // type it actually maps, then widened — `OrgHierarchyConfig` is invariant
      // in TRaw, so a per-tab mapper cannot be expressed in the shared return.
      return widenConfig({
        ...base,
        data: SAMPLE_MAPPER_ROWS,
        mappers: { toDiagram: flatRowsToDiagram },
        staffCurrentOrgId: 'org-it',
        orgLayout: {
          nodeWidth: 200,
          nodeHeight: 64,
          horizontalGap: 36,
          verticalGap: 44,
          margin: 40,
        },
      } satisfies OrgHierarchyConfig<FlatDiagramRow[]>);
    }
    case 'worker':
      return {
        ...base,
        data: buildVariantBData(),
        staffCurrentOrgId: 'org1',
        staffLayout: {
          horizontalGap: VARIANT_B_HORIZONTAL_GAP,
          verticalGap: VARIANT_B_VERTICAL_GAP,
          margin: 0,
          refCellWidth: 140,
          refCellHeight: 160,
          nodeWidth: 136,
          nodeHeight: 156,
        },
        render: { ...base.render, magnetRadius: VARIANT_B_MAGNET_RADIUS, minContourMembers: 2 },
      };
    default:
      return assertNever(tab);
  }
}

/** A tab that is not in the union means the caller skipped a compile error. */
function assertNever(tab: never): never {
  throw new Error(`buildTabConfig: unknown tab ${String(tab)}`);
}

/** Widen a mapper-typed config to the shared return type (see 'mapper'). */
function widenConfig<TRaw>(config: OrgHierarchyConfig<TRaw>): OrgHierarchyConfig<unknown> {
  return config as OrgHierarchyConfig<unknown>;
}
