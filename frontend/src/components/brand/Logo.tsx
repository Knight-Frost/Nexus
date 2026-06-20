import { cn } from '@/lib/cn';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** Square brand mark with rounded corners and "N" initial. */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <span
      className={cn('inline-flex items-center justify-center shrink-0', className)}
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundColor: 'var(--color-brand-600)',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        width={size * 0.65}
        height={size * 0.65}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7 24V8h3.2l10.6 11V8H24v16h-3.2L10.2 13V24H7z"
          fill="white"
        />
      </svg>
    </span>
  );
}

interface LogoProps {
  size?: number;
  wordmark?: boolean;
  className?: string;
}

/** Logo mark + "Nexus" wordmark. */
export function Logo({ size = 32, wordmark = true, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {wordmark && (
        <span
          className="font-display font-bold text-ink-950 leading-none"
          style={{ fontSize: Math.max(14, size * 0.56) }}
        >
          Nexus
        </span>
      )}
    </span>
  );
}
