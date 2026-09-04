import { describe, expect, it } from '@rstest/core';
import { createRenderCoalesce } from './renderCoalesce.js';

/**
 * T104 groundwork. The rollback question in `OrgHierarchyDiagram` cannot be
 * answered while `schedule()` reports on something other than the caller's own
 * work, so this pins that down first — no DOM, no diagram, seconds to run.
 */
describe('createRenderCoalesce — what a caller is told about', () => {
  it('failure: a caller whose pass succeeded is still handed the next pass failure', async () => {
    let pass = 0;
    const gate: Array<() => void> = [];
    const coalesce = createRenderCoalesce(async () => {
      pass += 1;
      if (pass === 1) {
        // Hold pass 1 open long enough for a second caller to join.
        await new Promise<void>((r) => {
          gate.push(r);
        });
        return;
      }
      throw new Error('pass 2 exploded');
    });

    const first = coalesce.schedule();
    // B arrives while pass 1 is in flight: it only sets `dirty` and gets the
    // same promise back — which is the whole point being measured.
    const second = coalesce.schedule();
    gate[0]?.();

    const firstOutcome = await first.then(
      () => 'resolved',
      (e: Error) => `rejected: ${e.message}`,
    );
    const secondOutcome = await second.then(
      () => 'resolved',
      (e: Error) => `rejected: ${e.message}`,
    );

    // The first caller's own render drew. It should not inherit the verdict of
    // work it did not ask for — otherwise a mutator cannot tell "my change
    // failed" from "someone else's did", and rolls back a drawn change.
    expect(firstOutcome).toBe('resolved');
    expect(secondOutcome).toBe('rejected: pass 2 exploded');
  });
});

/**
 * The second lie, reached the other way round. A caller's own pass succeeds —
 * so it has no failure to react to — yet the change it announced was wiped by
 * a *neighbour's* rollback before that pass ever drew.
 */
describe('createRenderCoalesce — a pass that draws someone else’s rollback', () => {
  it('failure: the follow-up pass succeeds even though the state it drew was rolled back', async () => {
    const drawn: string[] = [];
    let state = 'D0';
    let pass = 0;
    const gate: Array<() => void> = [];
    const coalesce = createRenderCoalesce(async () => {
      pass += 1;
      if (pass === 1) {
        await new Promise<void>((r) => {
          gate.push(r);
        });
        throw new Error('pass 1 exploded');
      }
      drawn.push(state);
    });

    // Registration order matters and mirrors the real one: A awaits its own
    // render (registering its catch) before B ever calls a mutator, so A's
    // rollback lands before the follow-up pass draws.
    state = 'D1';
    const first = coalesce.schedule();
    const aSettled = first.catch(() => {
      // A rolls back to the last drawn state, taking B's edit with it.
      state = 'D0';
    });

    state = 'D2';
    const second = coalesce.schedule();

    gate[0]?.();
    await aSettled;
    await second;

    // B's pass resolved, so B believes its edit is on screen. It is not: the
    // frame drew the rolled-back state. Nothing in B's own outcome says so.
    expect(drawn).toEqual(['D0']);
    await expect(second).resolves.toBeUndefined();
  });
});
