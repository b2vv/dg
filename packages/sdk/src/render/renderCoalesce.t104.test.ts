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
