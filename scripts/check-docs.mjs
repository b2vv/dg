/**
 * Documentation freshness gate — run before pushing.
 *
 * Every check here exists because the drift it catches actually happened, and
 * nothing in the repo noticed:
 *
 *   1. Links. Archiving 97 closed tasks left thirteen dead links inside the
 *      tasks that survived, because the sweep checked the documents that cite
 *      tasks and not the tasks that cite each other (`ade232e`).
 *   2. Public API. `docs/USAGE.md` is not just documentation here — the
 *      pipeline threshold in `.claude/standards.md` defines the public API as
 *      «what `docs/USAGE.md` describes». A method missing from it is therefore
 *      invisible to the process that decides how carefully it may be changed.
 *      Twenty-one methods were missing when this check was written, three of
 *      them the mutators T104 is about.
 *   3. Barrel surface. The public entry point re-exported two `*ForTests`
 *      hooks that mutate process-wide WASM state, so one consumer reached
 *      every diagram in the host app. Nothing pointed at them: the name said
 *      «for tests» and the export said «for everyone» (T105).
 *   4. Briefing basis. `AGENTS.md` says to refresh `work/CTO-RESEARCH.md` when
 *      it falls «more than a few merged PRs» behind. That was unmeasurable, so
 *      it was never enforced; the number below is what «a few» means now.
 *
 * Exit code 0 = every check held. Run: `npm run check:docs`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const problems = [];
const notes = [];

/** Markdown files that are part of the repo's own guidance, not build output. */
function markdownFiles() {
  const roots = ['work', 'docs', '.claude', 'e2e'];
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.git')) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.md')) out.push(full);
    }
  };
  for (const r of roots) {
    const full = join(ROOT, r);
    try {
      if (statSync(full).isDirectory()) walk(full);
    } catch {
      // A root that does not exist is not an error — the repo may drop one.
    }
  }
  for (const entry of readdirSync(ROOT)) {
    if (entry.endsWith('.md')) out.push(join(ROOT, entry));
  }
  return out;
}

// ── 1. Every relative markdown link resolves ────────────────────────────────
const LINK = /\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g;
for (const file of markdownFiles()) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(LINK)) {
    const target = match[1];
    if (/^[a-z]+:\/\//.test(target)) continue;
    const resolved = target.startsWith('/')
      ? join(ROOT, target.slice(1))
      : resolve(dirname(file), target);
    try {
      statSync(resolved);
    } catch {
      problems.push(`битий лінк: ${relative(ROOT, file)} → ${target}`);
    }
  }
}

// ── 2. No new public method escapes docs/USAGE.md ───────────────────────────
/**
 * Methods that are public in TypeScript but were already undocumented when
 * this gate went in. The list is a debt baseline: it may shrink, never grow.
 * Removing a name from here is the act of documenting the method.
 *
 * 21 → 16 on 2026-09-05: the five mutators went out with T104. They had to —
 * the pipeline threshold defines the public API as «what `docs/USAGE.md`
 * describes», so the three with the worst failure semantics in the codebase
 * were also the least protected by process until they were written down.
 */
const UNDOCUMENTED_BASELINE = new Set([
  'focusByTestId',
  'getCanvas',
  'getLastContextMenu',
  'getStaffExpandedOrgIds',
  'getStaffExpandedPositionIds',
  'getStaffFocus',
  'getZoom',
  'listTestAnchors',
  'openContextMenu',
  'resolveTestId',
  'runContextMenuAction',
  'setStaffFocus',
  'setTheme',
  'setViewport',
  'subscribePromoteSync',
]);

