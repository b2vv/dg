import { LEAD_SEATS, type ScaleStaffWindow } from '../scenarios/scaleStaff.js';
import type { DemoTab } from './tabs.js';

/**
 * One line under the canvas saying what the scene demonstrates. Tabs without an
 * entry show none — the scene speaks for itself.
 */
const STATIC_CAPTIONS: Partial<Record<DemoTab, string>> = {
  'variant-b':
    'Blue wash = magnetic groups (same dept, adjacent cells) · arrows = reports · orange T = temporary',
  'mockup-orgs-figma':
    'Figma orgs · 234×110 cards · N [M] counts top-right · dashed sibling frame',
  'mockup-orgs-gojs':
    'GoJS orgs · 220×121 vertical cards · tree counts · dashed sibling frame · dark chrome',
  'mockup-staff-figma':
    'Figma staff · dashed zones · dept cards · chrome-less seats · accent names · ⏳ = acting',
  'mockup-staff-magnetic':
    'Figma staff · magnetic department contours (one per magnetic component) · organization = block, foreign nodes stay outside',
  'mockup-staff-flood':
    'Figma staff · Rust cell flood (G1–G8) · departments interleave, so the command contour becomes a C around the supply seat',
  'mockup-staff-gojs':
    'GoJS staff · solid zones · row seats 200×56 · dept cards · dark production chrome',
  'staff-brigade':
    'Brigade staff · tier 1 higher command · tier 2 full staff as a tree from reportLines · tier 3 subordinate units as cards, deliberately mixed echelons',
};

/** The 1M tab reports its live window, so its caption is built per render. */
export function captionForTab(tab: DemoTab, staffWindow: ScaleStaffWindow | null): string | null {
  if (tab !== 'staff-1m') return STATIC_CAPTIONS[tab] ?? null;
  if (!staffWindow) return '1M staff · windowed';
  const uk = (n: number) => n.toLocaleString('uk-UA');
  const lastCurrentSeat = LEAD_SEATS + staffWindow.composition.current - 1;
  return (
    `1M staff · window ${uk(staffWindow.windowSize)} seats of ${uk(staffWindow.total)}` +
    ` · tier 1 lead org · tier 2 current org · tier 3 ${staffWindow.composition.groups} groups` +
    ` + ${staffWindow.composition.simpleOrgs} simple orgs` +
    ` · «pos-N» moves the window inside tier 2 (${LEAD_SEATS}…${uk(lastCurrentSeat)})`
  );
}
