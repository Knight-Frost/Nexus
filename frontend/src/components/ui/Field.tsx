import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

const controlBase =
  'w-full rounded-xl border border-ink-200 bg-surface px-4 py-2.5 text-sm text-ink-900 ' +
  'placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ' +
  'focus:outline-none transition-colors disabled:bg-ink-50 disabled:text-ink-400';

function errorState(invalid?: boolean) {
  return invalid
    ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
    : '';
}

export function Label({
  htmlFor,
  children,
  required,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-sm font-medium text-ink-700 mb-1.5 block', className)}
    >
      {children}
      {required && <span className="ml-0.5 text-danger-500">*</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="text-sm text-danger-600 mt-1.5" role="alert">
      {children}
    </p>
  );
}

interface FieldProps {
  label?: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: (id: string, invalid: boolean) => React.ReactNode;
}

/** Wires label / hint / error around a form control with auto-generated id. */
export function Field({ label, error, hint, required, children }: FieldProps) {
  const id = useId();
  return (
    <div>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {children(id, Boolean(error))}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
      )}
      <FieldError>{error}</FieldError>
    </div>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(controlBase, errorState(invalid), className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(controlBase, errorState(invalid), 'min-h-24', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(controlBase, errorState(invalid), 'pr-9', className)}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
});
