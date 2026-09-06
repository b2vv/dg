import { describe, expect, it } from '@rstest/core';
import type { DiagramPosition } from '../data/types.js';
import { applySeatDrop, movePositionToCell, resolveSeatDrop } from './positionMove.js';
import { InteractionError } from './types.js';

function seat(id: string, cell: { col: number; row: number } | null, orgId = 'org1'): DiagramPosition {
  return {
    id,
    title: id,
    organizationId: orgId,
    groupIds: [],
    status: 'vacant',
    isTemporary: false,
    ...(cell ? { gridCell: cell } : {}),
  };
}

/**
 * One org block, addressed by cell:
 *
 * ```
 *        col 0     col 1     col 2
 * row 0   a         b         c
 * row 1             d
 * row 2   e                   f
 * ```
 *
 * Every mover below is dropped from the cell it actually holds in the data,
 * because that is where `from` comes from in both consumers (plan §2).
 */
function block(): DiagramPosition[] {
  return [
    seat('a', { col: 0, row: 0 }),
    seat('b', { col: 1, row: 0 }),
    seat('c', { col: 2, row: 0 }),
    seat('d', { col: 1, row: 1 }),
    seat('e', { col: 0, row: 2 }),
    seat('f', { col: 2, row: 2 }),
  ];
}

describe('resolveSeatDrop', () => {
  it('success: empty target cell → free', () => {
    expect(
      resolveSeatDrop({
        positions: block(),
        positionId: 'a',
        target: { col: 4, row: 4 },
        from: { col: 0, row: 0 },
      }),
    ).toEqual({ kind: 'free' });
  });

  it('success: an occupant of another org block is no occupant at all', () => {
    // Occupancy is counted inside one org block (`orgBlockLayout` compares only
    // seats of one org), so org2's seat in the same cell must not be seen.
    expect(
      resolveSeatDrop({
        positions: [seat('mover', { col: 0, row: 1 }), seat('other', { col: 1, row: 1 }, 'org2')],
        positionId: 'mover',
        target: { col: 1, row: 1 },
        from: { col: 0, row: 1 },
      }),
    ).toEqual({ kind: 'free' });
  });

  it('success: four directions push the occupant to the far side of the entry', () => {
    const pair = (moverCell: { col: number; row: number }): DiagramPosition[] => [
      seat('mover', moverCell),
      seat('sitter', { col: 1, row: 1 }),
    ];
    const onto = (moverCell: { col: number; row: number }) =>
      resolveSeatDrop({
        positions: pair(moverCell),
        positionId: 'mover',
        target: { col: 1, row: 1 },
        from: moverCell,
      });

    // → entering from the left: the occupant is pushed right.
    expect(onto({ col: 0, row: 1 })).toEqual({
      kind: 'push',
      occupantId: 'sitter',
      to: { col: 2, row: 1 },
    });
    // ← from the right.
    expect(onto({ col: 2, row: 1 })).toEqual({
      kind: 'push',
      occupantId: 'sitter',
      to: { col: 0, row: 1 },
    });
    // ↓ from above.
    expect(onto({ col: 1, row: 0 })).toEqual({
      kind: 'push',
      occupantId: 'sitter',
      to: { col: 1, row: 2 },
    });
    // ↑ from below.
    expect(onto({ col: 1, row: 2 })).toEqual({
      kind: 'push',
      occupantId: 'sitter',
      to: { col: 1, row: 0 },
    });
  });

  it('success: a drag across several cells keeps its single axis', () => {
    // c travels two rows down onto f; f is pushed one further down.
    expect(
      resolveSeatDrop({
        positions: block(),
        positionId: 'c',
        target: { col: 2, row: 2 },
        from: { col: 2, row: 0 },
      }),
    ).toEqual({ kind: 'push', occupantId: 'f', to: { col: 2, row: 3 } });
  });

  it('failure: nowhere to push (the cell behind the occupant is taken) → swap', () => {
    // a → b, and behind b sits c. No chain: b and a swap.
    expect(
      resolveSeatDrop({
        positions: block(),
        positionId: 'a',
        target: { col: 1, row: 0 },
        from: { col: 0, row: 0 },
      }),
    ).toEqual({ kind: 'swap', occupantId: 'b' });
  });

  it('failure: pushing outside the block (negative cell) → swap', () => {
    expect(
      resolveSeatDrop({
        positions: [seat('a', { col: 0, row: 0 }), seat('b', { col: 1, row: 0 })],
        positionId: 'b',
        target: { col: 0, row: 0 },
        from: { col: 1, row: 0 },
      }),
    ).toEqual({ kind: 'swap', occupantId: 'a' });
  });

  it('failure: target === from → free no-op, not a question', () => {
    expect(
      resolveSeatDrop({
        positions: block(),
        positionId: 'd',
        target: { col: 1, row: 1 },
        from: { col: 1, row: 1 },
      }),
    ).toEqual({ kind: 'free' });
  });

  it('failure: a seat with no cell of its own → ask, with nothing to push offered', () => {
    expect(
      resolveSeatDrop({
        positions: [...block(), seat('newcomer', null)],
        positionId: 'newcomer',
        target: { col: 1, row: 1 },
        from: undefined,
      }),
    ).toEqual({ kind: 'ask', occupantId: 'd', pushTargets: [] });
  });

  it('failure: diagonal → ask, offering the free cell on each axis', () => {
    expect(
      resolveSeatDrop({
        positions: block(),
        positionId: 'a',
        target: { col: 1, row: 1 },
        from: { col: 0, row: 0 },
      }),
    ).toEqual({
      kind: 'ask',
      occupantId: 'd',
      pushTargets: [
        { col: 2, row: 1 },
        { col: 1, row: 2 },
      ],
    });
  });

  it('failure: two seats already in the target cell → ask, even with a direction', () => {
    const drop = resolveSeatDrop({
      positions: [
        seat('mover', { col: 0, row: 1 }),
        seat('legacy1', { col: 1, row: 1 }),
        seat('legacy2', { col: 1, row: 1 }),
      ],
      positionId: 'mover',
      target: { col: 1, row: 1 },
      from: { col: 0, row: 1 },
    });
    expect(drop.kind).toBe('ask');
  });

  it('failure: unknown position → InteractionError', () => {
    expect(() =>
      resolveSeatDrop({
        positions: block(),
        positionId: 'nope',
        target: { col: 1, row: 1 },
        from: undefined,
      }),
    ).toThrow('Unknown position nope');
  });
});

