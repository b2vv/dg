import { describe, expect, it } from '@rstest/core';
import type { DiagramData } from '@org-hierarchy/sdk';
import {
  computeStaffSearchHits,
  escapeRegExp,
  makeStaffSearchDropdown,
} from './StaffSearchDropdown.js';

/** The dropdown just created — the last `ul`, so a leak from a failed test cannot stand in. */
const lastList = (): HTMLElement => {
  const all = document.querySelectorAll<HTMLElement>('ul.sl[data-staff-search]');
  return all[all.length - 1]!;
};

function data(over: Partial<DiagramData> = {}): DiagramData {
  return {
    organizations: [],
    groups: [],
    departments: [{ id: 'fin', name: 'Фінанси', organizationId: 'org' }],
    persons: [{ id: 'per1', fullName: 'Коваленко Т. С.' }],
    positions: [],
    reportLines: [],
    orgLinks: [],
    ...over,
  } as unknown as DiagramData;
}

const positions = [
  { id: 'cfo', title: 'Фінансовий директор', organizationId: 'org', departmentId: 'fin', personId: 'per1', status: 'filled' },
  { id: 'fan', title: 'Фінансовий аналітик', organizationId: 'org', departmentId: 'fin', status: 'vacant' },
  { id: 'cook', title: 'Кухар', organizationId: 'other', departmentId: 'fin', status: 'filled' },
] as unknown as DiagramData['positions'];

describe('computeStaffSearchHits (§8.2 full-data search)', () => {
  it('filters org positions by title (case-insensitive) and joins dept + person', () => {
    const hits = computeStaffSearchHits(data({ positions }), 'org', 'фінансов');
    expect(hits.map((h) => h.posId)).toEqual(['cfo', 'fan']); // not the other-org «Кухар»
    expect(hits[0]).toEqual({
      posId: 'cfo',
      title: 'Фінансовий директор',
      dept: 'Фінанси',
      person: 'Коваленко Т. С.',
    });
    // Vacant seat → person null (shown as «Вакантно» by the dropdown).
    expect(hits[1]!.person).toBeNull();
  });

  it('blank query → no hits; a query matching nothing → empty', () => {
    expect(computeStaffSearchHits(data({ positions }), 'org', '   ')).toEqual([]);
    expect(computeStaffSearchHits(data({ positions }), 'org', 'xyz')).toEqual([]);
  });

  it('escapeRegExp neutralises regex metacharacters (no crash, literal match)', () => {
    expect(escapeRegExp('a.b(c)')).toBe('a\\.b\\(c\\)');
    const d = data({
      positions: [
        { id: 'x', title: 'C++ розробник', organizationId: 'org', status: 'vacant' },
      ] as unknown as DiagramData['positions'],
    });
    expect(computeStaffSearchHits(d, 'org', 'c++').map((h) => h.posId)).toEqual(['x']);
  });
});

describe('makeStaffSearchDropdown (§8.2 UI + keyboard)', () => {
  const setup = () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const picked: string[] = [];
    let cleared = 0;
    const dd = makeStaffSearchDropdown({
      input,
      getHits: (q) => computeStaffSearchHits(data({ positions }), 'org', q),
      onPick: (id) => picked.push(id),
      onClear: () => {
        cleared += 1;
      },
    });
    const ul = lastList();
    return { input, dd, ul, picked, getCleared: () => cleared };
  };

  it('render opens the list with mark-highlighted titles and a subtitle', () => {
    const { dd, ul } = setup();
    const n = dd.render('фінансов');
    expect(n).toBe(2);
    expect(ul.classList.contains('open')).toBe(true);
    expect(ul.querySelector('.st mark')?.textContent?.toLowerCase()).toBe('фінансов');
    expect(ul.querySelector('.ss .vac')?.textContent).toBe('Вакантно'); // 2nd hit vacant
    dd.destroy();
  });

  it('ArrowDown then Enter picks the second hit; a pick closes the list', () => {
    const { input, dd, ul, picked } = setup();
    dd.render('фінансов');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(picked).toEqual(['fan']);
    expect(ul.classList.contains('open')).toBe(false);
    dd.destroy();
  });

  it('Escape clears the input, closes, and signals onClear', () => {
    const { input, dd, ul, getCleared } = setup();
    input.value = 'фін';
    dd.render('фін');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(input.value).toBe('');
    expect(ul.classList.contains('open')).toBe(false);
    expect(getCleared()).toBeGreaterThanOrEqual(1);
    dd.destroy();
  });

  it('empty query closes and signals onClear; a no-hit query shows the «.se» row', () => {
    const { dd, ul, getCleared } = setup();
    expect(dd.render('')).toBe(0);
    expect(ul.classList.contains('open')).toBe(false);
    expect(getCleared()).toBe(1);
    expect(dd.render('zzz')).toBe(0);
    expect(ul.querySelector('.se')?.textContent).toBe('Посад не знайдено');
    // No-hit keeps an earlier found ring (v3): onClear is NOT signalled again.
    expect(getCleared()).toBe(1);
    dd.destroy();
  });

  it('dept and person names are HTML-escaped in the subtitle', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const d = data({
      departments: [{ id: 'fin', name: '<img src=x onerror=alert(1)>', organizationId: 'org' }],
      persons: [{ id: 'per1', fullName: '<b>Іван</b>' }],
      positions,
    } as unknown as Partial<DiagramData>);
    const dd = makeStaffSearchDropdown({
      input,
      getHits: (q) => computeStaffSearchHits(d, 'org', q),
      onPick: () => {},
      onClear: () => {},
    });
    dd.render('директор');
    const ul = lastList();
    expect(ul.querySelector('img')).toBeNull();
    expect(ul.querySelector('.ss b')).toBeNull();
    expect(ul.querySelector('.ss')?.textContent).toBe('<img src=x onerror=alert(1)> · <b>Іван</b>');
    dd.destroy();
  });

  it('a quick blur→focus does not let the pending blur-close shut the list', async () => {
    const { input, dd, ul } = setup();
    dd.render('фінансов');
    input.dispatchEvent(new FocusEvent('blur'));
    input.dispatchEvent(new FocusEvent('focus'));
    await new Promise<void>((r) => {
      setTimeout(r, 200);
    });
    expect(ul.classList.contains('open')).toBe(true);
    dd.destroy();
  });
});
