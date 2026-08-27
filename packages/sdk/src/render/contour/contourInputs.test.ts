import { describe, expect, it } from '@rstest/core';
import { contourSceneInputs, matrixNodeBoxes } from './contourInputs.js';
import { NO_DEPARTMENT_ID } from '../../data/types.js';

const node = (id: string, x = 0, y = 0) => ({ id, x, y, width: 100, height: 50 });

describe('contourSceneInputs', () => {
  it('success: a seat joins the cell inputs and its department bucket', () => {
    const { inputs, memberBoxesByDept } = contourSceneInputs(
      [node('a'), node('b', 200)],
      new Map([
        ['a', { departmentId: 'IT', gridCell: { col: 0, row: 0 } }],
        ['b', { departmentId: 'IT', gridCell: { col: 1, row: 0 } }],
      ]),
    );
    expect(inputs.map((i) => i.id)).toEqual(['a', 'b']);
    expect(memberBoxesByDept.get('IT')).toHaveLength(2);
  });

  it('success: no department → the reserved bucket, still foreign mass', () => {
    const { inputs, memberBoxesByDept } = contourSceneInputs(
      [node('loose')],
      new Map([['loose', { gridCell: { col: 2, row: 1 } }]]),
    );
    expect(inputs[0]?.departmentId).toBe(NO_DEPARTMENT_ID);
    expect(memberBoxesByDept.get(NO_DEPARTMENT_ID)).toHaveLength(1);
  });

  it('failure: a seat without coords keeps its card but joins no cell grid', () => {
    const { inputs, memberBoxesByDept } = contourSceneInputs(
      [node('tree-seat')],
      new Map([['tree-seat', { departmentId: 'IT' }]]),
    );
    expect(inputs).toEqual([]);
    // The card is still there — a contour must route around it.
    expect(memberBoxesByDept.get('IT')).toHaveLength(1);
  });

  it('failure: a node with no matching position is skipped entirely', () => {
    const { inputs, memberBoxesByDept } = contourSceneInputs([node('ghost')], new Map());
    expect(inputs).toEqual([]);
    expect(memberBoxesByDept.size).toBe(0);
  });
});

describe('matrixNodeBoxes', () => {
  const geometry = { cellWidth: 140, cellHeight: 160, cardWidth: 136, cardHeight: 156 };

  it('success: cards are centred in their cell', () => {
    expect(matrixNodeBoxes([{ id: 'a', gridCell: { col: 1, row: 2 } }], geometry)).toEqual([
      { id: 'a', x: 142, y: 322, width: 136, height: 156 },
    ]);
  });

  it('failure: a position without coords has no matrix box', () => {
    expect(matrixNodeBoxes([{ id: 'a' }], geometry)).toEqual([]);
  });
});
