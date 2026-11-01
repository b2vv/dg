import type { DiagramData } from '@org-hierarchy/sdk';

/**
 * ШПС alpha search dropdown (§8.2) — the v3 mockup `.sl` list driven by the
 * toolbar search input. It filters the FULL `config.data` positions (not
 * `diagram.search`, which indexes only the visible set and so cannot see a
 * collapsed seat — verified at OrgHierarchyDiagram.ts setData/rebuild), renders
 * mark-highlighted titles + a «dept · person/Вакантно» subtitle, and focuses a
 * hit only on Enter or click (mockup `focusCard`), never on every keystroke.
 */

export interface StaffSearchHit {
  posId: string;
  title: string;
  dept: string;
  /** Person full name, or null for a vacant seat. */
  person: string | null;
}

/** Escape a user query for use inside `new RegExp` (mockup `esc`). */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pure: positions of `orgId` whose title matches `query` (case-insensitive),
 * joined to department name and person. Empty/blank query → no hits.
 */
export function computeStaffSearchHits(
  data: DiagramData,
  orgId: string,
  query: string,
): StaffSearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const re = new RegExp(escapeRegExp(q), 'i');
  const deptName = new Map(data.departments.map((d) => [d.id, d.name]));
  const personName = new Map(data.persons.map((p) => [p.id, p.fullName]));
  return data.positions
    .filter((p) => p.organizationId === orgId && re.test(p.title))
    .map((p) => ({
      posId: p.id,
      title: p.title,
      dept: p.departmentId ? (deptName.get(p.departmentId) ?? '') : '',
      person:
        p.status !== 'vacant' && p.personId ? (personName.get(p.personId) ?? null) : null,
    }));
}

/** `<mark>`-wrap every match of `query` in `text` (mockup `.st mark`). Safe HTML. */
function markHits(text: string, query: string): string {
  const esc = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const q = query.trim();
  if (!q) return esc(text);
  const re = new RegExp(escapeRegExp(q), 'ig');
  let out = '';
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index;
    out += esc(text.slice(last, i)) + '<mark>' + esc(m[0]) + '</mark>';
    last = i + m[0].length;
  }
  return out + esc(text.slice(last));
}

export interface StaffSearchDropdown {
  /** Rebuild the list for `query` and open it; returns the hit count. Blank → closed. */
  render(query: string): number;
  close(): void;
  destroy(): void;
}

/**
 * Wire the v3 dropdown to the toolbar `input`. `render(query)` is driven by the
 * host's debounced `input` handler; keyboard (↑/↓/Enter/Esc), item click, focus
 * re-open and blur-close are owned here. A hit is picked only on Enter/click.
 */
export function makeStaffSearchDropdown(opts: {
  input: HTMLInputElement;
  getHits: (query: string) => StaffSearchHit[];
  onPick: (posId: string) => void;
  /** Escape or `.sx`-style clear — the caller drops the found ring/dim. */
  onClear: () => void;
}): StaffSearchDropdown {
  const { input, getHits, onPick, onClear } = opts;
  const ul = document.createElement('ul');
  ul.className = 'sl';
  ul.setAttribute('data-staff-search', '');
  document.body.appendChild(ul);

  let hits: StaffSearchHit[] = [];
  let act = 0;
  let lastQuery = '';
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  const place = (): void => {
    const r = input.getBoundingClientRect();
    ul.style.left = `${r.left}px`;
    ul.style.top = `${r.bottom + 6}px`;
    ul.style.width = `${r.width}px`;
  };

  const paintAct = (): void => {
    ul.querySelectorAll<HTMLElement>('li[data-i]').forEach((li, i) => {
      li.classList.toggle('act', i === act);
    });
  };

  const close = (): void => {
    ul.classList.remove('open');
  };

  const render = (query: string): number => {
    lastQuery = query;
    if (!query.trim()) {
      hits = [];
      close();
      onClear();
      return 0;
    }
    hits = getHits(query);
    act = 0;
    if (hits.length === 0) {
      // Mockup `.se` — the found ring from an earlier pick stays (v3 clears it only
      // on Escape / clear / a new pick), so no `onClear` here.
      ul.innerHTML = '<li class="se">Посад не знайдено</li>';
    } else {
      ul.innerHTML = hits
        .map((h, i) => {
          const sub = h.person
            ? `${h.dept} · ${h.person}`
            : `${h.dept} · <span class="vac">Вакантно</span>`;
          return `<li data-i="${i}" class="${i === 0 ? 'act' : ''}"><span class="st">${markHits(
            h.title,
            query,
          )}</span><span class="ss">${sub}</span></li>`;
        })
        .join('');
    }
    place();
    ul.classList.add('open');
    return hits.length;
  };

  const pick = (i: number): void => {
    const hit = hits[i];
    if (!hit) return;
    close();
    onPick(hit.posId);
  };

  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      input.value = '';
      hits = [];
      lastQuery = '';
      close();
      onClear();
      input.blur();
      return;
    }
    if (!ul.classList.contains('open') || hits.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      act = (act + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
      paintAct();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(act);
    }
  };

  // mousedown (not click) so it fires before the input's blur closes the list.
  const onMouseDown = (e: MouseEvent): void => {
    const li = (e.target as Element | null)?.closest<HTMLElement>('li[data-i]');
    if (!li) return;
    e.preventDefault();
    pick(Number(li.dataset.i));
  };
  const onFocus = (): void => {
    if (lastQuery.trim()) render(lastQuery);
  };
  const onBlur = (): void => {
    closeTimer = setTimeout(close, 150);
  };

  input.addEventListener('keydown', onKeydown);
  ul.addEventListener('mousedown', onMouseDown);
  input.addEventListener('focus', onFocus);
  input.addEventListener('blur', onBlur);

  return {
    render,
    close,
    destroy: () => {
      clearTimeout(closeTimer);
      input.removeEventListener('keydown', onKeydown);
      ul.removeEventListener('mousedown', onMouseDown);
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
      ul.remove();
    },
  };
}
