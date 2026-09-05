/**
 * Reads what the SDK's public barrel exports — by text, on purpose.
 *
 * A runtime `import * as` would see only value exports, and the barrel has
 * fifteen `export type` blocks, so `export type { FooForTests }` would be
 * invisible to it.
 *
 * Lives in its own module so it can be tested (`barrelSurface.test.mjs`);
 * `check-docs.mjs` owns the file reading and the reporting.
 */

/** Exported names in `source`, with comments and `type` modifiers stripped. */
export function exportedNames(source) {
  // Comments go first, so that naming a removed hook in a comment above the
  // exports cannot make the gate permanently red.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const names = new Set();
  for (const match of code.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) {
      // `X as Y` exports Y; `type X` exports X — the modifier is not the name.
      const name = part.trim().split(/\s+as\s+/).pop()?.trim().replace(/^type\s+/, '');
      if (name) names.add(name);
    }
  }
  for (const match of code.matchAll(
    /export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/g,
  )) {
    names.add(match[1]);
  }
  return { names, hasStarExport: /export\s+\*/.test(code) };
}

/**
 * Problems with the barrel's composition, in the language the gate prints.
 *
 * What this guards is the *naming convention*, not «no test hooks in the
 * barrel»: a hook called `__setLoader` walks straight past it. No machine
 * check for «this is a test hook» exists, so the promise is narrowed to what
 * it actually catches.
 */
export function barrelProblems(source, label) {
  const problems = [];
  const { names, hasStarExport } = exportedNames(source);
  if (hasStarExport) {
    problems.push(`${label}: зірковий реекспорт (\`export *\`) робить склад барелю неперевірним текстом`);
  }
  if (names.size === 0) {
    // A sentinel: an empty barrel would otherwise be the greenest possible state.
    problems.push(`${label}: не знайдено жодного експорту — перевірка складу барелю сліпа`);
  }
  for (const name of [...names].filter((n) => n.endsWith('ForTests')).sort()) {
    problems.push(
      `тестовий хук у публічному барелі: ${name} — тримайте скидач у своєму модулі ` +
        '(конвенція діє в трьох інших місцях SDK)',
    );
  }
  return problems;
}
