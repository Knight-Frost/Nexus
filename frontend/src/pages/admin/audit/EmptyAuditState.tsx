/**
 * EmptyAuditState — shown when no audit events match the current filters.
 * Preserves the --audit-* token ring (intentional audit page identity) while
 * using the shared editorial layout conventions (Fraunces headline, spacing).
 */
import { Button } from '@/components/ui/Button';
import { IconShield } from '@/components/ui/icons';

export function EmptyAuditState({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 px-6 py-14 text-center">
      {/* Icon ring — uses --audit-accent-bg intentionally (audit page identity) */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          color: 'var(--audit-accent)',
          background: 'var(--audit-accent-bg)',
          border: '1px solid var(--audit-accent-border)',
        }}
      >
        <IconShield size={24} />
      </div>

      <h3 className="font-display text-xl font-semibold text-ink-900">No events found</h3>
      <p className="max-w-xs text-sm text-ink-500">
        No audit events match your current filters. Try widening the date range or clearing a filter.
      </p>

      {onClearFilters && (
        <Button variant="secondary" size="sm" className="mt-1" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
