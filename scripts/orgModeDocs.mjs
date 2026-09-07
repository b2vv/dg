/**
 * Checks that `docs/USAGE.md` still says **what** `getOrgMode` is the mode of.
 *
 * T113 made the layout rule local: any set of siblings whose members are all
 * collapsed lays out as a grid, on every level. `getOrgMode()` and
 * `onOrgModeChange` were written when there was exactly one mode per diagram,
 * and they keep that meaning — a host asking «is this a tree or a grid right
 * now» still gets a true answer. What changed is that the word «mode» now has
 * two possible readings, and only prose can tell them apart.
 *
 * ⚠️ This gate is deliberately **structural, not a term list**. T113 adds no
 * new public identifier, so checking that some name appears would pass on a
 * document that never explains anything — ceremony rather than a gate, which
 * is the trap T110 recorded when it declined to add a doc-drift check. What is
 * checked instead is that a named section exists and that both accessors are
 * qualified *inside it*, next to the rule they are ambiguous about.
 *
 * Lives in its own module so it can be tested (`orgModeDocs.test.mjs`);
 * `check-docs.mjs` owns the file reading and the reporting, and cannot be
 * imported itself — it runs at the top level and ends in `process.exit`.
 */

/** Heading that has to carry the explanation. Stable: headings are not reworded casually. */
export const ORG_MODE_SECTION = 'Матриця згорнутих сиблінгів (T113)';

/** The two accessors whose meaning the section has to pin down. */
export const ORG_MODE_TERMS = ['getOrgMode', 'onOrgModeChange'];

/**
 * Text under `heading` up to the next heading of the same level or higher.
 *
 * Bounded on purpose: without it a later section could satisfy this one by
 * accident, and the reader who stopped at the rule would still be misinformed.
 *
 * @param {string} doc
 * @param {string} heading
 * @returns {string | null}
 */
function sectionBody(doc, heading) {
  const start = doc.indexOf(heading);
  if (start === -1) return null;
  const after = doc.slice(start + heading.length);
  const next = after.search(/\n#{1,3} /);
  return next === -1 ? after : after.slice(0, next);
}

/**
 * Problems with the org-mode section of `usage`, empty when it holds.
 *
 * @param {string} usage Contents of `docs/USAGE.md`.
 * @param {string} label Path to name in messages.
 * @returns {string[]}
 */
export function orgModeDocProblems(usage, label = 'docs/USAGE.md') {
  const body = sectionBody(usage, ORG_MODE_SECTION);
  if (body === null) {
    return [
      `${label}: немає розділу «${ORG_MODE_SECTION}» — після T113 правило розкладки локальне, ` +
        'і без цього розділу «режим» у доці має два сенси, а читач не знає, який (T113 / spec A9)',
    ];
  }
  return ORG_MODE_TERMS.filter((term) => !body.includes(term)).map(
    (term) =>
      `${label}: розділ «${ORG_MODE_SECTION}» не уточнює \`${term}\` — сказати, режим ЧОГО він ` +
      'називає, можна лише поруч із самим правилом (T113 / spec A9)',
  );
}
