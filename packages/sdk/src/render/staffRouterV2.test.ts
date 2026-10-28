import { describe, expect, it } from '@rstest/core';
import { NO_DEPARTMENT_ID } from '../data/types.js';
import type { DiagramPosition } from '../data/types.js';
import { buildStaffEdgeSegments, edgeIntrudesForeignFrame } from '../layout/staffEdgeGeometry.js';
import type { StaffEdgeFrame } from '../layout/staffEdgeGeometry.js';
import { contourSceneInputs } from './contour/contourInputs.js';
import { resolveStaffRouting } from './staffRouterV2.js';
import type { StaffRoutingInput } from './staffRouterV2.js';
import { mapPositionNodesToStaffEdgeBoxes, mapStaffEdgeBoxesForLod } from './visualEdgeBox.js';

function position(id: string, departmentId?: string): DiagramPosition {
  return {
    id, departmentId, organizationId: 'org', title: id,
    groupIds: [], status: 'filled', isTemporary: false,
  };
}

function scene(): StaffRoutingInput {
  return {
    router: 'v2',
    positionNodes: [
      { id: 'b1', x: 0, y: 0, width: 40, height: 40 },
      { id: 'b2', x: 200, y: 0, width: 40, height: 40 },
      { id: 'a1', x: 80, y: 26, width: 20, height: 20 },
      { id: 'a2', x: 140, y: 26, width: 20, height: 20 },
    ],
    edges: [{ fromId: 'b1', toId: 'b2', kind: 'admin' }],
    positionById: new Map([
      ['b1', position('b1', 'b')], ['b2', position('b2', 'b')],
      ['a1', position('a1', 'a')], ['a2', position('a2', 'a')],
    ]),
    personTheme: {
      width: 40, height: 40, personLayout: 'gojs-portrait',
      background: 0xffffff, border: 0, borderWidth: 1, borderRadius: 0,
      nameColor: 0, titleColor: 0, nameFontSize: 12, titleFontSize: 10,
      badgeColor: 0, badgeTextColor: 0xffffff, avatarColor: 0,
    },
    lod: 'near',
    orgCards: [],
  };
}

function edgeBoxes(input: StaffRoutingInput) {
  return mapStaffEdgeBoxesForLod(
    mapPositionNodesToStaffEdgeBoxes(input.positionNodes, input.positionById, input.personTheme),
    input.orgCards,
    input.lod,
  );
}

function foreignFrame(): StaffEdgeFrame {
  return {
    deptId: 'a', rect: { x: 72, y: 18, width: 96, height: 36 },
    memberIds: new Set(['a1', 'a2']),
  };
}

const direct = [{ x: 40, y: 20 }, { x: 200, y: 20 }];
const around = [
  { x: 20, y: 0 }, { x: 20, y: -16 },
  { x: 220, y: -16 }, { x: 220, y: 0 },
];

describe('resolveStaffRouting', () => {
  it('routes around a foreign department frame that the frame-free control crosses', () => {
    const input = scene();
    const boxes = edgeBoxes(input);
    const from = boxes.find((box) => box.id === 'b1');
    const to = boxes.find((box) => box.id === 'b2');
    if (!from || !to) throw new Error('Missing fixture endpoints');
    const legacy = buildStaffEdgeSegments(input.edges, boxes);
    expect(legacy).toHaveLength(1);
    expect(legacy[0]?.points).toEqual(direct);
    expect(edgeIntrudesForeignFrame(direct, from, to, [foreignFrame()])).toBe(true);

    const result = resolveStaffRouting(input);
    expect(result.routedSegments).toHaveLength(1);
    const segment = result.routedSegments[0];
    if (!segment) throw new Error('Missing routed segment');
    expect(segment.points).toEqual(around);
    expect(edgeIntrudesForeignFrame(segment.points, from, to, [foreignFrame()])).toBe(false);
    expect(result.markedCrossings).toEqual([]);
    expect(resolveStaffRouting({ ...input, framePadding: 0 }).routedSegments).toEqual(legacy);
  });

  it('keeps the loose bucket without creating a routing frame for it', () => {
    const input = scene();
    input.positionById = new Map([
      ['b1', position('b1', 'b')], ['b2', position('b2', 'b')],
      ['a1', position('a1')], ['a2', position('a2')],
    ]);
    const { memberBoxesByDept } = contourSceneInputs(input.positionNodes, input.positionById);
    expect(memberBoxesByDept.get(NO_DEPARTMENT_ID)?.map((box) => box.positionId)).toEqual(['a1', 'a2']);
    const result = resolveStaffRouting(input);
    expect(result.routedSegments).toEqual(buildStaffEdgeSegments(input.edges, edgeBoxes(input)));
    expect(result.routedSegments[0]?.points).toEqual(direct);
    expect(result.markedCrossings).toEqual([]);
  });

  it('marks residual foreign-frame intrusion when all available lanes remain enclosed', () => {
    const input = scene();
    input.positionNodes = [
      { id: 'b1', x: 0, y: 0, width: 40, height: 40 },
      { id: 'b2', x: 200, y: 0, width: 40, height: 40 },
      { id: 'a1', x: -100, y: -100, width: 40, height: 40 },
      { id: 'a2', x: 300, y: 100, width: 40, height: 40 },
    ];
    const result = resolveStaffRouting(input);
    expect(result.routedSegments).toHaveLength(1);
    expect(result.routedSegments[0]?.points).toEqual([
      { x: 0, y: 20 }, { x: -16, y: 20 },
      { x: -16, y: 20 }, { x: 200, y: 20 },
    ]);
    expect(result.markedCrossings).toEqual([{ fromId: 'b1', toId: 'b2' }]);
    expect(resolveStaffRouting(scene()).markedCrossings).toEqual([]);
  });

  it("router 'legacy' skips foreign-frame avoidance and never marks crossings", () => {
    // Same scene whose v2 route goes *around* the foreign frame (see first test):
    // legacy must take the frame-free direct route and report no marks.
    const input: StaffRoutingInput = { ...scene(), router: 'legacy' };
    const result = resolveStaffRouting(input);
    expect(result.routedSegments).toEqual(buildStaffEdgeSegments(input.edges, edgeBoxes(input)));
    expect(result.routedSegments[0]?.points).toEqual(direct);
    expect(result.markedCrossings).toEqual([]);
  });

  it('is synchronous, repeatable and independent of node order without mutating input', () => {
    const input = scene();
    const before = structuredClone(input);
    const first = resolveStaffRouting(input);
    expect(first.routedSegments[0]?.points).toEqual(around);
    expect(resolveStaffRouting(input)).toEqual(first);
    const reversedNodes = input.positionNodes.map((_, i, a) => a[a.length - 1 - i]!);
    expect(resolveStaffRouting({ ...input, positionNodes: reversedNodes })).toEqual(first);
    expect(input).toEqual(before);
  });
});
