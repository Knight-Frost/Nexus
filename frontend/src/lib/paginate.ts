/**
 * Client-side pagination helpers. Counts shown in the UI ("Showing 1 to 10 of
 * 124") are derived from these so they are always truthful for the active
 * filter/search set — never decorative.
 */

export interface PageSlice<T> {
  /** The rows for the current page. */
  items: T[];
  /** 1-based current page, clamped to [1, pageCount]. */
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  /** 1-based index of the first row on this page (0 when empty). */
  from: number;
  /** 1-based index of the last row on this page (0 when empty). */
  to: number;
}

export function paginate<T>(rows: T[], page: number, perPage: number): PageSlice<T> {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * perPage;
  const items = rows.slice(start, start + perPage);
  return {
    items,
    page: safePage,
    pageCount,
    total,
    perPage,
    from: total === 0 ? 0 : start + 1,
    to: total === 0 ? 0 : start + items.length,
  };
}

/** "Showing 1 to 10 of 124 applicants" — pluralized, honest about the range. */
export function rangeLabel(slice: PageSlice<unknown>, noun: string, nounPlural?: string): string {
  const plural = nounPlural ?? `${noun}s`;
  if (slice.total === 0) return `No ${plural}`;
  const word = slice.total === 1 ? noun : plural;
  return `Showing ${slice.from} to ${slice.to} of ${slice.total} ${word}`;
}

/** "1 property" / "2 properties" */
export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : plural ?? `${singular}s`}`;
}
