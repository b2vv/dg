/**
 * Checks that `docs/USAGE.md` still describes the seat-collision contract.
 *
 * T111 added two things to the public surface — the `onSeatCollision` callback
 * and `displacedPositionId` on the `position-move` patch — and one thing that
 * no type can carry: **the reason positions and organizations behave
 * differently** when a drop lands on an occupied cell. Organizations eject the
 * occupant from the matrix (`ejectedOrgId`); seats push, swap or ask. Both are
 * deliberate, and a reader who meets only one of them reads the other as a bug.
 *
 * A type signature cannot state that. Prose can, and prose rots silently — so
 * the gate keeps it honest instead of trusting it.
 *
 * Lives in its own module so it can be tested (`seatCollisionDocs.test.mjs`);
 * `check-docs.mjs` owns the file reading and the reporting. It cannot import
 * `check-docs.mjs` itself: that file runs at the top level and ends in
 * `process.exit`.
 */

/**
 * Names the seat-collision contract has to mention, and why each one matters.
 *
 * Kept as data rather than a list of `if`s so the failure message can say what
 * is missing and what it is for, not merely that something is.
 */
export const SEAT_COLLISION_TERMS = [
  {
    term: 'onSeatCollision',
    why: 'the callback a host implements to settle a drop the SDK will not guess at',
  },
  {
    term: 'displacedPositionId',
    why: 'the field on the `position-move` patch naming the seat that was pushed or swapped',
  },
  {
    term: 'ejectedOrgId',
    why: 'the organization-matrix counterpart, named so the two semantics are contrasted rather than confused',
  },
];

/**
 * Problems with the seat-collision section of `usage`, empty when it holds.
 *
 * @param {string} usage Contents of `docs/USAGE.md`.
 * @param {string} label Path to name in messages.
 * @returns {string[]}
 */
export function seatCollisionDocProblems(usage, label = 'docs/USAGE.md') {
  // Fenced code blocks count: a callback is documented as much by the snippet
  // a host copies as by the sentence above it. What does not count is a bare
  // mention inside a comment — but stripping comments here would also strip
  // the explanatory ones inside those snippets, which are the point.
  const problems = [];
  for (const { term, why } of SEAT_COLLISION_TERMS) {
    if (!usage.includes(term)) {
      problems.push(`${label}: missing \`${term}\` — ${why} (T111 / spec A8)`);
    }
  }
  return problems;
}
