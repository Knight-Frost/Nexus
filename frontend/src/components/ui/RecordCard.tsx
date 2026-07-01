import { cn } from '@/lib/cn';

/**
 * Responsive record list — the spacious replacement for cramped wide tables on
 * list-heavy pages (Tenants, Review moderation, etc.). Each row is a card that
 * keeps identity + status + the primary action ALWAYS visible, hides secondary
 * blocks at breakpoints, and stacks cleanly on mobile. No horizontal scroll,
 * no hidden right-side actions.
 *
 * Layout per card (desktop → mobile):
 *   [leading] [title/subtitle .......... flex-1] [related] [indicator] [status+time | action+menu]
 *   On mobile/tablet everything STACKS and stays visible — related and indicator
 *   are never hidden; they drop below the identity block separated by hairlines.
 *   The status/action cluster sits on its own row with status on the left and the
 *   action on the right (justify-between). No horizontal scroll, no hidden columns.
 *
 *   The only responsive trick is `indicator`, which is hidden ONLY in the narrow
 *   lg→xl band (1024–1279px) where the inline row would otherwise overflow; it is
 *   fully visible both stacked (below lg) and inline (xl+).
 */

export function RecordList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('flex flex-col gap-3', className)}>{children}</div>;
}

interface RecordCardProps {
  /** Avatar / thumbnail — always visible. */
  leading?: React.ReactNode;
  /** Primary identity (name, title). Always visible; truncates. */
  title: React.ReactNode;
  /** Inline trailing meta beside the title (e.g. a verified shield). */
  titleMeta?: React.ReactNode;
  /** Secondary lines under the title (email, phone). Visible; wraps. */
  subtitle?: React.ReactNode;
  /** Related entity block (listing / unit / property). Hidden below md. */
  related?: React.ReactNode;
  /** Progress / readiness / indicator block. Hidden below lg. */
  indicator?: React.ReactNode;
  /** Status badge — always visible. */
  status?: React.ReactNode;
  /** Date / relative time — under the status on the right. */
  timestamp?: React.ReactNode;
  /** Primary action button — always visible, never scrolls off. */
  primaryAction?: React.ReactNode;
  /** Overflow menu (caller supplies its own ActionMenu). Always visible. */
  menu?: React.ReactNode;
  /** Whole-card click (opens detail). Keep keyboard-accessible. */
  onClick?: () => void;
  className?: string;
}

export function RecordCard({
  leading,
  title,
  titleMeta,
  subtitle,
  related,
  indicator,
  status,
  timestamp,
  primaryAction,
  menu,
  onClick,
  className,
}: RecordCardProps) {
  const interactive = Boolean(onClick);
  return (
    <article
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      className={cn(
        'rounded-2xl border border-ink-200 bg-surface px-4 py-4 shadow-sm transition-colors sm:px-5',
        'flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5',
        interactive &&
          'cursor-pointer hover:border-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30',
        className,
      )}
    >
      {/* Identity — always visible, flexes on desktop. The min-width floor
          stops flex-1 collapsing to a sliver when related/indicator/trailing
          columns are wide; truncation keeps long emails/titles from spilling
          over the next column. */}
      <div className="flex min-w-0 items-start gap-3 lg:flex-1 lg:min-w-[11rem]">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate font-semibold text-ink-900">{title}</span>
            {titleMeta && <span className="shrink-0">{titleMeta}</span>}
          </div>
          {subtitle && (
            <div className="mt-0.5 space-y-0.5 text-sm text-ink-500 [&>*]:block [&>*]:truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Related entity — stacks (with a hairline) on mobile/tablet, becomes an
          inline column at lg+. Never hidden. */}
      {related && (
        <div className="min-w-0 border-t border-ink-100 pt-3 lg:w-52 lg:border-t-0 lg:pt-0 xl:w-60">
          {related}
        </div>
      )}

      {/* Indicator / progress — stacked + visible below lg and inline at xl+.
          Hidden ONLY in the lg→xl band so the inline row (identity + related +
          indicator + trailing) never overflows into a horizontal scroll. */}
      {indicator && (
        <div className="border-t border-ink-100 pt-3 lg:hidden xl:block xl:w-52 xl:border-t-0 xl:pt-0">
          {indicator}
        </div>
      )}

      {/* Status + time + actions — always visible; splits on its own row on
          mobile (status left, action right) separated by a hairline. */}
      {(status || timestamp || primaryAction || menu) && (
        <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-3 lg:border-t-0 lg:pt-0 lg:justify-end">
          {(status || timestamp) && (
            <div className="flex flex-col items-start gap-1 lg:items-end lg:text-right">
              {status}
              {timestamp && (
                // Bounded so a long date range wraps instead of stretching the
                // whole row and starving the identity column.
                <div className="text-xs text-ink-500 lg:max-w-[13rem]">{timestamp}</div>
              )}
            </div>
          )}
          {(primaryAction || menu) && (
            <div
              className="flex shrink-0 items-center gap-2"
              // Action cluster shouldn't trigger the card's onClick.
              onClick={(e) => e.stopPropagation()}
            >
              {primaryAction}
              {menu}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Related-entity helper — a small thumbnail + title + supporting lines, used in
 * the `related` slot so listing / unit / property context renders consistently.
 */
export function RecordRelated({
  thumbnail,
  title,
  lines,
}: {
  thumbnail?: React.ReactNode;
  title: React.ReactNode;
  lines?: React.ReactNode[];
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {thumbnail && <div className="shrink-0">{thumbnail}</div>}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-800">{title}</p>
        {lines?.map((line, i) => (
          <p key={i} className="truncate text-xs text-ink-500">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
