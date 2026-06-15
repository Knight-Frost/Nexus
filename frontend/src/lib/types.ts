/**
 * Domain types — mirror the Laravel backend exactly.
 *
 * Money note (see docs/API_REFERENCE.md):
 *  - Contract.rent_amount and LedgerEntry.amount_cents are INTEGER CENTS.
 *  - Unit.rent_amount / Unit.security_deposit are DECIMAL DOLLAR STRINGS ("1500.00").
 * Use the helpers in lib/format.ts to render either correctly.
 */

/* ---- Enums (string unions matching backend Enum values) ------------------ */
export type UserType = 'tenant' | 'landlord';

export type PropertyType =
  | 'single_family'
  | 'multi_family'
  | 'apartment'
  | 'condo'
  | 'townhouse'
  | 'commercial'
  | 'other';

export type UnitAvailabilityStatus =
  | 'available'
  | 'occupied'
  | 'pending'
  | 'maintenance'
  | 'unlisted';

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'inactive'
  | 'rejected'
  | 'archived';

export type ContractStatus =
  | 'draft'
  | 'pending_tenant'
  | 'active'
  | 'terminated'
  | 'expired';

export type BillingCycle = 'monthly';

export type LedgerType = 'rent' | 'late_fee' | 'payment' | 'refund';

export type LedgerStatus = 'pending' | 'paid' | 'overdue' | 'waived';

export type NotificationType =
  | 'rent_generated'
  | 'rent_due_soon'
  | 'rent_overdue'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'late_fee_added'
  | 'contract_signed'
  | 'contract_terminated';

export type TerminatedBy = 'landlord' | 'tenant' | 'admin';

export type Role = UserType | 'admin';

/* ---- Identity ------------------------------------------------------------ */
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string | null;
  user_type: UserType;
  is_active: boolean;
  identity_verified: boolean;
  created_at: string;
}

export interface Admin {
  id: number;
  email: string;
  name: string;
  is_super_admin: boolean;
  is_active: boolean;
  last_login_at: string | null;
}

/** Discriminated union of who is logged in. `role` is derived client-side. */
export type AuthUser =
  | (User & { role: UserType })
  | (Admin & { role: 'admin' });

export interface AuthResponse {
  user: User | Admin;
  token: string;
}

/* ---- Catalogue ----------------------------------------------------------- */
export interface Property {
  id: number;
  landlord_id: number;
  name: string;
  property_type: PropertyType;
  street_address: string;
  street_address_2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  year_built: number | null;
  lot_size: string | null;
  description: string | null;
  is_active: boolean;
  units_count?: number;
  units?: Unit[];
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: number;
  property_id: number;
  unit_number: string;
  internal_name: string | null;
  bedrooms: string;
  bathrooms: string;
  square_feet: number | null;
  rent_amount: string; // dollars, e.g. "1500.00"
  security_deposit: string | null; // dollars
  availability_status: UnitAvailabilityStatus;
  available_from: string | null;
  amenities: string[] | null;
  is_active: boolean;
  property?: Property;
  created_at: string;
  updated_at: string;
}

export interface ListingPhoto {
  id: number;
  listing_id: number;
  path: string;
  is_primary: boolean;
  sort_order: number;
  alt_text: string | null;
}

export interface Listing {
  id: number;
  unit_id: number;
  landlord_id: number;
  title: string;
  description: string;
  status: ListingStatus;
  rejection_reason: string | null;
  published_at: string | null;
  expires_at: string | null;
  featured: boolean;
  view_count: number;
  pets_allowed: boolean;
  pet_policy: string | null;
  lease_duration_months: number | null;
  move_in_date: string | null;
  unit?: Unit;
  photos?: ListingPhoto[];
  primary_photo?: ListingPhoto | null;
  created_at: string;
  updated_at: string;
}

/* ---- Agreements & money -------------------------------------------------- */
export interface Contract {
  id: string; // UUID
  listing_id: number;
  landlord_id: number;
  tenant_id: number;
  rent_amount: number; // cents
  currency: string;
  billing_cycle: BillingCycle;
  payment_day: number;
  start_date: string;
  end_date: string;
  status: ContractStatus;
  terminated_by: TerminatedBy | null;
  termination_reason: string | null;
  landlord?: User;
  tenant?: User;
  listing?: Listing;
  created_at: string;
}

export interface LedgerEntry {
  id: string; // UUID
  contract_id: string;
  tenant_id: number;
  landlord_id: number;
  type: LedgerType;
  amount_cents: number; // cents
  currency: string;
  billing_period_start: string | null;
  billing_period_end: string | null;
  due_date: string | null;
  status: LedgerStatus;
  related_rent_entry_id: string | null;
  stripe_payment_intent_id: string | null;
  contract?: Contract;
  created_at: string;
}

/* ---- Engagement ---------------------------------------------------------- */
export interface AppNotification {
  id: string; // UUID
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_type: string | null;
  actor_id: number | null;
  subject_type: string | null;
  subject_id: number | null;
  action: string;
  description: string | null;
  ip_address: string | null;
  severity: 'info' | 'warning' | 'critical';
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Feature {
  id: number;
  key: string;
  name: string;
  description: string | null;
  is_available: boolean;
  enabled?: boolean;
}

/* ---- Pagination (Laravel paginator) -------------------------------------- */
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/* ---- Standardized client error ------------------------------------------- */
export interface ApiError {
  status: number;
  message: string;
  /** Laravel 422 field errors, if present. */
  errors?: Record<string, string[]>;
}
