import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Spinner } from './Spinner';

/** Full-block loading indicator with optional label. */
export function LoadingState({
  label = 'Loading…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-ink-500',
        className,
      )}
    >
      <Spinner size={28} className="text-brand-600" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

/** Empty-data state with icon ring, title, description, and optional action. */
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
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed ' +
        'border-ink-200 bg-ink-50/40 px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div
          className="flex items-center justify-center rounded-full bg-brand-50 text-brand-700"
          style={{ width: 56, height: 56 }}
        >
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl font-semibold text-ink-900">{title}</h3>
      {description && (
        <p className="max-w-xs text-sm text-ink-500">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Error state with danger icon ring, title, message, and optional retry. */
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
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger-500/20 ' +
        'bg-danger-50/60 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <div
        className="flex items-center justify-center rounded-full bg-danger-50 text-danger-600"
        style={{ width: 56, height: 56 }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="font-display text-xl font-semibold text-ink-900">{title}</h3>
      {message && <p className="max-w-xs text-sm text-ink-500">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}

/** Forbidden (403) state — the user is authenticated but not allowed here. */
export function ForbiddenState({
  title = 'Not available for your account',
  message = 'You don’t have access to this area.',
  className,
}: {
  title?: string;
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-ink-200 ' +
        'bg-ink-50/40 px-6 py-14 text-center',
        className,
      )}
      role="alert"
    >
      <div
        className="flex items-center justify-center rounded-full bg-ink-100 text-ink-500"
        style={{ width: 56, height: 56 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h3 className="font-display text-xl font-semibold text-ink-900">{title}</h3>
      {message && <p className="max-w-xs text-sm text-ink-500">{message}</p>}
    </div>
  );
}

/**
 * Unavailable state — a feature that is honestly not ready / locked behind a
 * prerequisite (e.g. "Maintenance becomes available once you have a lease").
 * Looks premium; never used to disguise missing data as working.
 */
export function UnavailableState({
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
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-ink-200 ' +
        'bg-surface px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div
          className="flex items-center justify-center rounded-full bg-ink-100 text-ink-500"
          style={{ width: 56, height: 56 }}
        >
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl font-semibold text-ink-900">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Skeleton placeholder block. Pass className with h-X w-X to size it. */
export const Skeleton = forwardRef<HTMLDivElement, { className?: string }>(
  function Skeleton({ className }, ref) {
    return <div ref={ref} className={cn('skeleton', className)} />;
  },
);

/** Short text-line skeleton (narrow width, label height). */
export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn('h-4 w-32 rounded-md', className)} />;
}

/** Card-shaped skeleton placeholder. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface rounded-2xl border border-ink-200 p-5 flex flex-col gap-3',
        className,
      )}
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3.5 w-20" />
    </div>
  );
}
