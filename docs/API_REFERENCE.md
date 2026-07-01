# Wyncrest REST API Reference

Generated from controllers, FormRequests, models, and enums. Reflects actual code behavior.

Base path: all routes are prefixed with `/api`.

## Cross-Cutting Conventions (read first)

- **Auth header**: Laravel Sanctum bearer tokens. Send `Authorization: Bearer <token>` for any authenticated route. The token is the `token` field returned by `/register` and `/login`.
- **Auth/role legend**:
  - `public` - no auth.
  - `any-auth` - `auth:sanctum` only (user OR admin token).
  - `tenant` / `landlord` - `auth:sanctum` + role middleware. The token's user `user_type` must match.
  - `admin` - `auth:sanctum` + admin middleware (admins are a separate table/guard).
  - `admin|landlord` - metrics routes only.
- **Money representation - IMPORTANT, two different schemes:**
  - `Contract.rent_amount` and `LedgerEntry.amount_cents` are **integers in CENTS**. (`rent_amount` is named without a `_cents` suffix but is still cents - see `StoreContractRequest` min:1 = $0.01, and `Contract` cast `integer` + `getRentInDollarsAttribute = rent_amount / 100`.)
  - `Unit.rent_amount` and `Unit.security_deposit` are **decimal DOLLARS** (cast `decimal:2`, e.g. `"1500.00"`).
  - The `*_in_dollars` accessors (`Contract::rent_in_dollars`, `LedgerEntry::amount_in_dollars`) exist as PHP methods but are **NOT in `$appends`**, so they are **NOT present in JSON responses**. Do not rely on them. Compute dollars client-side as `cents / 100`.
  - The `/tenant/payments/balance` endpoint is the exception: it explicitly returns both `balance_cents` and `balance_dollars`.
- **Response wrapping - inconsistent across endpoints. Three patterns:**
  1. **Bare model / bare collection / bare paginator** - many index/show endpoints return the Eloquent result directly with no wrapper key (e.g. tenant contracts index returns a raw JSON array; admin contracts index returns a raw Laravel paginator object).
  2. **Action responses** wrap in a named key plus `message`, e.g. `{ "message": "...", "property": {...} }`, `{ "message": "...", "contract": {...} }`, `{ "message": "...", "listing": {...} }`.
  3. **Auth/analytics/metrics** use their own keys: `{ "user": {...}, "token": "..." }`, `{ "analytics": {...}, "scoped_to": "..." }`, `{ "success": true, "data": {...} }`.
- **Pagination**:
  - **Paginated (Laravel `LengthAwarePaginator` shape: `{ data:[...], current_page, last_page, per_page, total, from, to, first_page_url, ... }`)**: `GET /listings` (public), `GET /admin/audit-logs`, `GET /admin/contracts`, `GET /admin/ledger`, `GET /notifications`.
  - **Plain array (no pagination)**: tenant/landlord contracts, tenant/landlord ledger, properties, units, landlord listings, saved listings, featured listings, admin pending listings, unread notifications.
- **Decimal casts** serialize as **strings**, not numbers (e.g. `Unit.rent_amount` → `"1500.00"`, `bedrooms` → `"2.0"`). Integer/boolean casts serialize as JSON number/boolean.
- **ID types**: `User`, `Property`, `Unit`, `Listing`, `Feature`, `AuditLog` use **bigint** integer IDs. `Contract`, `LedgerEntry`, `Notification` use **UUID string** IDs.
- **Validation errors**: Laravel default `422` with `{ "message": "...", "errors": { "field": ["..."] } }`. Auth failures `401`. Role/policy failures `403`. Model-not-found route binding `404`. Rate limit `429`.
- **Timestamps**: `created_at` etc. serialized as ISO 8601 strings.

---

## Enums (allowed string values)

