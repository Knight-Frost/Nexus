import { cn } from '@/lib/cn';
import type { AuditLog } from '@/lib/types';
import type { AuditEvent, RecentAuditItem } from '../adminMockData';

/** Severity dot color mapping */
const DOT_COLOR: Record<string, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-600',
  info: 'bg-info-500',
  critical: 'bg-danger-600',
};

/* ---- Normalised row for timeline ---------------------------------------- */

interface TimelineRow {
  id: string;
  severity: string;
  action: string;
  subject: string;
  time: string;
}

function fromAuditLog(log: AuditLog): TimelineRow {
  return {
    id: String(log.id),
    severity: log.severity === 'critical' ? 'danger' : log.severity,
    action: log.action,
    subject: log.description ?? (log.subject_type ? `${log.subject_type} #${log.subject_id}` : '—'),
    time: new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

function fromMockEvent(event: AuditEvent, idx: number): TimelineRow {
  return {
    id: String(idx),
    severity: event.severity,
    action: event.title,
    subject: event.detail,
    time: event.time,
  };
}

function fromRecentAudit(item: RecentAuditItem): TimelineRow {
  return {
    id: item.id,
    severity: item.severity,
    action: item.action,
    subject: item.subject,
    time: item.time,
  };
}

/* ---- Props --------------------------------------------------------------- */

interface AuditTimelineProps {
  /** Real API audit logs */
  logs?: AuditLog[];
  /** Legacy mock events (AuditEvent[]) */
  events?: AuditEvent[];
  /** New mock audit items (RecentAuditItem[]) */
  recentAudit?: RecentAuditItem[];
  /** Max rows to show */
  max?: number;
  /** Compact variant — no category filter chips */
  compact?: boolean;
}

export function AuditTimeline({ logs, events, recentAudit, max = 10, compact }: AuditTimelineProps) {
  let rows: TimelineRow[] = [];

  if (logs && logs.length > 0) {
    rows = logs.map(fromAuditLog);
  } else if (recentAudit && recentAudit.length > 0) {
    rows = recentAudit.map(fromRecentAudit);
  } else if (events && events.length > 0) {
    rows = events.map((e, i) => fromMockEvent(e, i));
  }

  const visible = rows.slice(0, max);

  if (visible.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-ink-500">
        No audit events to display.
      </div>
    );
  }

  return (
    <ul className={cn('flex flex-col', compact ? 'divide-y divide-ink-100' : '')}>
      {visible.map((row, i) => (
        <li
          key={row.id}
          className={cn(
            'flex items-start gap-3 px-6 py-3.5',
            !compact && i > 0 && 'border-t border-ink-100',
          )}
        >
          {/* Severity dot */}
          <span className="mt-1.5 shrink-0">
            <span
              className={cn(
                'block h-2 w-2 rounded-full',
                DOT_COLOR[row.severity] ?? 'bg-ink-400',
              )}
              aria-label={row.severity}
            />
          </span>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-900 leading-snug">{row.action}</p>
            <p className="truncate text-xs text-ink-500">{row.subject}</p>
          </div>

          {/* Time */}
          <span className="shrink-0 text-xs text-ink-400 tabular-nums">{row.time}</span>
        </li>
      ))}
    </ul>
  );
}
