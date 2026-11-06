import { afterEach, describe, expect, it } from '@rstest/core';
import {
  resetContourWasmForTests,
  setContourWasmLoaderForTests,
  type WasmContourModule,
} from '../contour/bridge.js';
import { computeStaffGeometryWasm } from './layoutBridge.js';
import type { StaffGeometryResult, StaffLayoutInput } from './layoutBridge.js';

function minimalInput(): StaffLayoutInput {
  return {
    currentOrgId: 'o1',
    positions: [],
    reports: [],
    organizations: [],
    departments: [],
    nodeSizes: [],
    options: {
      nodeWidth: 220,
      nodeHeight: 72,
      refCellWidth: 220,
      refCellHeight: 72,
      horizontalGap: 40,
      verticalGap: 60,
      margin: 24,
      tierGap: 80,
      orgCardWidth: 200,
      orgCardHeight: 64,
      zoneLabelBand: 24,
      contentPadding: 16,
      deptGrouping: false,
    },
    dockHints: [],
    expandedOrgIds: [],
    lod: 'near',
  };
}

function cannedResult(): StaffGeometryResult {
  return {
    currentOrgId: 'o1',
    nodes: [],
    orgCards: [],
    namespaces: [],
    departmentFrames: [],
    edges: [],
    routes: { lod: 'near', segments: [] },
    width: 0,
    height: 0,
    diagnostics: [],
  };
}

describe('computeStaffGeometryWasm', () => {
  afterEach(() => {
    setContourWasmLoaderForTests(null);
    resetContourWasmForTests();
  });

  it('calls the wasm export, forwarding input by reference and returning its result unchanged', async () => {
    const input = minimalInput();
    const canned = cannedResult();
    let received: unknown = null;

    const fake: WasmContourModule = {
      default: async () => {},
      computeOrgRowTreeLayout: () => {
        throw new Error('computeOrgRowTreeLayout must not be called by the staff bridge');
      },
      computeStaffGeometry: (arg: unknown) => {
        received = arg;
        return canned;
      },
      // TODO(dg41): rename to computeStaffTidyLayout at the coordinated build:wasm
      computeStaffMockupLayout: () => {
        throw new Error('computeStaffMockupLayout must not be called by the staff geometry bridge');
      },
    };
    setContourWasmLoaderForTests(async () => fake);

    const result = await computeStaffGeometryWasm(input);

    // Pass-through: the exact same input object must reach the wasm boundary (no wrap/clone).
    expect(received).toBe(input);
    // Pass-through: the wasm result is returned as-is (no transformation).
    expect(result).toBe(canned);
  });
});