| Enum | Values |
|---|---|
| `UserType` | `tenant`, `landlord` |
| `PropertyType` | `single_family`, `multi_family`, `apartment`, `condo`, `townhouse`, `commercial`, `other` |
| `UnitAvailabilityStatus` | `available`, `occupied`, `pending`, `maintenance`, `unlisted` |
| `ListingStatus` | `draft`, `pending_review`, `active`, `inactive`, `rejected`, `archived` |
| `ContractStatus` | `draft`, `pending_tenant`, `active`, `terminated`, `expired` |
| `BillingCycle` | `monthly` (only value) |
| `LedgerType` | `rent`, `late_fee`, `payment`, `refund` |
| `LedgerStatus` | `pending`, `paid`, `overdue`, `waived` |
| `NotificationType` | `rent_generated`, `rent_due_soon`, `rent_overdue`, `payment_succeeded`, `payment_failed`, `late_fee_added`, `contract_signed`, `contract_terminated` |
| `TerminatedBy` | `landlord`, `tenant`, `admin` |

---

## Auth

### POST /api/register - public
Body:
| field | type | rules |
|---|---|---|
| `email` | string | required, email, max:255, unique |
| `password` | string | required, confirmed (`password_confirmation` required), min:8, mixed case, numbers |
| `first_name` | string | required, max:100 |
| `last_name` | string | required, max:100 |
| `phone` | string\|null | nullable, max:20 |
| `user_type` | string | required, in: `tenant`,`landlord` |

`201` response:
```json
{
  "user": {
    "id": 1, "email": "a@b.com", "first_name": "A", "last_name": "B",
    "full_name": "A B", "phone": null, "user_type": "tenant",
    "is_active": true, "identity_verified": false,
    "created_at": "2026-06-09T12:00:00.000000Z"
  },
  "token": "1|plainTextSanctumToken..."
}
```

### POST /api/login - public
Body: `email` (required, email), `password` (required, string). Rate limited: 5 attempts/min per IP+email; `429`/`422` with throttle message on lockout.

`200` response: same `{ "user": {...}, "token": "..." }` as register.
- If credentials belong to an **admin**, `user` is the admin shape instead:
```json
{ "user": { "id": 1, "email": "...", "name": "Admin Name", "is_super_admin": false, "is_active": true, "last_login_at": "..." }, "token": "..." }
```
- `422` on bad credentials, deactivated, or suspended account.

### GET /api/user - any-auth
`200`: `{ "user": {...} }` - user shape (above) for users, admin shape for admins.

### POST /api/logout - any-auth
Revokes current token. `200`: `{ "message": "Successfully logged out" }`.

---

## Public

Object shapes used below:

**Listing** (bare Eloquent, with eager-loaded relations):
```json
{
  "id": 12, "unit_id": 5, "landlord_id": 3, "title": "...", "description": "...",
  "status": "active", "reviewed_by": null, "reviewed_at": null, "rejection_reason": null,
  "published_at": "2026-05-01T...", "expires_at": null, "featured": false, "view_count": 10,
  "pets_allowed": true, "pet_policy": "...", "lease_duration_months": 12, "move_in_date": "2026-07-01",
  "created_at": "...", "updated_at": "...", "deleted_at": null,
  "unit": { "...Unit...", "property": { "...Property..." } },
  "primary_photo": { "id": 1, "path": "...", "disk": "local", "filename": "...", "mime_type": "...", "file_size": 1234, "width": 800, "height": 600, "sort_order": 0, "is_primary": true, "alt_text": null },
  "landlord": { "...User..." }
}
```
**Unit**: `id, property_id, unit_number, internal_name, bedrooms ("2.0"), bathrooms ("1.0"), square_feet, rent_amount ("1500.00"), security_deposit ("1500.00"), availability_status, available_from, amenities (array), is_active, created_at, updated_at, deleted_at`.
**Property**: `id, landlord_id, name, property_type, street_address, street_address_2, city, state, zip_code, country, year_built, lot_size ("0.00"), description, is_active, created_at, updated_at, deleted_at`.

### GET /api/listings - public
Query params (all nullable): `keyword`, `city`, `state` (size:2), `zip_code`, `min_price` (numeric), `max_price` (numeric), `bedrooms` (int), `bathrooms` (numeric), `property_type`, `pets_allowed` (bool), `sort_by` (`newest`|`price_low`|`price_high`|`featured`), `per_page` (1–100, default 20).

