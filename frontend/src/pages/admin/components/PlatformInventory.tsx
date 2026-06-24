import {
  NexusCard,
  DashboardSection,
  SectionHeader,
} from '@/components/cards';
import type { AdminDashboard } from '@/lib/types';

interface InventoryProps {
  listingsByStatus: AdminDashboard['listings_by_status'];
  properties: number;
  units: number;
  totalListings: number;
}

interface InventoryRow {
  label: string;
  count: number;
  /** Tailwind bg class for the horizontal bar fill — semantic token, no raw hex. */
  fillClass: string;
}

/**
 * Platform inventory — real listing distribution by status plus property and
 * unit totals. A horizontal mini-bar per status keeps it scannable.
 * All fill colors use Tailwind semantic tokens.
 */
export function PlatformInventory({
  listingsByStatus,
  properties,
  units,
  totalListings,
}: InventoryProps) {
  const rows: InventoryRow[] = [
    { label: 'Active',         count: listingsByStatus.active,         fillClass: 'bg-success-500' },
    { label: 'Pending review', count: listingsByStatus.pending_review, fillClass: 'bg-warning-400' },
    { label: 'Draft',          count: listingsByStatus.draft,          fillClass: 'bg-ink-300' },
    { label: 'Rejected',       count: listingsByStatus.rejected,       fillClass: 'bg-danger-500' },
    { label: 'Inactive',       count: listingsByStatus.inactive,       fillClass: 'bg-ink-400' },
    { label: 'Archived',       count: listingsByStatus.archived,       fillClass: 'bg-ink-200' },
  ];

  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <DashboardSection>
      <SectionHeader eyebrow="Portfolio" title="Platform inventory" />
      <NexusCard role="neutral" className="p-6 space-y-5">
        {/* Headline counts */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Properties', value: properties },
            { label: 'Units',       value: units },
            { label: 'Listings',    value: totalListings },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-ink-200 bg-surface p-3 text-center"
            >
              <p className="font-display text-2xl font-semibold text-ink-900 num-old">{value}</p>
              <p className="mt-0.5 text-xs text-ink-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Listing distribution bars */}
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-ink-600">{r.label}</span>
              <div className="adm-bar-track flex-1">
                <div
                  className={`adm-bar-fill ${r.fillClass}`}
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-sm font-semibold text-ink-900 num-old">
                {r.count}
              </span>
            </li>
          ))}
        </ul>
      </NexusCard>
    </DashboardSection>
  );
}
