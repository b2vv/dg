import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { orgModeDocProblems, ORG_MODE_SECTION, ORG_MODE_TERMS } from './orgModeDocs.mjs';

const ROOT = resolve(import.meta.dirname, '..');

const section = (body) => `## 7. Сцени\n\n### ${ORG_MODE_SECTION}\n\n${body}\n\n## 8. Далі\n`;

test('success: a section that qualifies both mode accessors passes', () => {
  assert.deepEqual(
    orgModeDocProblems(section('`getOrgMode()` каже про діаграму. `onOrgModeChange` теж.')),
    [],
  );
});

test('failure: a missing section is reported, not silently accepted', () => {
  const problems = orgModeDocProblems('## 7. Сцени\n\nнічого про режим\n');
  assert.equal(problems.length, 1);
  // `includes`, not a RegExp: the section name carries «(T113)», and parentheses
  // in a pattern are a capture group — the regex would have matched a string
  // that does not contain the name at all.
  assert.ok(problems[0].includes(ORG_MODE_SECTION));
});

test('failure: the section exists but names neither accessor', () => {
  const problems = orgModeDocProblems(section('Набір згорнутих братів лягає сіткою.'));
  assert.equal(problems.length, ORG_MODE_TERMS.length);
  for (const term of ORG_MODE_TERMS) {
    assert.ok(
      problems.some((p) => p.includes(term)),
      `expected ${term} to be reported missing`,
    );
  }
});

test('failure: an accessor mentioned elsewhere but not in the section does not count', () => {
  // The whole point is that the qualification sits next to the rule. A mention
  // three sections away leaves the reader with the same half-truth.
  const doc = `## 3. Старт\n\n\`getOrgMode()\` повертає режим.\n\n${section('Сітка є.')}`;
  const problems = orgModeDocProblems(doc);
  assert.ok(problems.some((p) => p.includes('getOrgMode')));
});

test('failure: the section stops at the next heading of the same level', () => {
  // Otherwise a later section could satisfy this one by accident.
  const doc =
    `### ${ORG_MODE_SECTION}\n\nСітка є.\n\n### Інше\n\n\`getOrgMode()\` \`onOrgModeChange\`\n`;
  assert.ok(orgModeDocProblems(doc).length > 0);
});

test('the real docs/USAGE.md satisfies the gate', () => {
  // A unit test that only ever saw fixtures would stay green through the exact
  // drift this module exists to catch.
  const usage = readFileSync(join(ROOT, 'docs/USAGE.md'), 'utf8');
  assert.deepEqual(orgModeDocProblems(usage), []);
});