`200`: **Laravel paginator** of Listings (eager: `unit.property`, `primaryPhoto`, `landlord`):
```json
{ "current_page": 1, "data": [ { ...Listing... } ], "first_page_url": "...", "from": 1, "last_page": 3, "per_page": 20, "to": 20, "total": 55, ... }
```

### GET /api/listings/featured - public
Query: `limit` (1–20, default 6). `200`: **bare array** of Listings (eager `unit.property`, `primaryPhoto`).

### GET /api/listings/{id} - public
`200`: **bare Listing** object (eager `unit.property`, `photos`, `landlord`). `404` `{ "message": "Listing not found or is not publicly available" }` if not public.

---

## Tenant  (prefix `/api/tenant`, role: tenant)

### GET /tenant/dashboard
`200`:
```json
{
  "user": { "name": "A B", "email": "...", "email_verified": false },
  "statistics": { "saved_listings_count": 3 },
  "recent_saved_listings": [ { ...Listing with unit.property, primary_photo, pivot... } ]
}
```
(`recent_saved_listings` items include a `pivot` object with `notes`, `created_at`, `updated_at` from the `saved_listings` join.)

### GET /tenant/saved-listings
`200`: **bare array** of Listings (eager `unit.property`, `primaryPhoto`, `landlord`; each has `pivot.notes`).

### POST /tenant/listings/{listing}/save
Body: `notes` (nullable, string, max:500).
`201`: `{ "message": "Listing saved successfully", "listing": { ...Listing with unit.property, primary_photo... } }`.
`422` if listing not public or already saved.

### DELETE /tenant/listings/{listing}/save
`200`: `{ "message": "Listing removed from saved listings" }`. `404` if not saved.

---

**Contract** object (bare Eloquent; UUID id; `rent_amount` in CENTS):
```json
{
  "id": "uuid", "listing_id": 12, "landlord_id": 3, "tenant_id": 7,
  "rent_amount": 150000, "currency": "USD", "billing_cycle": "monthly",
  "payment_day": 1, "start_date": "2026-07-01", "end_date": null,
  "status": "active", "terminated_by": null, "termination_reason": null,
  "admin_id": null, "created_at": "...", "updated_at": "..."
}
```

### GET /tenant/contracts
`200`: **bare array** of Contracts (eager `listing.unit.property`, `landlord`).

### GET /tenant/contracts/{contract}
`200`: **bare Contract** (eager `listing.unit.property`, `landlord`, `admin`).

### POST /tenant/contracts/{contract}/accept
No body. Transitions `pending_tenant` → `active` (policy `accept`).
`200`: `{ "message": "Contract accepted and activated", "contract": { ...fresh Contract... } }`.

### POST /tenant/contracts/{contract}/terminate
Body: `reason` (required, string, min:10, max:1000).
`200`: `{ "message": "Contract terminated", "contract": { ...fresh, terminated_by: "tenant"... } }`.

---

**LedgerEntry** object (bare Eloquent; UUID id; `amount_cents` in CENTS; immutable):
```json
{
  "id": "uuid", "contract_id": "uuid", "tenant_id": 7, "landlord_id": 3,
  "type": "rent", "amount_cents": 150000, "currency": "USD",
  "billing_period_start": "2026-07-01", "billing_period_end": "2026-07-31",
  "due_date": "2026-07-01", "status": "pending",
  "related_rent_entry_id": null, "stripe_payment_intent_id": null,
  "created_at": "..."
}
```
(No `updated_at` - entries are immutable.)

### GET /tenant/ledger
`200`: **bare array** of LedgerEntries (eager `contract.listing`, `relatedRentEntry`), ordered by `due_date` desc.

### GET /tenant/ledger/{ledgerEntry}
`200`: **bare LedgerEntry** (eager `contract.listing`, `relatedRentEntry`).

### POST /tenant/payments/initiate/{ledgerEntry}
No body (amount comes from the ledger entry; authorized by `pay` policy).
`200`: `{ "message": "Payment intent created", "client_secret": "pi_..._secret_...", "payment_intent_id": "pi_..." }`.
`422` for Stripe errors / invalid state (sanitized message). `500` unexpected.

