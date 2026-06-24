import { Donut } from '@/components/ui/charts';
import {
  NexusCard,
  DashboardSection,
  SectionHeader,
  getLedgerHealthVariant,
  getCollectedVariant,
} from '@/components/cards';
import { formatCents } from '@/lib/format';
import type { AdminDashboard } from '@/lib/types';
import { cn } from '@/lib/cn';

interface FigureTileProps {
  label: string;
  value: string;
  /** Optional sub-text beneath the value. */
  sub?: string;
  /** Tailwind text class for value coloring — semantic token, no raw hex. */
  valueClass?: string;
}

/** Small inset stat tile used within the LedgerHealth card. */
function FigureTile({ label, value, sub, valueClass = 'text-ink-900' }: FigureTileProps) {
  return (
    <div className="adm-tile space-y-1">
      <p className="font-mono text-[0.6875rem] uppercase tracking-wide text-ink-500">{label}</p>
      <p className={cn('font-display text-xl font-semibold num-old', valueClass)}>{value}</p>
      {sub && <p className="text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

/**
 * Platform-wide ledger health — real figures (outstanding / overdue /
 * collected this month). The donut shows the share of outstanding money that
 * is overdue, driven by getLedgerHealthVariant. No raw hex — all colors are
 * semantic CSS variable tokens.
 */
export function LedgerHealth({ ledger }: { ledger: AdminDashboard['ledger'] }) {
  const { outstanding_cents, overdue_cents, collected_this_month_cents } = ledger;

  const healthRole   = getLedgerHealthVariant(outstanding_cents, overdue_cents);
  const collectedRole = getCollectedVariant(collected_this_month_cents, overdue_cents);

  const overduePct =
    outstanding_cents > 0 ? (overdue_cents / outstanding_cents) * 100 : 0;

  /* Donut fill follows the same semantic token via CSS variables — no raw hex. */
  const donutColorVar =
    healthRole === 'success'
      ? 'var(--color-success-500)'
      : healthRole === 'warning'
      ? 'var(--color-warning-500)'
      : 'var(--color-danger-500)';

  const overduePctLabel =
    outstanding_cents > 0
      ? `${overduePct.toFixed(1)}% of outstanding`
      : 'Nothing outstanding';

  /* Overdue value coloring — semantic tokens. */
  const overdueValueClass =
    overdue_cents > 0
      ? healthRole === 'danger'
        ? 'text-danger-600'
        : 'text-warning-600'
      : 'text-success-600';

  /* Collected value coloring follows the collected variant. */
  const collectedValueClass =
    collectedRole === 'success'
      ? 'text-success-600'
      : collectedRole === 'danger'
      ? 'text-danger-600'
      : 'text-ink-900';

  return (
    <DashboardSection>
      <SectionHeader eyebrow="Finance" title="Ledger health" />

      <NexusCard role="neutral" className="p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Overdue-share donut — honest: 0% when nothing is outstanding */}
          <div className="shrink-0 text-center">
            <Donut pct={overduePct} color={donutColorVar} size={96} label="Overdue" />
            <p className="mt-1 text-xs text-ink-500">share of outstanding</p>
          </div>

          {/* Three figure tiles — inset within the card, not nested card-within-card */}
          <dl className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <FigureTile
              label="Outstanding"
              value={formatCents(outstanding_cents)}
              sub={outstanding_cents <= 0 ? 'All clear' : undefined}
            />
            <FigureTile
              label="Overdue"
              value={formatCents(overdue_cents)}
              sub={overduePctLabel}
              valueClass={overdueValueClass}
            />
            <FigureTile
              label="Collected this month"
              value={formatCents(collected_this_month_cents)}
              valueClass={collectedValueClass}
            />
          </dl>
        </div>
      </NexusCard>
    </DashboardSection>
  );
}
