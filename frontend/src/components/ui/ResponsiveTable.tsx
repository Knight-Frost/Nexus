import { cn } from '@/lib/cn';

/**
 * ResponsiveTable — the no-horizontal-scroll table for *financial / forensic*
 * data (Payments, Ledger, Audit logs) where aligned columns genuinely help
 * scanning amounts and dates. It is NOT the row-card system (see RecordCard);
 * it is a real table that reflows instead of scrolling sideways.
 *
 *   Desktop (md+): a proper aligned `<table>` inside one bordered surface.
 *   Mobile (<md):  every row becomes its own standalone card of stacked
 *                  label:value pairs. No `overflow-x`, ever.
 *
 * Driven by a single column config so both renderings stay in sync — define a
 * cell once, get the aligned table and the stacked mobile card for free.
 */

export interface ResponsiveColumn<T> {
  /** Stable key for the column. */
  key: string;
  /** Column header (also used as the label in the mobile stacked view). */
  header: React.ReactNode;
  /** Cell renderer. */
  cell: (row: T) => React.ReactNode;
  /** Horizontal alignment of the desktop cell + the mobile value. */
  align?: 'left' | 'right' | 'center';
  /**
   * Marks the row's primary cell. On mobile it renders prominently at the top
   * of the card (no label) instead of as a label:value pair.
   */
  primary?: boolean;
  /**
   * On the DESKTOP table only, hide this column below a breakpoint to keep the
   * row from getting cramped. The column is ALWAYS shown in the mobile stack,
   * so nothing is ever hidden outright.
   */
  hideBelow?: 'lg' | 'xl';
  /** Extra className for the desktop `<td>`. */
  cellClassName?: string;
}

interface ResponsiveTableProps<T> {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  keyFn: (row: T) => string | number;
  /** Optional whole-row click (opens a detail view). Keyboard-accessible. */
  onRowClick?: (row: T) => void;
  /** Optional per-row className (desktop `<tr>` and mobile card). */
  rowClassName?: (row: T) => string | undefined;
  /** Visually-hidden table caption for screen readers. */
  caption?: string;
  className?: string;
}

const alignText: Record<NonNullable<ResponsiveColumn<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

const hideClass: Record<NonNullable<ResponsiveColumn<unknown>['hideBelow']>, string> = {
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export function ResponsiveTable<T>({
  columns,
  rows,
  keyFn,
  onRowClick,
  rowClassName,
  caption,
  className,
}: ResponsiveTableProps<T>) {
  const interactive = Boolean(onRowClick);

  return (
    <div className={className}>
      {/* ---- Desktop: aligned table inside one bordered surface ---- */}
      <div className="hidden overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-sm md:block">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-500',
                    alignText[col.align ?? 'left'],
                    col.hideBelow && hideClass[col.hideBelow],
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {rows.map((row) => (
              <tr
                key={keyFn(row)}
                onClick={interactive ? () => onRowClick?.(row) : undefined}
                onKeyDown={
                  interactive
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick?.(row);
                        }
                      }
                    : undefined
                }
                tabIndex={interactive ? 0 : undefined}
                className={cn(
                  'transition-colors',
                  interactive &&
                    'cursor-pointer hover:bg-ink-50/60 focus-visible:bg-ink-50/60 focus-visible:outline-none',
                  rowClassName?.(row),
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3.5 align-middle text-ink-800',
                      alignText[col.align ?? 'left'],
                      col.hideBelow && hideClass[col.hideBelow],
                      col.cellClassName,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Mobile: each row is a standalone label:value card ---- */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => {
          const primaryCol = columns.find((c) => c.primary);
          const restCols = columns.filter((c) => !c.primary);
          return (
            <article
              key={keyFn(row)}
              onClick={interactive ? () => onRowClick?.(row) : undefined}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick?.(row);
                      }
                    }
                  : undefined
              }
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? 'button' : undefined}
              className={cn(
                'rounded-2xl border border-ink-200 bg-surface p-4 shadow-sm',
                interactive &&
                  'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30',
                rowClassName?.(row),
              )}
            >
              {primaryCol && (
                <div className="mb-2.5 font-semibold text-ink-900">{primaryCol.cell(row)}</div>
              )}
              <dl className="flex flex-col gap-1.5">
                {restCols.map((col) => (
                  <div
                    key={col.key}
                    className="flex items-start justify-between gap-4 text-sm"
                  >
                    <dt className="shrink-0 text-ink-500">{col.header}</dt>
                    <dd
                      className={cn(
                        'min-w-0 text-ink-800',
                        col.align === 'left' ? 'text-left' : 'text-right',
                      )}
                    >
                      {col.cell(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}
