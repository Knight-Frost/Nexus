import { cn } from '@/lib/cn';

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-brand-700" />
      <path d="M9 23V9h2.6l9.8 10.2V9H24v14h-2.6L11.6 12.8V23H9z" className="fill-brand-50" />
    </svg>
  );
}

export function Logo({
  size = 32,
  showWordmark = true,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight text-ink-950">Nexus</span>
      )}
    </span>
  );
}
