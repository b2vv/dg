/**
 * Format org / position validity window for card chrome (T68).
 * Host `periodLabel` wins; otherwise SDK builds a uk-style line from ISO dates.
 */

export interface PeriodFields {
  periodStart?: string;
  periodEnd?: string | null;
  periodLabel?: string;
}

/** Parse ISO date (YYYY-MM-DD or full ISO) → DD.MM.YYYY; invalid → null. */
export function formatIsoDateUk(iso: string | undefined | null): string | null {
  if (!iso?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/**
 * Resolve display string for a period line.
 * Returns `undefined` when there is nothing to paint (no hole in layout).
 */
export function formatOrgPeriodLabel(fields: PeriodFields): string | undefined {
  const pre = fields.periodLabel?.trim();
  if (pre) return pre;

  const start = formatIsoDateUk(fields.periodStart);
  if (!start) return undefined;

  if (fields.periodEnd === null || fields.periodEnd === undefined || fields.periodEnd === '') {
    return `з ${start} по т.ч.`;
  }

  const end = formatIsoDateUk(fields.periodEnd);
  if (!end) return `з ${start} по т.ч.`;
  return `з ${start} по ${end}`;
}
