import { cn } from '@/lib/cn';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

/**
 * Platform health panel — shows API health, queue depth, and notification
 * delivery health with colored status dots.
 */

interface HealthItem {
  label: string;
  detail: string;
  status: 'success' | 'warning' | 'danger';
}

const HEALTH_ITEMS: HealthItem[] = [
  {
    label: 'API gateway',
    detail: 'All endpoints nominal · p99 < 120ms',
    status: 'success',
  },
  {
    label: 'Queue depth',
    detail: '14 jobs pending · no stalled workers',
    status: 'warning',
  },
  {
    label: 'Notification delivery',
    detail: 'Email 99.2% · SMS 97.8% · In-app 100%',
    status: 'success',
  },
];

const STATUS_LABEL: Record<HealthItem['status'], string> = {
  success: 'Healthy',
  warning: 'Degraded',
  danger: 'Down',
};

export function OperationalHealthPanel() {
  return (
    <Card>
      <CardHeader title="Platform Health" />
      <CardBody className="space-y-3">
        {HEALTH_ITEMS.map((item) => (
          <div
            key={item.label}
            className={cn(
              'flex items-start gap-4 rounded-xl border p-4',
              item.status === 'success' && 'border-success-200 bg-success-50/30',
              item.status === 'warning' && 'border-warning-200 bg-warning-50/30',
              item.status === 'danger' && 'border-danger-200 bg-danger-50/30',
            )}
          >
            {/* Animated dot */}
            <span className="mt-0.5 flex shrink-0 items-center justify-center">
              <span
                className={cn(
                  'relative flex h-3 w-3 rounded-full',
                  item.status === 'success' && 'bg-success-500',
                  item.status === 'warning' && 'bg-warning-500',
                  item.status === 'danger' && 'bg-danger-500',
                )}
              >
                {item.status !== 'success' && (
                  <span
                    className={cn(
                      'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                      item.status === 'warning' && 'bg-warning-400',
                      item.status === 'danger' && 'bg-danger-400',
                    )}
                  />
                )}
              </span>
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-ink-900">{item.label}</p>
                <Badge tone={item.status} dot={false}>
                  {STATUS_LABEL[item.status]}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">{item.detail}</p>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
