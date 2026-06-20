/**
 * Formatting helpers. Centralized so money/date rendering is consistent and the
 * two backend money schemes are never confused at the call site.
 *
 * Currency: Nexus is a Ghana platform — all money is displayed in Ghana Cedis (GH&#8373;).
 * The backend stores integer "cents" (pesewas) for Contract/LedgerEntry amounts
 * and decimal strings for Unit.rent_amount.
 */
import type { ContractStatus, LedgerStatus, ListingStatus } from './types';

const GHS_FMT = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const GHS_NO_DEC = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Render integer pesewas/cents as GH&#8373; (Contract.rent_amount, LedgerEntry.amount_cents). */
export function formatCents(cents: number): string {
  return 'GH₵ ' + GHS_FMT.format(cents / 100);
}

/** Render a decimal cedi string from the API (Unit.rent_amount = "3500.00"). */
export function formatDollars(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? 'GH₵ ' + GHS_FMT.format(n) : '—';
}

/**
 * Render a decimal cedi string without fractional digits, useful for listing
 * cards where "GH&#8373; 3,500" is cleaner than "GH&#8373; 3,500.00".
 */
export function formatCedisDecimal(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? 'GH₵ ' + GHS_NO_DEC.format(n) : '—';
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-GH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

/** "pending_review" -> "Pending review" */
export function humanize(value: string | null | undefined): string {
  if (!value) return '—';
  const s = value.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---- Status -> semantic tone (drives Badge color) ------------------------- */
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

export function listingStatusTone(status: ListingStatus): Tone {
  switch (status) {
    case 'active':         return 'success';
    case 'pending_review': return 'warning';
    case 'rejected':       return 'danger';
    case 'draft':          return 'neutral';
    default:               return 'neutral';
  }
}

export function contractStatusTone(status: ContractStatus): Tone {
  switch (status) {
    case 'active':         return 'success';
    case 'pending_tenant': return 'warning';
    case 'terminated':     return 'danger';
    case 'expired':        return 'neutral';
    case 'draft':          return 'neutral';
    default:               return 'neutral';
  }
}

export function ledgerStatusTone(status: LedgerStatus): Tone {
  switch (status) {
    case 'paid':    return 'success';
    case 'pending': return 'info';
    case 'overdue': return 'danger';
    case 'waived':  return 'neutral';
    default:        return 'neutral';
  }
}
