import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Spinner } from './Spinner';

/** Full-block loading indicator. */
export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-ink-500', className)}>
      <Spinner size={28} className="text-brand-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Empty-data state with optional call to action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Error state with retry. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger-500/20 bg-danger-50/60 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-50 text-danger-600">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {message && <p className="max-w-sm text-sm text-ink-600">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}

/** Skeleton line / block for content placeholders. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}