### GET /tenant/payments/balance
`200`: `{ "balance_cents": 150000, "balance_dollars": 1500, "owes_money": true }`. (`balance_dollars` = cents/100, a number.)

---

## Landlord  (prefix `/api/landlord`, role: landlord)

### GET /landlord/onboarding
`200`:
```json
{
  "completion_percentage": 60,
  "steps": [
    { "key": "profile", "title": "...", "description": "...", "completed": true, "action": "/profile/edit" },
    { "key": "identity", "title": "...", "description": "...", "completed": false, "action": "/identity/verify", "help_text": "Contact support to start verification" },
    { "key": "property", "...": "...", "completed": true, "action": "/landlord/properties/create" },
    { "key": "unit", "...": "...", "completed": false, "action": null, "disabled": true },
    { "key": "listing", "...": "...", "completed": false, "action": null, "disabled": true }
  ]
}
```

### Properties
- **GET /landlord/properties** - `200` **bare array** of Properties, each with extra `units_count` (int).
- **POST /landlord/properties** - body below. `201`: `{ "message": "Property created successfully", "property": { ...Property with units:[] } }`.
- **GET /landlord/properties/{property}** - `200` **bare Property** (eager `units`, `activeUnits`).
- **PUT /landlord/properties/{property}** - partial update (all `sometimes`). `200`: `{ "message": "...", "property": { ...fresh with units } }`.
- **DELETE /landlord/properties/{property}** - `200` `{ "message": "Property deleted successfully" }`. `422` if it still has units.

**StorePropertyRequest** body:
| field | type | rules |
|---|---|---|
| `name` | string | required, max:255 |
| `property_type` | enum | required, PropertyType |
| `street_address` | string | required, max:255 |
| `street_address_2` | string\|null | nullable, max:255 |
| `city` | string | required, max:100 |
| `state` | string | required, size:2, uppercase |
| `zip_code` | string | required, max:10 |
| `country` | string\|null | nullable, size:2, uppercase |
| `year_built` | int\|null | nullable, 1800..(currentYear+1) |
| `lot_size` | numeric\|null | nullable, 0..9999.99 |
| `description` | string\|null | nullable, max:2000 |

UpdatePropertyRequest: same fields, all `sometimes`/nullable.

### Units
- **GET /landlord/units** - `200` **bare array** of Units (eager `property`, `activeListing`).
- **POST /landlord/properties/{property}/units** - body below. `201`: `{ "message": "Unit created successfully", "unit": { ...Unit with property } }`.
- **GET /landlord/units/{unit}** - `200` **bare Unit** (eager `property`, `listings`).
- **PUT /landlord/units/{unit}** - partial update. `200`: `{ "message": "...", "unit": {...fresh with property, listings} }`.
- **DELETE /landlord/units/{unit}** - `200` `{ "message": "Unit deleted successfully" }`. `422` if it has `active` listings.

**StoreUnitRequest** body:
| field | type | rules |
|---|---|---|
| `unit_number` | string\|null | nullable, max:50 |
| `internal_name` | string\|null | nullable, max:255 |
| `bedrooms` | numeric | required, 0..20 |
| `bathrooms` | numeric | required, 0..20 |
| `square_feet` | int\|null | nullable, 0..999999 |
| `rent_amount` | numeric | required, 0..999999.99 (**DOLLARS**) |
| `security_deposit` | numeric\|null | nullable, 0..999999.99 (**DOLLARS**) |
| `availability_status` | enum | required, UnitAvailabilityStatus |
| `available_from` | date\|null | nullable, after_or_equal:today |
| `amenities` | array\|null | nullable; each item string max:100 |

UpdateUnitRequest: same, required fields become `sometimes`; `available_from` drops the today constraint.

