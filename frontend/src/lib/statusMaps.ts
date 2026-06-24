/**
 * Readable labels + semantic tones for the landlord operational surfaces.
 *
 * TRUTH GUARD: every map below is keyed by the REAL backend enum values only.
 * Mockup-invented states ("reconciled", "security_deposit", "waiting_on_vendor",
 * "scheduled") deliberately have no entry here, so they cannot be rendered.
 */
import type { Tone } from '@/components/ui/Badge';
import type {
  ApplicationStatus,
  LedgerType,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from './types';

/* ---- Applications -------------------------------------------------------- */
export const applicationStatusLabel: Record<ApplicationStatus, string> = {
  submitted: 'New',
  in_review: 'In review',
  landlord_review: 'Ready to review',
  approved: 'Approved',
  rejected: 'Declined',
  withdrawn: 'Withdrawn',
};

export const applicationStatusTone: Record<ApplicationStatus, Tone> = {
  submitted: 'info',
  in_review: 'warning',
  landlord_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
};

/* ---- Maintenance -------------------------------------------------------- */
export const maintenanceStatusLabel: Record<MaintenanceStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const maintenanceStatusTone: Record<MaintenanceStatus, Tone> = {
  open: 'danger',
  acknowledged: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'neutral',
  cancelled: 'neutral',
};

export const maintenancePriorityLabel: Record<MaintenancePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const maintenancePriorityTone: Record<MaintenancePriority, Tone> = {
  low: 'neutral',
  medium: 'warning',
  high: 'warning',
  urgent: 'danger',
};

export const maintenanceCategoryLabel: Record<MaintenanceCategory, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  appliance: 'Appliance',
  hvac: 'HVAC',
  structural: 'Structural',
  general: 'General',
};

/* ---- Ledger entry type -------------------------------------------------- */
export const ledgerTypeLabel: Record<LedgerType, string> = {
  rent: 'Rent charge',
  payment: 'Payment received',
  late_fee: 'Late fee',
  refund: 'Refund',
};

/** Money sign convention: payments reduce the balance, charges/refunds raise it. */
export function ledgerSignedTone(type: LedgerType): Tone {
  return type === 'payment' ? 'success' : type === 'refund' ? 'info' : 'danger';
}

/** True when the entry credits the account (renders with a leading minus). */
export function ledgerIsCredit(type: LedgerType): boolean {
  return type === 'payment';
}
