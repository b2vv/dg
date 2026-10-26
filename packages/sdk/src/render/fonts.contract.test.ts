import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from '@rstest/core';

function renderSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? renderSources(path)
      : /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

// Require inline font styles at each construction site. Unknown/indirect styles
// fail closed, so introducing a shared TextStyle requires extending this guard.
function missingFonts(source: string): number[] {
  const missing: number[] = [];
  for (const match of source.matchAll(/new\s+(?:\w+\.)?Text(?:Style)?\s*\(/g)) {
    const start = match.index + match[0].length;
    const args = constructorArguments(source, start);
    const style = match[0].includes('TextStyle')
      ? args : /\bstyle\s*:\s*\{([^{}]*)\}/.exec(args)?.[1];
    if (!style || !/\bfontFamily\s*:\s*\w*[Tt]heme\.fonts\??\.(sans|mono|serif)\b/.test(style)) {
      missing.push(source.slice(0, match.index).split('\n').length);
    }
  }
  return missing;
}

function constructorArguments(source: string, start: number): string {
  let depth = 1;
  let quote = '';
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = '';
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (!depth) return source.slice(start, i);
    }
  }
  return '';
}

it('every render Text / TextStyle explicitly reads theme fonts (recursive discovery)', () => {
  const files = renderSources(join(process.cwd(), 'src/render'));
  expect(files.length).toBeGreaterThan(0);
  const failures = files.flatMap((path) => missingFonts(readFileSync(path, 'utf8')).map((line) => `${path}:${line}`));
  expect(failures).toEqual([]);
});

it('contract rejects omitted and hardcoded fonts, including an extra Text in the same file', () => {
  expect(missingFonts(`new Text({style: {fontFamily: theme.fonts?.sans ?? 'Arial'}});
    new Text({style: {fontSize: 12}});
    new TextStyle({fontFamily: 'Arial'});`)).toEqual([2, 3]);
});