const facade = readFileSync(join(ROOT, 'packages/sdk/src/OrgHierarchyDiagram.ts'), 'utf8');
const usage = readFileSync(join(ROOT, 'docs/USAGE.md'), 'utf8');
const publicMethods = new Set();
for (const line of facade.split('\n')) {
  if (/^ {2}(private|protected)\s/.test(line)) continue;
  const m = /^ {2}(?:async\s+)?([a-z][A-Za-z0-9_]*)\s*(?:<[^>]*>)?\(/.exec(line);
  if (m && m[1] !== 'constructor') publicMethods.add(m[1]);
}

const undocumented = [...publicMethods].filter((name) => !usage.includes(name)).sort();
const fresh = undocumented.filter((name) => !UNDOCUMENTED_BASELINE.has(name));
const fixed = [...UNDOCUMENTED_BASELINE].filter((name) => !undocumented.includes(name)).sort();

for (const name of fresh) {
  problems.push(
    `публічний метод поза docs/USAGE.md: ${name}() — поріг пайплайна його не побачить`,
  );
}
if (fixed.length > 0) {
  notes.push(
    `задокументовано з часу базової лінії: ${fixed.join(', ')} — приберіть їх з ` +
      'UNDOCUMENTED_BASELINE у scripts/check-docs.mjs, щоб борг не зміг повернутись',
  );
}

// ── 3. The briefing has not fallen behind main ──────────────────────────────
const MAX_COMMITS_BEHIND = 25;
const briefing = readFileSync(join(ROOT, 'work/CTO-RESEARCH.md'), 'utf8');
const basis = /\*\*Базис:\*\*[^`]*`[^`]*`\s*@\s*`([0-9a-f]{7,40})`/.exec(briefing);
if (basis) {
  const sha = basis[1];
  let behind = null;
  try {
    behind = Number(
      execFileSync('git', ['rev-list', '--count', `${sha}..HEAD`], {
        cwd: ROOT,
        encoding: 'utf8',
      }).trim(),
    );
  } catch {
    // A shallow clone genuinely does not have the commit; that is a property of
    // the checkout, not of the documentation. Saying «stale» there would be a
    // false accusation, and a gate that cries wolf gets switched off.
    let shallow = false;
    try {
      shallow =
        execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
          cwd: ROOT,
          encoding: 'utf8',
        }).trim() === 'true';
    } catch {
      shallow = false;
    }
    if (shallow) {
      notes.push(
        `базис \`${sha}\` недосяжний у мілкому клоні — перевірку свіжості брифінгу пропущено`,
      );
    } else {
      problems.push(`work/CTO-RESEARCH.md: базис \`${sha}\` не знайдено в історії`);
    }
  }
  if (behind !== null) {
    if (behind > MAX_COMMITS_BEHIND) {
      problems.push(
        `work/CTO-RESEARCH.md відстав на ${behind} комітів від HEAD (межа ${MAX_COMMITS_BEHIND}) — ` +
          'перезберіть брифінг перед плануванням, інакше він навчатиме неправди',
      );
    } else {
      notes.push(`брифінг відстає на ${behind} комітів з ${MAX_COMMITS_BEHIND} дозволених`);
    }
  }
} else {
  problems.push('work/CTO-RESEARCH.md: не знайдено рядок «**Базис:** … @ `<sha>`»');
}

// ── 4. The public barrel exposes no test hooks ──────────────────────────────
/**
 * `packages/sdk/src/index.ts` is the public entry point, and until T105 it
 * re-exported `resetContourWasmForTests` and `setContourWasmLoaderForTests` —
 * two functions that mutate the *process-wide* WASM loader and cache
 * (`contour/bridge.ts:106,112`), so one consumer reaches every diagram in the
 * host app. All nine test files that use them import from `contour/bridge.js`
 * directly; none took them from the barrel. The convention already held in
 * five other places in the SDK — the barrel was the exception.
 *
 * This reads the *text*, not a runtime namespace, on purpose: an
 * `import * as` sees only value exports, and the barrel has 15 `export type`
 * blocks, so an `export type { FooForTests }` would be invisible to it.
 *
 * What it guards is the *naming convention*, not «no test hooks in the
 * barrel»: a hook named `__setLoader` would walk straight past it. No machine
 * check for «this is a test hook» exists, so the promise is narrowed to what
 * it actually catches.
 */
const BARREL = 'packages/sdk/src/index.ts';
let barrel = null;
try {
  barrel = readFileSync(join(ROOT, BARREL), 'utf8');
} catch {
  // Unreadable is a failure, not an uptrace: a barrel nobody can read is a
  // barrel whose contents nobody has checked.
  problems.push(`${BARREL} не читається — склад публічного барелю неперевірений`);
}
if (barrel !== null) {
  // Comments are stripped first, so that naming the removed hooks in a comment
  // above the exports cannot turn this gate permanently red.
  const code = barrel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const exported = new Set();
  for (const m of code.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) exported.add(name);
    }
  }
  for (const m of code.matchAll(
    /export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/g,
  )) {
    exported.add(m[1]);
  }

  if (/export\s+\*/.test(code)) {
    problems.push(
      `${BARREL}: зірковий реекспорт (\`export *\`) робить склад барелю неперевірним текстом`,
    );
  }
  if (exported.size === 0) {
    // A sentinel: an empty barrel would otherwise be the greenest possible state.
    problems.push(`${BARREL}: не знайдено жодного експорту — перевірка складу барелю сліпа`);
  }
  for (const name of [...exported].filter((n) => n.endsWith('ForTests')).sort()) {
    problems.push(
      `тестовий хук у публічному барелі: ${name} — тримайте скидач у своєму модулі ` +
        '(конвенція діє в п’яти інших місцях SDK)',
    );
  }
}

// ── report ──────────────────────────────────────────────────────────────────
for (const note of notes) console.log(`· ${note}`);
if (problems.length === 0) {
  console.log('✅ дока свіжа: лінки резолвяться, публічний API описаний, барель без тест-хуків, брифінг у межах');
  process.exit(0);
}
console.error(`\n❌ ${problems.length} проблем(и) зі свіжістю доки:\n`);
for (const p of problems) console.error(`  ${p}`);
console.error('');
process.exit(1);