### Listings (landlord)
Lifecycle: Draft → Submit → (admin review) → Active. Feature-gated: requires `listings` feature (else error from FeatureGatingService).
- **GET /landlord/listings** - `200` **bare array** of Listings (eager `unit.property`, `primaryPhoto`).
- **POST /landlord/units/{unit}/listings** - body = StoreListingRequest. Created as `draft`. `201`: `{ "message": "Listing created as draft", "listing": { ...with unit.property, photos } }`. `422` if unit already has active listing.
- **GET /landlord/listings/{listing}** - `200` **bare Listing** (eager `unit.property`, `photos`, `reviewer`).
- **PUT /landlord/listings/{listing}** - body = UpdateListingRequest (partial). `200`: `{ "message": "...", "listing": {...fresh} }`.
- **POST /landlord/listings/{listing}/submit** - no body; validates listing completeness. Sets `pending_review`. `200`: `{ "message": "Listing submitted for admin review", "listing": {...fresh} }`.
- **DELETE /landlord/listings/{listing}** - `200` `{ "message": "Listing deleted successfully" }`.

**StoreListingRequest** body:
| field | type | rules |
|---|---|---|
| `title` | string | required, max:255 |
| `description` | string | required, min:50, max:5000 |
| `pets_allowed` | boolean | required |
| `pet_policy` | string\|null | required_if pets_allowed=true, nullable, max:1000 |
| `lease_duration_months` | int\|null | nullable, 1..36 |
| `move_in_date` | date\|null | nullable, after_or_equal:today |

UpdateListingRequest: `title`,`description`,`pets_allowed` become `sometimes`; `move_in_date` drops the today constraint.

### Contracts (landlord)
- **GET /landlord/contracts** - `200` **bare array** of Contracts (eager `listing`, `tenant`).
- **POST /landlord/contracts** - body = StoreContractRequest. Created as `draft`. `201`: `{ "message": "Contract created as draft", "contract": {...with listing, tenant} }`. `422` if listing already has a contract; `403` if listing not owned.
- **GET /landlord/contracts/{contract}** - `200` **bare Contract** (eager `listing`, `tenant`, `admin`).
- **POST /landlord/contracts/{contract}/send** - no body. Sets `pending_tenant`. `200`: `{ "message": "Contract sent to tenant", "contract": {...fresh} }`.
- **POST /landlord/contracts/{contract}/terminate** - body `reason` (required, min:10, max:1000). Sets `terminated`, `terminated_by: "landlord"`. `200`: `{ "message": "Contract terminated", "contract": {...fresh} }`.

**StoreContractRequest** body:
| field | type | rules |
|---|---|---|
| `listing_id` | int | required, exists:listings |
| `tenant_id` | int | required, must be a user with user_type=tenant |
| `rent_amount` | int | required, 1..9999999999 (**CENTS**; min $0.01) |
| `currency` | string | sometimes, size:3, uppercase (default `USD`) |
| `billing_cycle` | enum | sometimes, BillingCycle (default `monthly`) |
| `payment_day` | int | required, 1..28 |
| `start_date` | date | required, after_or_equal:today |
| `end_date` | date\|null | nullable, after:start_date |

### Ledger (landlord, read-only)
- **GET /landlord/ledger** - `200` **bare array** of LedgerEntries (eager `contract.listing`, `tenant`, `relatedRentEntry`), ordered `due_date` desc.
- **GET /landlord/ledger/{ledgerEntry}** - `200` **bare LedgerEntry** (eager `contract.listing`, `tenant`, `relatedRentEntry`).

### Analytics (landlord-scoped) - see Shared Analytics section
- **GET /landlord/analytics/financial** → FinancialAnalyticsController
- **GET /landlord/analytics/contracts** → ContractAnalyticsController

---

## Admin  (prefix `/api/admin`, role: admin)

### GET /admin/dashboard
`200`:
```json
{
  "statistics": { "landlords": 5, "tenants": 20, "properties": 12, "pending_listings": 3, "active_listings": 8 },
  "recent_listings": [ { ...Listing with landlord, unit.property... } ]
}
```

### Listing moderation
- **GET /admin/listings/pending** - `200` **bare array** (Collection) of Listings pending review (eager `unit.property`, `landlord`).
- **POST /admin/listings/{listing}/approve** - no body. `200`: `{ "message": "Listing approved and published", "listing": {...published} }`. `422` if not `pending_review`.
- **POST /admin/listings/{listing}/reject** - body `reason` (required, string, min:20, max:1000). `200`: `{ "message": "Listing rejected", "listing": {...fresh, status: "rejected"} }`. `422` if not `pending_review`.

