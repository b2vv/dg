import { describe, expect, it } from '@rstest/core';
import { applyInitialExpand, initialExpandedOrgIds } from './initialExpand.js';
import type { DiagramOrganization } from './types.js';

/** T97 §В1, rows 1-9. */

const org = (id: string, parentOrgId?: string, collapsed = false): DiagramOrganization => ({
  id,
  name: id,
  parentOrgId,
  groupIds: [],
  collapsed,
});

const openIds = (orgs: DiagramOrganization[], root?: string) =>
  [...initialExpandedOrgIds(orgs, root)].sort();

const collapsedOf = (orgs: DiagramOrganization[], id: string) =>
  orgs.find((o) => o.id === id)?.collapsed;

describe('initial expand (T97 rows 1-9)', () => {
  it('row 1: our root under a governing org shows three levels', () => {
    const orgs = [org('root'), org('ours', 'root'), org('kid', 'ours'), org('grandkid', 'kid')];
    // Open = our root and its ancestors. `collapsed` hides children, so an open
    // «ours» is what puts `kid` on screen, and a closed `kid` is what keeps
    // `grandkid` off it.
    expect(openIds(orgs, 'ours')).toEqual(['ours', 'root']);

    const next = applyInitialExpand(orgs, 'ours');
    expect(collapsedOf(next, 'root')).toBe(false);
    expect(collapsedOf(next, 'ours')).toBe(false);
    expect(collapsedOf(next, 'kid')).toBe(true);
  });

  it('row 2: our root being the diagram root shows two levels', () => {
    const orgs = [org('ours'), org('kid', 'ours'), org('grandkid', 'kid')];
    expect(openIds(orgs, 'ours')).toEqual(['ours']);

    const next = applyInitialExpand(orgs, 'ours');
    expect(collapsedOf(next, 'ours')).toBe(false);
    expect(collapsedOf(next, 'kid')).toBe(true);
  });

  it('row 3: our root deeper down opens the chain and closes its siblings', () => {
    const orgs = [
      org('root'),
      org('a', 'root'),
      org('a-sib', 'root'),
      org('b', 'a'),
      org('b-sib', 'a'),
      org('ours', 'b'),
      org('kid', 'ours'),
    ];
    expect(openIds(orgs, 'ours')).toEqual(['a', 'b', 'ours', 'root']);

    const next = applyInitialExpand(orgs, 'ours');
    // The chain is open so our root can be seen at all…
    expect(collapsedOf(next, 'a')).toBe(false);
    expect(collapsedOf(next, 'b')).toBe(false);
    // …and the siblings along it stay shut, because the promise is a minimum.
    expect(collapsedOf(next, 'a-sib')).toBe(true);
    expect(collapsedOf(next, 'b-sib')).toBe(true);
    expect(collapsedOf(next, 'kid')).toBe(true);
  });

  it('row 5: what the host sent is overwritten — that is what «the SDK computes» means', () => {
    // Host opened everything, including a branch B1 says to keep shut.
    const orgs = [org('root'), org('ours', 'root'), org('kid', 'ours'), org('deep', 'kid')];
    const next = applyInitialExpand(orgs, 'ours');
    expect(collapsedOf(next, 'kid')).toBe(true);
    expect(collapsedOf(next, 'deep')).toBe(true);
  });

  it('row 6: a forest keeps the other roots shut', () => {
    const orgs = [org('ours'), org('kid', 'ours'), org('other'), org('other-kid', 'other')];
    const next = applyInitialExpand(orgs, 'ours');
    expect(collapsedOf(next, 'ours')).toBe(false);
    expect(collapsedOf(next, 'other')).toBe(true);
    expect(collapsedOf(next, 'other-kid')).toBe(true);
  });

  it('row 6b: with no root named, every root of the forest is «ours»', () => {
    const orgs = [org('one'), org('one-kid', 'one'), org('two'), org('two-kid', 'two')];
    expect(openIds(orgs)).toEqual(['one', 'two']);
  });

  it('row 7: a tree shallower than the rule shows what exists, and is not an error', () => {
    const orgs = [org('ours')];
    const next = applyInitialExpand(orgs, 'ours');
    expect(collapsedOf(next, 'ours')).toBe(false);
    expect(next).toHaveLength(1);
  });

  it('row 8: no organisations at all is a valid state', () => {
    expect(applyInitialExpand([], 'ours')).toEqual([]);
    expect(openIds([])).toEqual([]);
  });

  it('row 9: a parent that does not exist makes the org a root, not an orphan', () => {
    const orgs = [org('ours', 'ghost'), org('kid', 'ours')];
    // The walk stops at the missing parent rather than dropping our root.
    expect(openIds(orgs, 'ours')).toEqual(['ours']);
    expect(collapsedOf(applyInitialExpand(orgs, 'ours'), 'ours')).toBe(false);
  });

  it('failure: an unknown root id falls back to the roots rather than opening nothing', () => {
    const orgs = [org('root'), org('kid', 'root')];
    expect(openIds(orgs, 'nobody')).toEqual(['root']);
  });

  it('failure: a cycle terminates instead of spinning', () => {
    // validateOrgHierarchy refuses this at create(), but the function is
    // exported and can be handed data that never went through it.
    const orgs = [org('a', 'b'), org('b', 'a')];
    expect(openIds(orgs, 'a')).toEqual(['a', 'b']);
  });
});
