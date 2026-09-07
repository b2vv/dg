import { describe, expect, it } from '@rstest/core';
import {
  adminParentsOf,
  canReparent,
  checkReparent,
  reparentPosition,
  rosterOf,
  type SeatRoster,
} from './positionReparent.js';
import { InteractionError } from './types.js';
import type { DiagramReportLine } from '../data/types.js';

/** T91 rows 1-10 — validation, as pure functions. */

const admin = (fromId: string, toId: string): DiagramReportLine => ({
  fromId,
  toId,
  kind: 'admin',
});

/** head → a → b → c, plus a second branch head → x. */
const chain: DiagramReportLine[] = [
  admin('head', 'a'),
  admin('a', 'b'),
  admin('b', 'c'),
  admin('head', 'x'),
];

/**
 * The roster these rows run against: everyone exists, and nobody is a head —
 * so the T91 rows below keep measuring what they measured before the root
 * guard existed. Rows that need a head build their own.
 */
const ids = (...extra: string[]): SeatRoster => ({
  knownIds: new Set<string>(['head', 'a', 'b', 'c', 'x', ...extra]),
  headIds: new Set<string>(),
});

/** The same roster, with `positionId` marked as the structural root. */
const withHead = (positionId: string, ...extra: string[]): SeatRoster => ({
  knownIds: ids(...extra).knownIds,
  headIds: new Set<string>([positionId]),
});

describe('reparent validation (T91 rows 1-10)', () => {
  it('row 1: a seat cannot report to itself', () => {
    expect(checkReparent(chain, 'b', 'b', ids())).toEqual({ ok: false, refusal: 'self' });
  });

  it('row 2: nor to its own direct report', () => {
    expect(checkReparent(chain, 'b', 'c', ids())).toEqual({ ok: false, refusal: 'cycle' });
  });

  it('row 3: nor to a descendant further down', () => {
    // head → a → b → c: making `head` report to `c` closes the loop.
    expect(checkReparent(chain, 'head', 'c', ids())).toEqual({ ok: false, refusal: 'cycle' });
  });

  it('row 4: the manager it already has is refused as «unchanged», not accepted', () => {
    // Distinct from a cycle on purpose: the caller must emit no patch here, and
    // a preview that showed this as a valid drop would promise a change that
    // never arrives.
    expect(checkReparent(chain, 'b', 'a', ids())).toEqual({ ok: false, refusal: 'unchanged' });
  });

  it('row 5: a manager in another organisation is allowed (GATE 3)', () => {
    // Nothing in this module knows about organisations — that is the decision.
    // The check walks supervision, and supervision may cross the boundary.
    const outside = ids('foreign');
    expect(canReparent(chain, 'b', 'foreign', outside)).toBe(true);
  });

  it('row 6: a seat with no manager gains a line rather than replacing one', () => {
    const detached: DiagramReportLine[] = [admin('head', 'a')];
    const next = reparentPosition(detached, 'loose', 'a', ids('loose'));
    expect(next).toHaveLength(2);
    expect(next).toContainEqual(admin('a', 'loose'));
  });

  it('row 7: a seat with a manager has its line replaced, not duplicated', () => {
    const next = reparentPosition(chain, 'c', 'x', ids());
    const managersOfC = next.filter((r) => r.kind === 'admin' && r.toId === 'c');
    expect(managersOfC).toEqual([admin('x', 'c')]);
  });

  it('row 8: matrix and dotted lines are a different relation and stay put', () => {
    const mixed: DiagramReportLine[] = [
      ...chain,
      { fromId: 'x', toId: 'c', kind: 'matrix' },
      { fromId: 'head', toId: 'c', kind: 'dotted' },
    ];
    const next = reparentPosition(mixed, 'c', 'x', ids());
    expect(next).toContainEqual({ fromId: 'x', toId: 'c', kind: 'matrix' });
    expect(next).toContainEqual({ fromId: 'head', toId: 'c', kind: 'dotted' });
  });

  it('row 9: an id nothing answers to is refused, and throws when applied', () => {
    expect(checkReparent(chain, 'ghost', 'a', ids())).toEqual({ ok: false, refusal: 'unknown' });
    expect(checkReparent(chain, 'a', 'ghost', ids())).toEqual({ ok: false, refusal: 'unknown' });
    expect(() => reparentPosition(chain, 'a', 'ghost', ids())).toThrow(InteractionError);
  });

  it('row 10: a cycle already in the data terminates the walk', () => {
    // Nothing validates `reportLines` for cycles today — only `parentOrgId` is
    // checked, in `layout/orgTree.ts`. So this data can reach us.
    const looped: DiagramReportLine[] = [admin('p', 'q'), admin('q', 'p')];
    const two: SeatRoster = { knownIds: new Set(['p', 'q', 'r']), headIds: new Set() };
    expect(checkReparent(looped, 'r', 'p', two).ok).toBe(true);
    expect(checkReparent(looped, 'q', 'p', two)).toEqual({ ok: false, refusal: 'unchanged' });
  });

  it('a self-edge is not supervision, so it never becomes a parent', () => {
    expect(adminParentsOf([admin('s', 's')]).size).toBe(0);
  });

  it('the input is not mutated', () => {
    const before = [...chain];
    reparentPosition(chain, 'c', 'x', ids());
    expect(chain).toEqual(before);
  });
});

