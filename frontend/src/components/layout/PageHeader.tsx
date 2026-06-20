import { cn } from '@/lib/cn';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** @deprecated use action */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  actions,
  className,
}: PageHeaderProps) {
  const actionSlot = action ?? actions;
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-start justify-between gap-4',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-500">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-950 leading-snug">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-ink-500 max-w-prose">{description}</p>
        )}
      </div>

      {actionSlot && (
        <div className="flex shrink-0 items-center gap-2">{actionSlot}</div>
      )}
    </div>
  );
}
