import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { seatCollisionDocProblems, SEAT_COLLISION_TERMS } from './seatCollisionDocs.mjs';

const ROOT = resolve(import.meta.dirname, '..');

test('success: a doc naming all three terms passes', () => {
  const usage = `
    ## Seat collisions
    Pass \`onSeatCollision\` to settle a diagonal drop.
    The patch carries \`displacedPositionId\`.
    Organizations differ: the matrix reports \`ejectedOrgId\` instead.
  `;
  assert.deepEqual(seatCollisionDocProblems(usage), []);
});

test('failure: each missing term is reported on its own, with its reason', () => {
  for (const { term } of SEAT_COLLISION_TERMS) {
    const usage = SEAT_COLLISION_TERMS.filter((t) => t.term !== term)
      .map((t) => t.term)
      .join(' ');
    const problems = seatCollisionDocProblems(usage);
    assert.equal(problems.length, 1, `expected exactly one problem when ${term} is absent`);
    assert.match(problems[0], new RegExp(term));
    // The message has to say what the term is *for*: a gate that only says
    // "missing" sends the next reader to git log to find out why it matters.
    assert.ok(problems[0].length > term.length + 20, 'message should carry the reason');
  }
});

test('failure: an empty doc reports every term rather than stopping at the first', () => {
  assert.equal(seatCollisionDocProblems('').length, SEAT_COLLISION_TERMS.length);
});

test('the label is used verbatim, so the message points at a real path', () => {
  const [problem] = seatCollisionDocProblems('', 'docs/OTHER.md');
  assert.match(problem, /^docs\/OTHER\.md:/);
});

test('the real docs/USAGE.md satisfies the gate', () => {
  // The gate and the document it guards, checked together: a unit test that
  // only ever sees fixtures would stay green through the exact drift this
  // module exists to catch.
  const usage = readFileSync(join(ROOT, 'docs/USAGE.md'), 'utf8');
  assert.deepEqual(seatCollisionDocProblems(usage), []);
});