### Feature management
- **GET /admin/landlords/{landlord}/features** - `200`:
```json
{
  "landlord": { "id": 3, "name": "A B", "email": "...", "identity_verified": false },
  "features": [
    { "id": 1, "key": "listings", "name": "...", "description": "...",
      "requires_identity_verification": false, "enabled": true,
      "can_enable": true, "reason": null }
  ]
}
```
`422` if user is not a landlord.
- **POST /admin/landlords/{landlord}/features/{feature}/enable** - body `notes` (nullable, max:500). `201`: `{ "message": "Feature '...' enabled for landlord", "landlord_feature": {...} }`. `422` if cannot enable / not a landlord. (`{feature}` is the feature **key** string.)
- **POST /admin/landlords/{landlord}/features/{feature}/disable** - no body. `200`: `{ "message": "Feature '...' disabled for landlord" }`. `422` if not a landlord / error.

### Audit logs
- **GET /admin/audit-logs** - query filters (all nullable): `action`, `actor_type`, `actor_id` (int), `subject_type`, `subject_id` (int), `severity` (`info`|`warning`|`critical`), `from_date` (date), `to_date` (date, after_or_equal from_date), `per_page` (1–100, default 50). `200`: **Laravel paginator** of AuditLogs (eager `actor`, `subject`).
  - **AuditLog** shape: `id, actor_type, actor_id, subject_type, subject_id, action, description, ip_address, user_agent, old_values (array|null), new_values (array|null), metadata (array|null), severity, created_at, actor {...}, subject {...}`. (No `updated_at`.)
- **GET /admin/audit-logs/{auditLog}** - `200` **bare AuditLog** (eager `actor`, `subject`).

### Contracts (admin)
- **GET /admin/contracts** - query: `status` (string), `landlord_id` (integer), `tenant_id` (integer). `200`: **Laravel paginator** (per_page 50) of Contracts (eager `listing`, `landlord`, `tenant`, `admin`).
  - `landlord_id`/`tenant_id` validate as `integer` (bigint `User` FKs); `contract_id` still validates as `uuid`, matching the `contracts` table's UUID primary key.
- **GET /admin/contracts/{contract}** - `200` **bare Contract** (eager `listing.unit.property`, `landlord`, `tenant`, `admin`).
- **POST /admin/contracts/{contract}/terminate** - body `reason` (required, min:20, max:2000). Sets `terminated`, `terminated_by: "admin"`, `admin_id`. `200`: `{ "message": "Contract terminated by admin", "contract": {...fresh} }`. `422` if not active.

### Ledger (admin)
- **GET /admin/ledger** - query (all `sometimes`): `type` (`rent`|`late_fee`), `status` (`pending`|`paid`|`overdue`|`waived`), `tenant_id`, `landlord_id`, `contract_id`. `200`: **Laravel paginator** (50) of LedgerEntries (eager `contract`, `tenant`, `landlord`, `relatedRentEntry`).
- **GET /admin/ledger/{ledgerEntry}** - `200` **bare LedgerEntry** (eager `contract`, `tenant`, `landlord`, `relatedRentEntry`).
- **POST /admin/ledger/{ledgerEntry}/late-fee** - body `amount_cents` (required, integer, 1..100000000 = max $1M, **CENTS**). `201`: `{ "message": "Late fee generated successfully", "late_fee": { ...LedgerEntry type=late_fee, with relatedRentEntry } }`. `422` on error.

### Admin analytics (prefix `/admin/analytics`)
Same controllers/shapes as Shared Analytics, full-platform scope:
- **GET /admin/analytics/notifications**, **/financial**, **/contracts**, **/platform**.

---

## Shared

### Notifications (prefix `/api/notifications`, role: any-auth)

**Notification** shape: `id (uuid), user_id, type, title, message, data (object|null), read_at (datetime|null), delivered_at, delivery_failed_at, sms_delivered_at, sms_failed_at, created_at`. (No `updated_at`.)