describe('movePositionToCell occupancy guard', () => {
  it('success: an empty cell is still moved into', () => {
    const next = movePositionToCell(block(), 'a', 4, 4);
    expect(next.find((p) => p.id === 'a')?.gridCell).toEqual({ col: 4, row: 4 });
  });

  it('success: the same cell in another org block is not taken', () => {
    const positions = [seat('mover', { col: 0, row: 1 }), seat('other', { col: 1, row: 1 }, 'org2')];
    expect(movePositionToCell(positions, 'mover', 1, 1).find((p) => p.id === 'mover')?.gridCell).toEqual(
      { col: 1, row: 1 },
    );
  });

  it('failure: a cell held by a seat of the same block is refused', () => {
    // The guard sits here rather than in each caller: `movePersonToCell` and the
    // drop that ends a drag both come through this function (T111).
    expect(() => movePositionToCell(block(), 'a', 1, 0)).toThrow(InteractionError);
    expect(() => movePositionToCell(block(), 'a', 1, 0)).toThrow(/taken by b/);
  });

  it('failure: staying in its own cell is not a collision with itself', () => {
    expect(movePositionToCell(block(), 'd', 1, 1).find((p) => p.id === 'd')?.gridCell).toEqual({
      col: 1,
      row: 1,
    });
  });
});

describe('applySeatDrop (T111-K3)', () => {
  it('success: push moves the mover and the pushed occupant in one array', () => {
    const positions = block();
    const target = { col: 2, row: 0 };
    const drop = resolveSeatDrop({ positions, positionId: 'b', target, from: { col: 1, row: 0 } });
    if (drop.kind === 'ask') throw new Error('unexpected ask');
    expect(drop).toEqual({ kind: 'push', occupantId: 'c', to: { col: 3, row: 0 } });

    const next = applySeatDrop(positions, 'b', target, drop);
    expect(next.find((p) => p.id === 'b')?.gridCell).toEqual({ col: 2, row: 0 });
    expect(next.find((p) => p.id === 'c')?.gridCell).toEqual({ col: 3, row: 0 });
    // Nobody else in the block moved.
    expect(next.find((p) => p.id === 'a')?.gridCell).toEqual({ col: 0, row: 0 });
    expect(next.find((p) => p.id === 'd')?.gridCell).toEqual({ col: 1, row: 1 });
  });

  it('success: swap exchanges gridCell between mover and occupant in one array', () => {
    const positions = block();
    const target = { col: 1, row: 0 };
    const drop = resolveSeatDrop({ positions, positionId: 'a', target, from: { col: 0, row: 0 } });
    if (drop.kind === 'ask') throw new Error('unexpected ask');
    expect(drop).toEqual({ kind: 'swap', occupantId: 'b' });

    const next = applySeatDrop(positions, 'a', target, drop);
    expect(next.find((p) => p.id === 'a')?.gridCell).toEqual({ col: 1, row: 0 });
    expect(next.find((p) => p.id === 'b')?.gridCell).toEqual({ col: 0, row: 0 });
    // Nobody else in the block moved.
    expect(next.find((p) => p.id === 'c')?.gridCell).toEqual({ col: 2, row: 0 });
  });

  it('failure: swap against an unknown occupant throws', () => {
    expect(() =>
      applySeatDrop(block(), 'a', { col: 1, row: 0 }, { kind: 'swap', occupantId: 'ghost' }),
    ).toThrow(/Unknown position ghost/);
  });

  it('failure: swap of an unknown mover throws', () => {
    expect(() =>
      applySeatDrop(block(), 'ghost', { col: 1, row: 0 }, { kind: 'swap', occupantId: 'b' }),
    ).toThrow(/Unknown position ghost/);
  });
});
