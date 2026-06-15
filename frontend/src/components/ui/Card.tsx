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
        'bg-surface border border-ink-200/80 rounded-2xl shadow-sm',
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
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div>
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
