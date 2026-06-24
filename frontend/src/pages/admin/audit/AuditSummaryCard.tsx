/**
 * AuditSummaryCard — wraps StatusCard / CommandCard with audit-specific variant logic.
 *
 * The card role is driven by the metric value via variants.ts helpers so that a
 * "Critical today" card is only red when there are actually critical events, and a
 * "User activity" card is only green when activity is genuinely non-zero.
 *
 * NOTE: We intentionally keep var(--audit-*) token references ONLY for the icon ring
 * inside the loading skeleton, which the audit page owns. The card tints themselves
 * come from the shared semantic ramp via StatusCard.
 */
import {
  StatusCard,
  CommandCard,
  getAdminCriticalVariant,
  getFailedSigninsVariant,
  getPolicyChangesVariant,
  getUserActivityVariant,
  getReviewQueueVariant,
} from '@/components/cards';
import { Skeleton } from '@/components/ui/states';
import type { SemanticRole } from '@/components/cards/variants';
import type { AuditSummaryMetric } from '@/lib/types';

/** Maps the metric label to the appropriate data-driven variant function. */
type MetricKey =
  | 'critical_today'
  | 'failed_signins'
  | 'policy_changes'
  | 'user_activity'
  | 'needs_review';

function deriveRole(metricKey: MetricKey, value: number): SemanticRole {
  switch (metricKey) {
    case 'critical_today': return getAdminCriticalVariant(value);
    case 'failed_signins':  return getFailedSigninsVariant(value);
    case 'policy_changes':  return getPolicyChangesVariant(value);
    case 'user_activity':   return getUserActivityVariant(value);
    case 'needs_review':    return getReviewQueueVariant(value);
    default:                return 'neutral';
  }
}

interface AuditSummaryCardProps {
  label: string;
  icon: React.ReactNode;
  metric: AuditSummaryMetric | Omit<AuditSummaryMetric, 'trend'> | null;
  loading?: boolean;
  /** Which metric key this card represents — drives the semantic role. */
  metricKey: MetricKey;
  /** When true this metric is the "critical today" hero — rendered as CommandCard. */
  featured?: boolean;
}

export function AuditSummaryCard({
  label,
  icon,
  metric,
  loading,
  metricKey,
  featured = false,
}: AuditSummaryCardProps) {
  if (loading || !metric) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-surface p-5 shadow-sm">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3.5 w-28" />
      </div>
    );
  }

  const trend = 'trend' in metric ? metric.trend : undefined;
  const role = deriveRole(metricKey, metric.value);

  // Build the StatusCard trend prop if the backend provided trend data
  const statusTrend =
    trend && trend.direction !== 'flat'
      ? {
          value: trend.label,
          direction: trend.direction as 'up' | 'down',
          // "up is bad" for all metrics except user_activity
          upIsBad: metricKey !== 'user_activity',
        }
      : undefined;

  // Sub-line: truthful — either the backend label or the metric label
  const sub = metric.label || undefined;

  if (featured) {
    return (
      <CommandCard
        role={role}
        label={label}
        value={metric.value.toLocaleString()}
        sub={sub}
        icon={icon}
      />
    );
  }

  return (
    <StatusCard
      role={role}
      label={label}
      value={metric.value.toLocaleString()}
      sub={sub}
      icon={icon}
      trend={statusTrend}
    />
  );
}
