import { describe, expect, it } from '@rstest/core';
import {
  adminParentsOf,
  canReparent,
  checkReparent,
  reparentPosition,
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

const ids = (...extra: string[]) =>
  new Set<string>(['head', 'a', 'b', 'c', 'x', ...extra]);

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
    const two = new Set(['p', 'q', 'r']);
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
