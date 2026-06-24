import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/states';
import { IconActivity } from '@/components/ui/icons';
import { NexusCard, DashboardSection, SectionHeader } from '@/components/cards';
import { formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/lib/types';

/* Severity → semantic token (color = meaning, text label is always also present). */
function severityDotClass(severity: AuditLog['severity']): string {
  switch (severity) {
    case 'critical': return 'bg-danger-500';
    case 'warning':  return 'bg-warning-500';
    default:         return 'bg-info-500';
  }
}

function severityLabel(severity: AuditLog['severity']): string {
  switch (severity) {
    case 'critical': return 'Critical';
    case 'warning':  return 'Warning';
    default:         return 'Info';
  }
}

function actorLabel(log: AuditLog): string {
  if (log.actor.role === 'system') return 'System';
  const id = log.actor.id !== null ? ` #${log.actor.id}` : '';
  return `${log.actor.name}${id}`;
}

interface AuditTimelineProps {
  logs: AuditLog[];
  loading: boolean;
  max?: number;
  onFullLog: () => void;
}

/**
 * Recent platform activity from the immutable audit log. Real entries only —
 * actor, humanized action, and timestamp.
 */
export function AuditTimeline({ logs, loading, max = 6, onFullLog }: AuditTimelineProps) {
  const rows = logs.slice(0, max);

  return (
    <DashboardSection>
      <SectionHeader
        eyebrow="Platform"
        title="Recent activity"
        action={
          <Button variant="ghost" size="sm" onClick={onFullLog}>
            View full log
          </Button>
        }
      />
      <NexusCard role="neutral" className="p-5">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="mt-1 h-2.5 w-2.5 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconActivity />}
            title="No recent activity"
            description="Consequential actions across the platform will appear here."
          />
        ) : (
          <ol className="adm-timeline">
            {rows.map((log) => (
              <li key={log.id} className="adm-timeline-item">
                <span
                  className={`adm-timeline-dot ${severityDotClass(log.severity)}`}
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-ink-900">{log.action_label}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  <span className="sr-only">Severity: {severityLabel(log.severity)} · </span>
                  {actorLabel(log)}
                  {log.summary ? ` · ${log.summary}` : ''}
                </p>
                <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-400">
                  {formatDateTime(log.created_at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </NexusCard>
    </DashboardSection>
  );
}
