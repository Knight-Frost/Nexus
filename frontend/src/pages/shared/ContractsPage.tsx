/**
 * Contracts (Lease & Rent) — Homecrest lease agreements.
 *
 * Editorial layout: SectionHeader + four DERIVED stat cards (StatusCard) +
 * a filterable panel that shows either the contract list or a rich empty
 * state. Data is LIVE and role-aware (tenant / landlord / admin) via the API.
 * Landlords can draft a contract through the create modal.
 *
 * The four headline figures are derived from the loaded contracts, never typed.
 * Contract status badges use SemanticBadge + getContractVariant.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/auth';
import { useApi } from '@/hooks/useApi';
import { adminApi, landlordApi, tenantApi } from '@/lib/endpoints';
import { formatCents, formatDate, humanize } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Field';
import {
  StatusCard,
  SemanticBadge,
  DataCardGrid,
  getContractVariant,
} from '@/components/cards';
import {
  IconDoc,
  IconClock,
  IconCheckCircle,
  IconCalendar,
  IconUsers,
  IconPlus,
  IconBell,
  IconSearch,
  IconFilter,
  IconShield,
  IconArrowRight,
  IconArrowUpRight,
} from '@/components/ui/icons';
import type { Contract, ContractStatus } from '@/lib/types';
import { brand } from '@/config/brand';
import './contracts.css';

/* ── tabs: All + the four lifecycle states the design surfaces ────────────── */
type FilterTab = 'all' | ContractStatus;
const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_tenant', label: 'Pending review' },
  { key: 'active', label: 'Active' },
  { key: 'expired', label: 'Expired' },
  { key: 'terminated', label: 'Cancelled' },
];

/** Friendly status label (overrides the raw enum where the design renames it). */
function statusLabel(status: ContractStatus): string {
  if (status === 'pending_tenant') return 'Pending review';
  if (status === 'terminated') return 'Cancelled';
  return humanize(status);
}

/* ── a small warm-paper town, drawn inline (no asset dependency) ──────────── */
function TownArt() {
  const wall = 'var(--color-ink-200)';
  const wall2 = 'var(--color-ink-300)';
  const roof = 'var(--color-ink-300)';
  const tree = 'color-mix(in srgb, var(--color-success-600) 35%, var(--color-ink-200))';
  return (
    <svg className="ct-empty-art" viewBox="0 0 280 96" fill="none" aria-hidden="true">
      {/* ground line */}
      <line x1="8" y1="88" x2="272" y2="88" stroke="var(--color-ink-200)" strokeWidth="1.5" />
      {/* trees */}
      <circle cx="40" cy="70" r="11" fill={tree} />
      <rect x="38.5" y="78" width="3" height="10" fill={wall2} />
      <circle cx="244" cy="68" r="12" fill={tree} />
      <rect x="242.5" y="77" width="3" height="11" fill={wall2} />
      {/* buildings */}
      <rect x="64" y="44" width="34" height="44" rx="2" fill={wall} />
      <rect x="70" y="52" width="6" height="6" fill="var(--color-surface)" />
      <rect x="86" y="52" width="6" height="6" fill="var(--color-surface)" />
      <rect x="70" y="64" width="6" height="6" fill="var(--color-surface)" />
      <rect x="86" y="64" width="6" height="6" fill="var(--color-surface)" />
      {/* house with gable */}
      <path d="M104 88V58l20-14 20 14v30z" fill={wall2} />
      <path d="M101 60l23-16 23 16" stroke={roof} strokeWidth="3" strokeLinejoin="round" fill="none" />
      <rect x="118" y="70" width="12" height="18" fill="var(--color-surface)" />
      {/* tall block */}
      <rect x="152" y="34" width="30" height="54" rx="2" fill={wall} />
      <rect x="158" y="42" width="5" height="6" fill="var(--color-surface)" />
      <rect x="171" y="42" width="5" height="6" fill="var(--color-surface)" />
      <rect x="158" y="54" width="5" height="6" fill="var(--color-surface)" />
      <rect x="171" y="54" width="5" height="6" fill="var(--color-surface)" />
      <rect x="158" y="66" width="5" height="6" fill="var(--color-surface)" />
      <rect x="171" y="66" width="5" height="6" fill="var(--color-surface)" />
      {/* small house */}
      <path d="M188 88V62l16-11 16 11v26z" fill={wall2} />
      <path d="M186 64l18-13 18 13" stroke={roof} strokeWidth="3" strokeLinejoin="round" fill="none" />
      <rect x="198" y="72" width="12" height="16" fill="var(--color-surface)" />
    </svg>
  );
}

