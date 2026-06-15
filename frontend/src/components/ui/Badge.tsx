import { cn } from '@/lib/cn';
import type { Tone } from '@/lib/format';

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  success: 'bg-success-50 text-success-600 ring-success-500/20',
  warning: 'bg-warning-50 text-warning-600 ring-warning-500/20',
  danger: 'bg-danger-50 text-danger-600 ring-danger-500/20',
  info: 'bg-info-50 text-info-600 ring-info-500/20',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
