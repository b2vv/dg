import { expect, test, type Page } from '@playwright/test';

/**
 * T104 in a real browser.
 *
 * The unit and contract tests for this live in jsdom, which has no layout — so
 * they can prove the *order of calls* but never what the contract promises a
 * host: **a patch you receive is already on the screen**.
 *
 * The demo records, for every `onLayoutChange`, the rendered node boxes as they
 * stood at that instant. Comparing those against the boxes from before the edit
 * is what lets this test fail: under the old ordering the patch fired first, so
 * the geometry captured with it would still be the pre-edit layout.
 *
 * Not driven by a drag. The gesture is already covered by
 * `personDrag.contract.test.ts`; what was missing was a real layout at patch
 * time, and calling the same public method directly is the shortest way there.
 */

type Anchor = { testId: string; x: number; y: number; width: number; height: number };
type Entry = { patch: { type?: string }; anchors: Anchor[] };

const bridgeCall = <T,>(page: Page, method: string, args: unknown[] = []) =>
  page.evaluate(
    ([name, a]) => {
      const b = (window as unknown as { __demoE2e?: Record<string, (...x: unknown[]) => unknown> })
        .__demoE2e;
      if (!b?.[name as string]) throw new Error(`__demoE2e.${String(name)} missing — need ?e2e=1`);
      return b[name as string]!(...(a as unknown[])) as unknown;
    },
    [method, args] as const,
  ) as Promise<T>;

/** Positions only: a card that re-rendered without moving proves nothing. */
const layout = (list: Anchor[]) =>
  [...list]
    .sort((a, b) => a.testId.localeCompare(b.testId))
    .map((a) => `${a.testId}@${a.x},${a.y}`)
    .join('|');

test.describe('T104 — a layout patch means the frame already drew', () => {
  test('the patch carries a layout that already moved', async ({ page }) => {
    await page.goto('/?e2e=1');
    await expect(page.locator('[data-testid="diagram-ready"]')).toBeVisible({ timeout: 60_000 });

    // Nothing edited yet, so nothing may have been announced.
    expect(await bridgeCall<Entry[]>(page, 'getLayoutPatchLog')).toHaveLength(0);

    const before = layout(await bridgeCall<Anchor[]>(page, 'getAnchors'));
    expect(before.length).toBeGreaterThan(0);

    // The bottom-middle cell of the Variant B grid is empty, so this moves a
    // card that everything else is laid out around. Position id, not test id —
    // the two differ here, and passing the wrong one looks exactly like a
    // refused edit.
    const threw = await bridgeCall<string | null>(page, 'moveSeat', ['P1', 1, 2]);
    expect(threw).toBeNull();

    const log = await bridgeCall<Entry[]>(page, 'getLayoutPatchLog');
    // An edit the rules refuse resolves without announcing anything, so an
    // empty log here means the fixture stopped supporting this move — a broken
    // test, not a passing one.
    expect(log, 'the move was refused — this test no longer exercises anything').toHaveLength(1);
    expect(log[0]!.patch.type).toBe('position-move');

    // The discriminator. Geometry captured *with* the patch must already differ
    // from the pre-edit picture; had the announcement still preceded the frame,
    // these would match and this line would fail.
    expect(layout(log[0]!.anchors)).not.toBe(before);

    // And once settled the diagram agrees with what the host was told.
    expect(layout(await bridgeCall<Anchor[]>(page, 'getAnchors'))).toBe(layout(log[0]!.anchors));
  });
});
