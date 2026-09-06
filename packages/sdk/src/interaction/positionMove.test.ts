import { describe, expect, it } from '@rstest/core';
import type { DiagramPosition } from '../data/types.js';
import { resolveSeatDrop } from './positionMove.js';

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
