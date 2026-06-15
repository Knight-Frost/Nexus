import { cn } from '@/lib/cn';

/**
 * Lightweight, accessible table primitives with a refined, dense-but-legible
 * style. Use <Table.Root> wrapping a Card for elevation.
 */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-ink-200 text-left">{children}</tr>
    </thead>
  );
}

export function TH({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-ink-100">{children}</tbody>;
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
      className={cn(onClick && 'cursor-pointer transition hover:bg-ink-50/70', className)}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-ink-700', className)}>{children}</td>;
}
