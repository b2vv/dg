import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { relatedStaffIds, type InteractionState, type NodeRef } from '@org-hierarchy/sdk';
import { describe, expect, it } from '@rstest/core';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PromoteBackdropProps } from '@org-hierarchy/sdk/react';
import {
  makeStaffChromeBackdrop,
  type StaffChromeWithFound,
} from './StaffChromeBackdrop.js';

const EMPTY: StaffChromeWithFound = { org: null, depts: [], lines: [], nodeBoxes: {}, foundId: null };

/** Identity-camera props (scale 1, no pan): world coords == screen, transform is identity. */
function props(over: Partial<PromoteBackdropProps> = {}): PromoteBackdropProps {
  return {
    viewport: { x: 0, y: 0, scale: 1 },
    screen: { width: 800, height: 600 },
    lod: 'near',
    worldTransform: 'translate(0px, 0px) scale(1)',
    ...over,
  } as PromoteBackdropProps;
}

describe('makeStaffChromeBackdrop — one camera transform (Б2)', () => {
  it('draws world coords raw under a single worldTransform layer (no per-element math)', () => {
    const geom: StaffChromeWithFound = {
      org: null,
      depts: [{ departmentId: 'd1', x: 100, y: 50, width: 200, height: 160, name: 'Dept', count: 3 }],
      lines: [],
      nodeBoxes: {},
      foundId: null,
    };
    const html = renderToStaticMarkup(
      makeStaffChromeBackdrop(() => geom)(props({
        viewport: { x: 5, y: 7, scale: 2 },
        worldTransform: 'translate(5px, 7px) scale(2)',
      }))!,
    );
    // The layer carries the camera transform ONCE…
    expect(html).toContain('transform:translate(5px, 7px) scale(2)');
    expect(html).toContain('transform-origin:0 0');
    // …and the dept box keeps RAW world coords (100/50), NOT 100·2+5 etc.
    expect(html).toContain('left:100px');
    expect(html).toContain('top:50px');
    expect(html).toContain('Dept');
    expect(html).toContain('3 поз.');
  });

  it('connector lines go in an SVG <g> with the world transform + non-scaling stroke', () => {
    const geom: StaffChromeWithFound = {
      ...EMPTY,
      lines: [{ fromId: 'a', toId: 'b', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], endsOnDeptTop: true }],
    };
    const html = renderToStaticMarkup(
      makeStaffChromeBackdrop(() => geom)(props({
        viewport: { x: 0, y: 0, scale: 3 },
        worldTransform: 'translate(0px, 0px) scale(3)',
      }))!,
    );
    expect(html).toContain('<g transform="translate(0px, 0px) scale(3)">');
    expect(html).toContain('vector-effect="non-scaling-stroke"');
    expect(html).toContain('data-from="a"');
    expect(html).toContain('data-to="b"');
  });

  it('far lod or no geometry → nothing', () => {
    expect(makeStaffChromeBackdrop(() => EMPTY)(props({ lod: 'far' }))).toBeNull();
    expect(makeStaffChromeBackdrop(() => null)(props())).toBeNull();
  });

  it('found marker (§8.2): foundId → v3 white ring + «Знайдено» chip', () => {
    const geom: StaffChromeWithFound = {
      ...EMPTY,
      nodeBoxes: { p1: { x: 10, y: 20, width: 50, height: 30 } },
      foundId: 'p1',
    };
    const html = renderToStaticMarkup(makeStaffChromeBackdrop(() => geom)(props())!);
    expect(html).toContain('data-staff-found="p1"');
    expect(html).toContain('staff-found'); // pulse/glow class
    expect(html).toContain('outline:2px solid #fff'); // v3 white ring
    expect(html).toContain('Знайдено'); // chip text
    expect(html).toContain('#111113'); // chip dark text colour (v3)

    const empty = renderToStaticMarkup(
      makeStaffChromeBackdrop(() => ({ ...geom, foundId: null }))(props())!,
    );
    expect(empty).not.toContain('data-staff-found');
    expect(empty).not.toContain('Знайдено');
  });

  it('found marker: unknown foundId (collapsed/absent node) → no marker, no throw', () => {
    const geom: StaffChromeWithFound = {
      ...EMPTY,
      nodeBoxes: { p1: { x: 0, y: 0, width: 10, height: 10 } },
      foundId: 'ghost', // not in nodeBoxes (e.g. inside a collapsed subtree)
    };
    const html = renderToStaticMarkup(makeStaffChromeBackdrop(() => geom)(props())!);
    expect(html).not.toContain('data-staff-found');
  });
});

describe('staff host helpers (collapse / search / hover)', () => {
  it('relatedStaffIds: hovered + both endpoints of touching lines; boundary = just itself', () => {
    const lines = [
      { fromId: 'ceo', toId: 'cfo' },
      { fromId: 'cfo', toId: 'acc' },
      { fromId: 'cto', toId: 'dev' }, // unrelated to cfo
    ];
    expect([...relatedStaffIds(lines, 'cfo')].sort()).toEqual(['acc', 'ceo', 'cfo']);
    expect([...relatedStaffIds(lines, 'lonely')]).toEqual(['lonely']);
    expect([...relatedStaffIds([], 'x')]).toEqual(['x']);
  });

});


describe('store-driven connector hover', () => {
  for (const invalid of [null, { kind: 'position', id: 'missing' }, { kind: 'organization', id: 'a' }] satisfies (NodeRef | null)[]) {
    it(`restores connector baseline after ${JSON.stringify(invalid)}`, async () => {
      const listeners = new Set<(state: InteractionState) => void>();
      const diagram = {
        subscribeInteraction(cb: (state: InteractionState) => void) {
          listeners.add(cb);
          return () => { listeners.delete(cb); };
        },
      };
      const geom: StaffChromeWithFound = {
        ...EMPTY,
        nodeBoxes: { a: { x: 0, y: 0, width: 10, height: 10 } },
        lines: [
          { fromId: 'a', toId: 'b', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], endsOnDeptTop: true },
          { fromId: 'c', toId: 'd', points: [{ x: 20, y: 0 }, { x: 30, y: 10 }], endsOnDeptTop: true },
        ],
      };
      const Backdrop = makeStaffChromeBackdrop(() => geom, () => diagram);
      const mount = document.createElement('div');
      const root = createRoot(mount);
      const emit = async (hovered: NodeRef | null) => {
        await act(async () => { for (const cb of listeners) cb({ hovered, primary: null, selected: [] }); });
      };
      try {
        await act(async () => root.render(createElement(Backdrop, props())));
        await emit({ kind: 'position', id: 'a' });
        expect(mount.querySelector('path')?.getAttribute('stroke')).toBe('#ff8d68');
        expect(mount.querySelector('path')?.getAttribute('stroke-width')).toBe('2.5');
        expect(mount.querySelector('circle')?.getAttribute('fill')).toBe('#ff8d68');
        expect(mount.querySelector<SVGElement>('path[data-from="c"]')?.style.opacity).toBe('0.18');
        await emit(invalid);
        expect(mount.querySelector('path')?.getAttribute('stroke')).toBe('#c2502a');
        expect(mount.querySelector('path')?.getAttribute('stroke-width')).toBe('2');
        expect(mount.querySelector('circle')?.getAttribute('fill')).toBe('#c2502a');
        expect(mount.querySelector<SVGElement>('path[data-from="c"]')?.style.opacity).toBe('1');
        expect(listeners.size).toBe(1);
      } finally {
        await act(async () => root.unmount());
      }
      expect(listeners.size).toBe(0);
    });
  }
});
