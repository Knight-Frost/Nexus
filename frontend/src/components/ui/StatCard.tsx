import { Card } from './Card';
import { cn } from '@/lib/cn';
import { Skeleton } from './states';

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'brand',
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  loading?: boolean;
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
    neutral: 'bg-ink-100 text-ink-600',
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', tones[tone])}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-bold tracking-tight text-ink-950">{value}</p>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </Card>
  );
}
