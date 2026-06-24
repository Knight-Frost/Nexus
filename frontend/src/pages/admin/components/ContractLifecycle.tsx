import { NexusCard, DashboardSection, SectionHeader } from '@/components/cards';
import type { AdminDashboard } from '@/lib/types';

interface Stage {
  label: string;
  count: number;
  /** Tailwind bg class (semantic token, never raw hex). */
  bgClass: string;
  /** Matching dot class for the legend. */
  dotClass: string;
}

/**
 * Contract lifecycle distribution — real counts from the admin dashboard
 * `contracts` aggregate, rendered as a stacked segment meter plus a legend.
 * All colors are semantic tokens; raw hex is never used.
 */
export function ContractLifecycle({ contracts }: { contracts: AdminDashboard['contracts'] }) {
  const stages: Stage[] = [
    { label: 'Draft',          count: contracts.draft,          bgClass: 'bg-ink-300',     dotClass: 'bg-ink-300' },
    { label: 'Pending tenant', count: contracts.pending_tenant, bgClass: 'bg-warning-400', dotClass: 'bg-warning-400' },
    { label: 'Active',         count: contracts.active,         bgClass: 'bg-success-500', dotClass: 'bg-success-500' },
    { label: 'Terminated',     count: contracts.terminated,     bgClass: 'bg-danger-500',  dotClass: 'bg-danger-500' },
    { label: 'Expired',        count: contracts.expired,        bgClass: 'bg-ink-400',     dotClass: 'bg-ink-400' },
  ];

  const total = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <DashboardSection>
      <SectionHeader eyebrow="Agreements" title="Contract lifecycle" />
      <NexusCard role="neutral" className="p-6 space-y-5">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-semibold text-ink-900 num-old">{total}</span>
          <span className="text-sm text-ink-500">contracts across all states</span>
        </div>

        {/* Stacked segment meter */}
        <div
          className="adm-segment-track"
          role="img"
          aria-label={`Contract lifecycle: ${stages.map((s) => `${s.label} ${s.count}`).join(', ')}`}
        >
          {total > 0 &&
            stages.map((s) =>
              s.count > 0 ? (
                <div
                  key={s.label}
                  className={`adm-segment ${s.bgClass}`}
                  style={{ width: `${(s.count / total) * 100}%` }}
                  title={`${s.label}: ${s.count}`}
                />
              ) : null,
            )}
        </div>

        {/* Legend */}
        <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {stages.map((s) => (
            <li key={s.label} className="flex items-center gap-2.5">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dotClass}`}
                aria-hidden="true"
              />
              <span className="text-sm text-ink-600">{s.label}</span>
              <span className="ml-auto font-mono text-sm font-semibold text-ink-900 num-old">
                {s.count}
              </span>
            </li>
          ))}
        </ul>
      </NexusCard>
    </DashboardSection>
  );
}
