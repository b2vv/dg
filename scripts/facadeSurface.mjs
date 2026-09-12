/**
 * Reads the public surface of `export class OrgHierarchyDiagram`.
 *
 * The original line-by-line scan was measured at 65 names although the facade
 * had 63 real methods: a module-level helper body happened to put `if` and
 * `for` at two spaces, so both keywords became phantom methods. The same scan
 * missed the facade's one accessor, `media`, because it tried to parse `get`
 * as the member name and then expected an opening parenthesis immediately.
 *
 * Restricting the scan to the class body removes the phantoms structurally: a
 * control-flow keyword cannot occur at exactly two spaces inside this class.
 * Accessors are parsed separately so the set carries their property names.
 * A missing class header throws so an unrun scan cannot silently pass the gate.
 */

/**
 * Public method and accessor names in `facadeSrc`.
 *
 * @param {string} facadeSrc Contents of `OrgHierarchyDiagram.ts`.
 * @returns {Set<string>}
 */
export function publicSurface(facadeSrc) {
  const names = new Set();
  let insideFacade = false;
  let facadeHeaderFound = false;

  for (const line of facadeSrc.split('\n')) {
    if (!insideFacade) {
      insideFacade = /^export class OrgHierarchyDiagram\b/.test(line);
      facadeHeaderFound ||= insideFacade;
      continue;
    }
    if (line === '}') break;
    if (/^ {2}(?:private|protected)\s/.test(line)) continue;

    const accessor = /^ {2}(?:get|set)\s+([a-z][A-Za-z0-9_]*)\s*\(/.exec(line);
    const method = /^ {2}(?:async\s+)?([a-z][A-Za-z0-9_]*)\s*(?:<[^>]*>)?\(/.exec(line);
    const name = accessor?.[1] ?? method?.[1];
    if (name && name !== 'constructor') names.add(name);
  }

  if (!facadeHeaderFound) {
    throw new Error(
      'The OrgHierarchyDiagram class header was not found in the source; the surface scan in scripts/facadeSurface.mjs therefore cannot run.',
    );
  }

  return names;
}
