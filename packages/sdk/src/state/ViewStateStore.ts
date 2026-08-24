import type { LodLevel, LodThresholds } from '../render/lod.js';
import { defaultLodThresholds } from '../render/lod.js';
import type { OrgLayoutOptions, StaffLayoutOptions } from '../layout/index.js';
import type { ThemeMode } from '../render/types.js';

/**
 * View / interaction chrome state for {@link OrgHierarchyDiagram} (T76 / D4).
 * Does not own DiagramData — that stays on the facade until DataStore lands.
 */
export class ViewStateStore {
  themeMode: ThemeMode = 'auto';
  lodLevel: LodLevel = 'near';
  lodThresholds: LodThresholds = defaultLodThresholds;
  staffCurrentOrgId: string | undefined;
  staffLayout: StaffLayoutOptions = {};
  orgLayout: OrgLayoutOptions = {};
  orgTreeChrome = true;
  readonly staffExpandedOrgIds = new Set<string>();
  readonly staffExpandedPositionIds = new Set<string>();

  setThemeMode(theme: ThemeMode): void {
    this.themeMode = theme;
  }

  setLodLevel(level: LodLevel): void {
    this.lodLevel = level;
  }

  setLodThresholds(thresholds: LodThresholds): void {
    this.lodThresholds = thresholds;
  }

  setStaffFocus(orgId: string | undefined): void {
    this.staffCurrentOrgId = orgId;
  }

  toggleStaffOrgExpanded(orgId: string): boolean {
    if (this.staffExpandedOrgIds.has(orgId)) {
      this.staffExpandedOrgIds.delete(orgId);
      return false;
    }
    this.staffExpandedOrgIds.add(orgId);
    return true;
  }

  setStaffOrgExpanded(orgId: string, expanded: boolean): void {
    if (expanded) this.staffExpandedOrgIds.add(orgId);
    else this.staffExpandedOrgIds.delete(orgId);
  }

  setPositionExpanded(positionId: string, expanded: boolean): void {
    if (expanded) this.staffExpandedPositionIds.add(positionId);
    else this.staffExpandedPositionIds.delete(positionId);
  }

  clearPositionExpanded(): void {
    this.staffExpandedPositionIds.clear();
  }
}
