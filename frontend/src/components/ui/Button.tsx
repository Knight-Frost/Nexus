import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle' | 'icon';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all ' +
  'duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed ' +
  'active:scale-[0.98] whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-on-brand font-semibold shadow-sm hover:bg-brand-400 focus-visible:outline-brand-700',
  secondary:
    'bg-surface border border-ink-200 text-ink-800 shadow-sm hover:bg-ink-50 hover:border-ink-300',
  ghost:
    'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
  subtle:
    'bg-ink-100 text-ink-800 hover:bg-ink-200',
  danger:
    'bg-[var(--color-danger-solid)] text-white shadow-sm hover:bg-[var(--color-danger-solid-hover)]',
  icon:
    'bg-surface border border-ink-200 text-ink-700 hover:bg-ink-100 hover:text-ink-900',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

const iconSizes: Record<Size, string> = {
  sm: 'h-9 w-9 p-0 rounded-full',
  md: 'h-11 w-11 p-0 rounded-full',
  lg: 'h-12 w-12 p-0 rounded-full',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const isIcon = variant === 'icon';

  return (
    <button
      ref={ref}
      className={cn(
        base,
        variants[variant],
        isIcon ? iconSizes[size] : sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size={16} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
