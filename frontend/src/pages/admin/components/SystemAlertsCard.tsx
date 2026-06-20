import { cn } from '@/lib/cn';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { IconAlertCircle, IconAlertTriangle, IconInfo } from '@/components/ui/icons';
import type { PlatformAlert, AlertSeverity } from '../adminMockData';

const ALERT_CONFIG: Record<AlertSeverity, { container: string; icon: string }> = {
  danger: {
    container: 'bg-danger-50 text-danger-600',
    icon: 'text-danger-600',
  },
  warning: {
    container: 'bg-warning-50 text-warning-600',
    icon: 'text-warning-600',
  },
  info: {
    container: 'bg-info-50 text-info-600',
    icon: 'text-info-600',
  },
};

function AlertIcon({ severity }: { severity: AlertSeverity }) {
  const cls = 'h-4 w-4';
  if (severity === 'danger') return <IconAlertCircle className={cls} />;
  if (severity === 'warning') return <IconAlertTriangle className={cls} />;
  return <IconInfo className={cls} />;
}

export function SystemAlertsCard({ alerts }: { alerts: PlatformAlert[] }) {
  return (
    <Card>
      <CardHeader title="System Alerts" />
      <CardBody className="space-y-3">
        {alerts.length === 0 && (
          <p className="text-sm text-ink-500 text-center py-4">No active alerts.</p>
        )}
        {alerts.map((alert, i) => {
          const cfg = ALERT_CONFIG[alert.severity];
          return (
            <div key={i} className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5',
                  cfg.container,
                )}
              >
                <AlertIcon severity={alert.severity} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900 leading-tight">{alert.title}</p>
                <p className="text-xs text-ink-500 mt-0.5">{alert.detail}</p>
              </div>
              <span className="text-xs text-ink-400 whitespace-nowrap shrink-0 mt-0.5">
                {alert.time}
              </span>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