/** T117 Gap 1 — the structural root is not a seat you may move. */
describe('the head of a structure cannot be reparented (T117 Gap 1)', () => {
  // Every seat in `chain` descends from `head`, so every in-tree target is
  // already a cycle and the root guard would be invisible against it. `out` is
  // a seat with no admin line — the shape the guard actually exists for, and
  // the one the host meets in practice: T91 GATE 3 lets a manager live in
  // another organisation, so a root *can* be dropped somewhere legal.
  const out = (positionId: string) => withHead(positionId, 'out');

  it('failure: dragging the head under a manager outside its own subtree is refused as «root»', () => {
    // Without the guard this drop is perfectly legal — no cycle, no self, a
    // real change. That is what makes it the case worth testing.
    expect(checkReparent(chain, 'head', 'out', out('head'))).toEqual({
      ok: false,
      refusal: 'root',
    });
  });

  it('success: a seat may be moved under a head, even one that is itself immovable', () => {
    // The guard is on the seat being *moved*, never on the seat it is dropped
    // onto. A root that may not move is not a root nobody may report to —
    // reporting to the head is the ordinary case, not the forbidden one.
    expect(checkReparent(chain, 'c', 'head', withHead('head'))).toEqual({
      ok: true,
      refusal: null,
    });
    expect(canReparent(chain, 'c', 'head', withHead('head'))).toBe(true);
  });

  it('success: an ordinary seat still reparents while a head exists', () => {
    expect(checkReparent(chain, 'c', 'x', withHead('head'))).toEqual({
      ok: true,
      refusal: null,
    });
  });

  it('failure: the preview refuses the head too, so it cannot promise a drop the commit denies', () => {
    // The whole point of one shared check (T111 plan §1): if `canReparent`
    // said yes here, the drag would highlight a target the commit refuses.
    expect(canReparent(chain, 'head', 'out', out('head'))).toBe(false);
    // …and the same seat is still a valid target for everyone else.
    expect(canReparent(chain, 'b', 'out', out('head'))).toBe(true);
  });

  it('failure: applying it throws, and the message names the reason', () => {
    expect(() => reparentPosition(chain, 'head', 'out', out('head'))).toThrow(
      InteractionError,
    );
    expect(() => reparentPosition(chain, 'head', 'out', out('head'))).toThrow(/root/);
  });

  it('failure: «root» outranks the target-shaped refusals, so the answer never depends on where it was dropped', () => {
    // A head dropped on itself is both `self` and `root`; a head dropped on the
    // manager it somehow already has is both `unchanged` and `root`. Answering
    // `root` in every case keeps the refusal a property of the seat.
    expect(checkReparent(chain, 'head', 'head', withHead('head')).refusal).toBe('root');
    const oddly: DiagramReportLine[] = [...chain, admin('x', 'head')];
    expect(checkReparent(oddly, 'head', 'x', withHead('head')).refusal).toBe('root');
  });

  it('failure: an id nothing answers to is still «unknown», head or not', () => {
    // Existence is checked first: a head id that is not in the roster is a
    // caller bug, and `unknown` says so more usefully than `root`.
    expect(checkReparent(chain, 'ghost', 'a', withHead('ghost')).refusal).toBe('unknown');
  });

  it('success: rosterOf reads `isHead` off the positions, so no caller assembles the set by hand', () => {
    // `Pick<DiagramPosition, 'id' | 'isHead'>` on purpose: the roster reads two
    // fields, so a test that had to build whole seats would be measuring the
    // shape of `DiagramPosition` instead of this function.
    const roster = rosterOf([
      { id: 'head', isHead: true },
      { id: 'a' },
      { id: 'b', isHead: false },
    ]);
    expect([...roster.knownIds].sort()).toEqual(['a', 'b', 'head']);
    expect([...roster.headIds]).toEqual(['head']);
  });
});