- **GET /notifications** - query `per_page` (default 20). `200`: **Laravel paginator** of Notifications.
- **GET /notifications/unread** - `200`: **bare array** (Collection) of unread Notifications.
- **GET /notifications/unread-count** - `200`: `{ "unread_count": 4 }`.
- **PATCH /notifications/{notification}/read** - `200`: `{ "message": "Notification marked as read" }`. (Policy: own notifications only → `403` otherwise.)
- **POST /notifications/mark-all-read** - `200`: `{ "message": "N notifications marked as read", "count": N }`.

### Notification preferences (role: any-auth)

- **GET /api/notification-preferences** - `200`: **map keyed by NotificationType**, every type present (defaults `email:true, sms:false`):
```json
{
  "rent_generated": { "email": true, "sms": false },
  "rent_due_soon": { "email": true, "sms": false },
  "rent_overdue": { "email": true, "sms": false },
  "payment_succeeded": { "email": true, "sms": false },
  "payment_failed": { "email": true, "sms": false },
  "late_fee_added": { "email": true, "sms": false },
  "contract_signed": { "email": true, "sms": false },
  "contract_terminated": { "email": true, "sms": false }
}
```
- **PUT /api/notification-preferences** - body is a map of `{ <notification_type>: { "email": bool, "sms": bool } }`. Each entry validated `*.email` and `*.sms` required boolean. Unknown type keys are silently skipped. `200`: `{ "message": "Preferences updated successfully", "preferences": { ...only the updated types... } }`. `422` on invalid format.

### Analytics (prefix `/api/analytics`, role: any-auth, role-scoped)

All four return the SAME wrapper: `{ "analytics": { ...service-specific object... }, "scoped_to": "<scope>" }`.
- `scoped_to`: `personal` (tenant, or notifications for any non-admin), `landlord` (landlord; auto-scopes to their first property if `property_id` omitted), `all` (admin).
- **GET /analytics/notifications** - query: `start_date`, `end_date` (after_or_equal start_date), `type` (string). All nullable.
- **GET /analytics/financial** - query: `start_date`, `end_date`, `property_id` (int, exists), `group_by` (`month`|`property`).
- **GET /analytics/contracts** - query: `start_date`, `end_date`, `property_id` (int, exists).
- **GET /analytics/platform** - query: `property_id` (int, exists). **Tenants get `403`** `{ "message": "Unauthorized. Tenants cannot access platform analytics." }`.
- Validation failures here return `422` `{ "message": "Validation failed", "errors": {...} }`.
- The `analytics` payload is computed by Analytics services (cached 300s); shape varies per service. Treat as an opaque object per endpoint on the client (or model loosely).

### Metrics (prefix `/api/admin/metrics`, role: admin|landlord)

All endpoints wrap as `{ "success": true, "data": <MetricsService result> }`.
- **GET /admin/metrics** - `summary()`.
- **GET /admin/metrics/latency** - latency percentiles.
- **GET /admin/metrics/errors?minutes=5** - error rate (`minutes` query, default 5).
- **GET /admin/metrics/requests?minutes=5** - request rate.
- **GET /admin/metrics/queue** - queue depth.
- **GET /admin/metrics/recent?limit=20** - recent requests (`limit` default 20).

### Stripe webhook
- **POST /api/webhooks/stripe** - public route, signature verified inside `StripeWebhookController`. Not for client use.

---

## TypeScript client notes

- Configure the Axios/fetch base URL to `/api` and always attach `Authorization: Bearer <token>`.
- Model money as integers (cents) for `Contract.rent_amount`, `LedgerEntry.amount_cents`, and the `amount_cents` request body fields; divide by 100 for display. Treat `Unit.rent_amount`/`security_deposit` as decimal-string dollars.
- For index endpoints, branch on response shape: paginated endpoints return `{ data, current_page, ... }`; the rest return bare arrays. (See the pagination list in Conventions.)
- Decimal fields arrive as strings - parse with `Number()` where you need arithmetic.
- IDs: number for User/Property/Unit/Listing/Feature/AuditLog; string (UUID) for Contract/LedgerEntry/Notification.
