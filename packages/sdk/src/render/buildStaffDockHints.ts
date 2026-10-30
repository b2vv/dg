// T126 R7 A4.2b — the dock-hint adapter.
//
// Resolves the per-position Figma/GoJS dock geometry the Rust router needs, in the
// render layer, before `buildStaffLayoutInput` feeds the bridge. Rust takes the
// hints as input and does its own LOD boxing; without them every seat would dock
// edges on its full cell box and the figma/gojs routing parity would break.
//
// Pure reuse of `staffEdgeBoxForPosition` (visualEdgeBox), the same function the
// old TS router used — so a hint computed here is byte-identical to the old one.
// The hint is *relative* (e.g. `tileX = avatar.cx - size/2`): it depends only on
// the node's effective size and style, never on its laid-out x/y, so a stand-in
// position box with the effective size is enough to extract it.
//
// Built for every `data.positions` entry (a safe superset): Rust keys the hints by
// the laid-out node id, so a hint for a position collapse hid is simply ignored.
// `StaffDockHint` is the exact mirror of `PersonEdgeVisualHints`, so no remap is
// needed — `box.personEdgeHints` is the `hint` field as-is.
import type { DiagramData } from '../data/types.js';
import type { StaffDockHintInput, StaffLayoutMetrics } from '../wasm/layoutBridge.js';
import type { PersonNodeStyle } from './types.js';
import { staffEdgeBoxForPosition } from './visualEdgeBox.js';

/** The slice of `DiagramData` dock hints need. */
type StaffData = Pick<DiagramData, 'positions'>;

/**
 * One `StaffDockHintInput` per position whose seat template needs a shorter dock
 * box (figma-row / gojs-row). Positions with the default (centre) dock produce no
 * hint and are omitted — `staffEdgeBoxForPosition` returns a box without
 * `personEdgeHints`, which also honours an explicit `edgePort: 'center'` (T125).
 */
export function buildStaffDockHints(
  data: StaffData,
  metrics: Pick<StaffLayoutMetrics, 'nodeWidth' | 'nodeHeight'>,
  personTheme: PersonNodeStyle,
): StaffDockHintInput[] {
  const hints: StaffDockHintInput[] = [];
  for (const p of data.positions) {
    // Effective size mirrors TS `positionSize`: an explicit dimension wins, else the
    // resolved metric — the same size the laid-out node carried, so hints match.
    const width = p.width ?? metrics.nodeWidth;
    const height = p.height ?? metrics.nodeHeight;
    const style: PersonNodeStyle = { ...personTheme, width, height };
    const box = staffEdgeBoxForPosition({ id: p.id, x: 0, y: 0, width, height }, p, style);
    if (box.personEdgeHints !== undefined) {
      hints.push({ id: p.id, hint: box.personEdgeHints });
    }
  }
  return hints;
}
