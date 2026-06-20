import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'money';

interface BadgeProps {
  tone?: Tone;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const toneClasses: Record<Tone, { badge: string; dot: string }> = {
  neutral: {
    badge: 'bg-ink-100 text-ink-700',
    dot:   'bg-ink-500',
  },
  brand: {
    badge: 'bg-brand-50 text-brand-700',
    dot:   'bg-brand-600',
  },
  success: {
    badge: 'bg-success-50 text-success-600',
    dot:   'bg-success-500',
  },
  warning: {
    badge: 'bg-warning-50 text-warning-600',
    dot:   'bg-warning-500',
  },
  danger: {
    badge: 'bg-danger-50 text-danger-600',
    dot:   'bg-danger-500',
  },
  info: {
    badge: 'bg-info-50 text-info-600',
    dot:   'bg-info-500',
  },
  money: {
    badge: 'bg-[var(--color-money-bg)] text-[var(--color-money)]',
    dot:   'bg-[var(--color-money)]',
  },
};

export function Badge({
  tone = 'neutral',
  size = 'sm',
  dot = true,
  className,
  children,
}: BadgeProps) {
  const { badge, dot: dotColor } = toneClasses[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        badge,
        className,
      )}
    >
      {dot && (
        <span
          className={cn('inline-block rounded-full shrink-0', dotColor)}
          style={{ width: 6, height: 6 }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
