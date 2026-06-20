import { cn } from '@/lib/cn';

export function Card({
  className,
  children,
  as: Tag = 'div',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }) {
  return (
    <Tag
      className={cn(
        'bg-surface rounded-2xl border border-ink-200 shadow-sm overflow-hidden',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 px-6 py-5 border-b border-ink-200',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {typeof title === 'string' ? (
          <h3 className="text-base font-semibold text-ink-900 font-display">{title}</h3>
        ) : (
          title
        )}
        {description && (
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-ink-200 flex items-center justify-between gap-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
