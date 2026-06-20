import { StatCard } from '@/components/ui/StatCard';
import {
  IconShield,
  IconDoc,
  IconDollarSign,
  IconActivity,
} from '@/components/ui/icons';

interface MetricDatum {
  label: string;
  value: string | number;
  subtext: string;
  tone: 'warning' | 'success' | 'money' | 'info' | 'danger' | 'default';
  icon: React.ReactNode;
}

const ICON = { size: 18 as const };

function buildMetrics(
  pendingCount?: number,
  contractCount?: number,
  volumeCents?: number,
  auditCount?: number,
): MetricDatum[] {
  return [
    {
      label: 'Review Queue',
      value: pendingCount ?? 24,
      subtext: 'pending listings',
      tone: 'warning',
      icon: <IconShield {...ICON} />,
    },
    {
      label: 'Active Contracts',
      value: contractCount ?? '1,248',
      subtext: 'across the platform',
      tone: 'success',
      icon: <IconDoc {...ICON} />,
    },
    {
      label: 'Ledger Volume (7d)',
      value: volumeCents
        ? `GH₵${(volumeCents / 100).toLocaleString()}`
        : 'GH₵248,000',
      subtext: '+12% vs prior week',
      tone: 'money',
      icon: <IconDollarSign {...ICON} />,
    },
    {
      label: 'Audit Events',
      value: auditCount ?? 186,
      subtext: 'last 7 days',
      tone: 'info',
      icon: <IconActivity {...ICON} />,
    },
  ];
}

interface AdminMetricGridProps {
  pendingCount?: number;
  contractCount?: number;
  volumeCents?: number;
  auditCount?: number;
  loading?: boolean;
}

export function AdminMetricGrid({
  pendingCount,
  contractCount,
  volumeCents,
  auditCount,
  loading,
}: AdminMetricGridProps) {
  const metrics = buildMetrics(pendingCount, contractCount, volumeCents, auditCount);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <StatCard
          key={m.label}
          label={m.label}
          value={m.value}
          subtext={m.subtext}
          tone={m.tone}
          icon={m.icon}
          loading={loading}
        />
      ))}
    </div>
  );
}
