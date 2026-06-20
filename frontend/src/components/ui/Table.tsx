import { cn } from '@/lib/cn';

/**
 * Spacious, readable table primitives.
 */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

export function TH({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'text-left text-xs font-semibold uppercase tracking-wider text-ink-500 ' +
        'py-3 px-4 border-b border-ink-200 bg-ink-50/50 whitespace-nowrap',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'hover:bg-ink-50 transition-colors cursor-default',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className,
  first,
}: {
  children?: React.ReactNode;
  className?: string;
  first?: boolean;
}) {
  return (
    <td
      className={cn(
        'py-3.5 px-4 border-b border-ink-200 text-ink-800',
        first && 'font-medium text-ink-900',
        className,
      )}
    >
      {children}
    </td>
  );
}
