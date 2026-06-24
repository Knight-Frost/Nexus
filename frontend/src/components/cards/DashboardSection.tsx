import { cn } from '@/lib/cn';

interface SectionHeaderProps {
  /** Mono eyebrow above the title, e.g. "PORTFOLIO". */
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Editorial section header: an optional mono eyebrow, a serif title, an optional
 * description, and a right-aligned action. Uses the `.eyebrow` motif from the
 * editorial skin so sections read like magazine breaks.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow mb-2.5">{eyebrow}</span>}
        {typeof title === 'string' ? (
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink-950">
            {title}
          </h2>
        ) : (
          title
        )}
        {description && (
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

interface DashboardSectionProps {
  eyebrow?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** A titled section wrapper with consistent 40px vertical rhythm. */
export function DashboardSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || eyebrow) && (
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={action}
        />
      )}
      {children}
    </section>
  );
}

interface DataCardGridProps {
  /** Column count at the largest breakpoint; collapses responsively. */
  cols?: 2 | 3 | 4 | 5;
  children: React.ReactNode;
  className?: string;
}

const colClass: Record<NonNullable<DataCardGridProps['cols']>, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
};

/** Stable, gap-consistent grid for stat/status/command cards. */
export function DataCardGrid({ cols = 4, children, className }: DataCardGridProps) {
  return (
    <div className={cn('grid gap-4', colClass[cols], className)}>{children}</div>
  );
}