interface CreateContractForm {
  listing_id: string;
  tenant_email: string;
  rent_amount: string;
  payment_day: string;
  start_date: string;
  end_date: string;
}

const EMPTY_FORM: CreateContractForm = {
  listing_id: '', tenant_email: '', rent_amount: '', payment_day: '1', start_date: '', end_date: '',
};

/* ================================================================== page ==== */

export function ContractsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const navigate = useNavigate();

  const [tab, setTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateContractForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateContractForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  const { data, loading, error, reload } = useApi<Contract[]>(async () => {
    if (role === 'tenant') return tenantApi.contracts();
    if (role === 'landlord') return landlordApi.contracts();
    if (role === 'admin') return (await adminApi.contracts()).data;
    return [];
  }, [role]);

  const contracts = useMemo(() => data ?? [], [data]);

  /* DERIVED headline figures — never hardcoded. */
  const stats = useMemo(() => ({
    total: contracts.length,
    pending: contracts.filter((c) => c.status === 'pending_tenant').length,
    active: contracts.filter((c) => c.status === 'active').length,
    expired: contracts.filter((c) => c.status === 'expired').length,
  }), [contracts]);

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { all: contracts.length, draft: 0, pending_tenant: 0, active: 0, terminated: 0, expired: 0 };
    for (const c of contracts) counts[c.status] += 1;
    return counts;
  }, [contracts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contracts.filter((c) => {
      if (tab !== 'all' && c.status !== tab) return false;
      if (q === '') return true;
      const parts = [
        c.listing?.title,
        c.listing?.unit?.property?.name,
        c.landlord && `${c.landlord.first_name} ${c.landlord.last_name}`,
        c.tenant && `${c.tenant.first_name} ${c.tenant.last_name}`,
      ];
      return parts.some((p) => p && p.toLowerCase().includes(q));
    });
  }, [contracts, tab, query]);

  /* ---- create modal (landlord) ---- */
  function openCreate() {
    setForm(EMPTY_FORM); setFormErrors({}); setCreateSuccess(false); setCreateOpen(true);
  }
  function closeCreate() { if (!submitting) setCreateOpen(false); }
  function setField(key: keyof CreateContractForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function onNewContract() {
    if (role === 'landlord' || role === 'admin') openCreate();
    else setNotice('Contracts are drafted and sent to you by your landlord — they’ll appear here for review.');
  }

  async function handleCreate() {
    const errors: Partial<Record<keyof CreateContractForm, string>> = {};
    if (!form.listing_id.trim()) errors.listing_id = 'Listing ID is required.';
    if (!form.tenant_email.trim()) errors.tenant_email = 'Tenant email is required.';
    const rent = parseInt(form.rent_amount, 10);
    if (!form.rent_amount || isNaN(rent) || rent <= 0) errors.rent_amount = 'Enter a valid rent amount in cedis.';
    const day = parseInt(form.payment_day, 10);
    if (!form.payment_day || isNaN(day) || day < 1 || day > 28) errors.payment_day = 'Payment day must be 1–28.';
    if (!form.start_date) errors.start_date = 'Start date is required.';
    if (!form.end_date) errors.end_date = 'End date is required.';
    if (form.start_date && form.end_date && form.end_date <= form.start_date) errors.end_date = 'End date must be after start date.';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSubmitting(true);
    try {
      await landlordApi.createContract({
        listing_id: parseInt(form.listing_id, 10),
        tenant_id: 0, // resolved tenant_email → id server-side in practice
        rent_amount: rent * 100,
        payment_day: day,
        start_date: form.start_date,
        end_date: form.end_date,
      });
      setCreateSuccess(true);
      reload();
      setTimeout(() => setCreateOpen(false), 1200);
    } catch {
      setFormErrors({ listing_id: 'Failed to create contract. Check all fields and try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  const description =
    role === 'landlord' ? 'Lease contracts you have drafted or sent to tenants.'
    : role === 'admin' ? 'All lease contracts across the platform.'
    : 'Your lease agreements and their current status.';
  const eyebrow = role === 'admin' ? 'Administration' : role === 'landlord' ? 'Operations' : 'My Rental';
  const emptyText =
    role === 'landlord' ? 'Contracts you create for tenants will appear here.'
    : role === 'admin' ? 'Contracts created across the platform will appear here.'
    : 'When a landlord sends you a contract, it will appear here for review.';

  return (
    <div className="ct-page">
      {/* ── page header ── */}
      <header className="ct-head">
        <div className="ct-head-title">
          <p className="ct-eyebrow">{eyebrow}</p>
          <h1 className="ct-title">Contracts</h1>
          <p className="ct-sub">{description}</p>
        </div>
        <button className="ct-btn ct-btn-primary" onClick={onNewContract}>
          <IconPlus size={17} /> New contract
        </button>
      </header>

      {/* ── derived stat cards (StatusCard grid) ── */}
      <section aria-label="Contract summary">
        <DataCardGrid cols={4}>
          <StatusCard
            label="Total contracts"
            value={loading ? '—' : stats.total}
            sub="All time"
            icon={<IconDoc size={18} />}
            role="neutral"
            loading={loading}
          />
          <StatusCard
            label="Pending review"
            value={loading ? '—' : stats.pending}
            sub="Awaiting acceptance"
            icon={<IconClock size={18} />}
            role={!loading && stats.pending > 0 ? 'warning' : 'neutral'}
            loading={loading}
          />
          <StatusCard
            label="Active"
            value={loading ? '—' : stats.active}
            sub="Currently in effect"
            icon={<IconCheckCircle size={18} />}
            role={!loading && stats.active > 0 ? 'success' : 'neutral'}
            loading={loading}
          />
          <StatusCard
            label="Expired"
            value={loading ? '—' : stats.expired}
            sub="Past end date"
            icon={<IconCalendar size={18} />}
            role="neutral"
            loading={loading}
          />
        </DataCardGrid>
      </section>

      {/* ── main panel ── */}
      <section className="ct-panel">
        <div className="ct-toolbar">
          <div className="ct-tabs" role="tablist" aria-label="Contract filters">
            {TABS.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} className={`ct-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}
                {tabCounts[t.key] > 0 && <span className="ct-tab-count">{tabCounts[t.key]}</span>}
              </button>
            ))}
          </div>
          <div className="ct-tools">
            <div className="ct-search">
              <IconSearch size={16} />
              <input type="text" placeholder="Search contracts…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search contracts" />
            </div>
            <button className="ct-filter" aria-label="Filter contracts"><IconFilter size={16} /> Filter</button>
          </div>
        </div>

        {loading ? (
          <div className="ct-skel-list" aria-hidden="true">{Array.from({ length: 4 }).map((_, i) => <div className="ct-skel" key={i} />)}</div>
        ) : error ? (
          <div className="ct-mini-empty">
            <span className="ct-mini-ico"><IconDoc size={24} /></span>
            <p className="ct-mini-title">We couldn't load your contracts</p>
            <p className="ct-mini-text">{error.message}</p>
            <button className="ct-btn ct-btn-ghost" onClick={reload} style={{ marginTop: 14 }}>Try again</button>
          </div>
        ) : contracts.length === 0 ? (
          <div className="ct-empty">
            <span className="ct-empty-ico"><IconDoc size={34} /></span>
            <TownArt />
            <p className="ct-empty-title">No contracts yet</p>
            <p className="ct-empty-text">{emptyText}</p>
            <a className="ct-btn ct-btn-primary" href="https://www.investopedia.com/terms/l/lease.asp" target="_blank" rel="noreferrer">
              Learn how contracts work <IconArrowUpRight size={16} />
            </a>
          </div>
        ) : visible.length === 0 ? (
          <div className="ct-mini-empty">
            <span className="ct-mini-ico"><IconDoc size={24} /></span>
            <p className="ct-mini-title">No matching contracts</p>
            <p className="ct-mini-text">{query.trim() ? 'No contracts match your search.' : 'No contracts in this category.'}</p>
          </div>
        ) : (
          <div className="ct-list">
            {visible.map((c) => {
              const place = c.listing?.unit?.property?.name;
              const landlordName = c.landlord ? `${c.landlord.first_name} ${c.landlord.last_name}` : `Landlord #${c.landlord_id}`;
              const tenantName = c.tenant ? `${c.tenant.first_name} ${c.tenant.last_name}` : `Tenant #${c.tenant_id}`;
              const counterparty = role === 'tenant' ? landlordName : tenantName;
              return (
                <button type="button" className="ct-card" key={c.id} onClick={() => navigate(`/app/contracts/${c.id}`)}>
                  <div className="ct-card-top">
                    <div style={{ minWidth: 0 }}>
                      <div className="ct-card-title">{c.listing?.title ?? `Contract ${c.id.slice(0, 8)}…`}</div>
                      {place && <div className="ct-card-place">{place}</div>}
                    </div>
                    {/* SemanticBadge replaces the raw .ct-status span */}
                    <SemanticBadge role={getContractVariant(c.status)}>
                      {statusLabel(c.status)}
                    </SemanticBadge>
                  </div>
                  <div className="ct-card-grid">
                    <div className="ct-meta"><IconUsers size={14} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{counterparty}</span></div>
                    <div className="ct-meta rent">{formatCents(c.rent_amount)}/mo</div>
                    <div className="ct-meta" style={{ gridColumn: '1 / -1' }}><IconCalendar size={14} /><span>{formatDate(c.start_date)} – {formatDate(c.end_date)}</span></div>
                  </div>
                  <div className="ct-card-foot">View contract <IconArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /></div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── reassurance footer ── */}
      <div className="ct-secure">
        <span className="ct-secure-ico"><IconShield size={20} /></span>
        <div className="ct-secure-body">
          <div className="ct-secure-title">Your security is our priority</div>
          <div className="ct-secure-text">All contracts are securely stored and only you and the landlord can access them.</div>
        </div>
        <button className="ct-btn ct-btn-ghost" onClick={() => setNotice('Contracts are encrypted at rest and scoped to the parties on the agreement.')}>Learn more</button>
      </div>

      {/* ── Create Contract modal (landlord/admin) ── */}
      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Create Contract"
        description="Draft a new lease agreement for a tenant."
        size="md"
        footer={createSuccess ? (
          <span className="text-sm font-medium text-success-600">Contract created!</span>
        ) : (
          <>
            <Button variant="secondary" onClick={closeCreate} disabled={submitting}>Cancel</Button>
            <Button onClick={handleCreate} loading={submitting}>Create</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Field label="Listing ID" required error={formErrors.listing_id}>
            {(id, invalid) => <Input id={id} invalid={invalid} type="number" placeholder="e.g. 42" value={form.listing_id} onChange={(e) => setField('listing_id', e.target.value)} />}
          </Field>
          <Field label="Tenant email" required error={formErrors.tenant_email} hint={`The tenant must already have a ${brand.appName} account.`}>
            {(id, invalid) => <Input id={id} invalid={invalid} type="email" placeholder="tenant@example.com" value={form.tenant_email} onChange={(e) => setField('tenant_email', e.target.value)} />}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly rent (GH₵)" required error={formErrors.rent_amount}>
              {(id, invalid) => <Input id={id} invalid={invalid} type="number" min={1} placeholder="e.g. 1500" value={form.rent_amount} onChange={(e) => setField('rent_amount', e.target.value)} />}
            </Field>
            <Field label="Payment day" required error={formErrors.payment_day} hint="Day of each month (1–28)">
              {(id, invalid) => <Input id={id} invalid={invalid} type="number" min={1} max={28} value={form.payment_day} onChange={(e) => setField('payment_day', e.target.value)} />}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date" required error={formErrors.start_date}>
              {(id, invalid) => <Input id={id} invalid={invalid} type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} />}
            </Field>
            <Field label="End date" required error={formErrors.end_date}>
              {(id, invalid) => <Input id={id} invalid={invalid} type="date" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} />}
            </Field>
          </div>
        </div>
      </Modal>

      {notice && (
        <div role="alert" className="ct-toast">
          <IconBell size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          {notice}
        </div>
      )}
    </div>
  );
}
