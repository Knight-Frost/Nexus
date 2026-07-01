import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import { fieldErrors } from '@/lib/api';
import type { ApiError, Listing, ListingStatus, MediaAsset } from '@/lib/types';
import {
  formatCedisDecimal,
  formatDate,
  humanize,
  storageUrl,
  timeAgo,
} from '@/lib/format';
import { paginate, rangeLabel } from '@/lib/paginate';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { RecordList, RecordCard, RecordRelated } from '@/components/ui/RecordCard';
import { DetailDrawer } from '@/components/ui/Drawer';
import { DestructiveConfirmDialog } from '@/components/ui/DestructiveConfirmDialog';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import {
  CommandBar,
  SearchInput,
  FilterTabs,
  SortSelect,
  Pagination,
  ActionMenu,
  Thumbnail,
  type FilterTab as Tab,
  type SelectOption,
} from '@/components/landlord/primitives';
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconClock,
  IconDownload,
  IconEdit,
  IconEye,
  IconFileText,
  IconHome,
  IconImage,
  IconPlus,
  IconTrash,
  IconUsers,
} from '@/components/ui/icons';
import { GalleryManager } from '@/components/media/GalleryManager';
import { useToast } from '@/components/ui/toast';
import {
  StatusCard,
  SemanticBadge,
  DashboardSection,
  DataCardGrid,
  getListingModerationVariant,
  getReviewQueueVariant,
} from '@/components/cards';

type FilterKey = 'all' | ListingStatus;
type SortKey = 'newest' | 'oldest' | 'rent_high' | 'rent_low' | 'views' | 'applications';

const SORT_OPTIONS: SelectOption<SortKey>[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'rent_high', label: 'Rent (high)' },
  { value: 'rent_low', label: 'Rent (low)' },
  { value: 'views', label: 'Most viewed' },
  { value: 'applications', label: 'Most applied' },
];

const PER_PAGE = 8;

interface ListingForm {
  unit_id: string;
  title: string;
  description: string;
  pets_allowed: boolean;
  pet_policy: string;
  lease_duration_months: string;
  move_in_date: string;
}

function emptyListingForm(): ListingForm {
  return {
    unit_id: '',
    title: '',
    description: '',
    pets_allowed: false,
    pet_policy: '',
    lease_duration_months: '',
    move_in_date: '',
  };
}

function listingFormFrom(l: Listing): ListingForm {
  return {
    unit_id: String(l.unit_id),
    title: l.title,
    description: l.description,
    pets_allowed: l.pets_allowed,
    pet_policy: l.pet_policy ?? '',
    lease_duration_months: l.lease_duration_months != null ? String(l.lease_duration_months) : '',
    move_in_date: l.move_in_date ?? '',
  };
}

/** Client-side guard mirroring the backend listing rules. */
function validateListing(form: ListingForm, needUnit: boolean): Record<string, string> {
  const errs: Record<string, string> = {};
  if (needUnit && !form.unit_id) errs.unit_id = 'Choose a unit to list.';
  if (!form.title.trim()) errs.title = 'A title is required.';
  if (form.description.trim().length < 50) errs.description = 'Description must be at least 50 characters.';
  return errs;
}

export function LandlordListings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => landlordApi.listings(), []);
  // Real application counts per listing (no faked analytics) — grouped client-side.
  const appsApi = useApi(() => landlordApi.applications(), []);

  const [tab, setTab] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<'submit' | 'delete' | null>(null);

  // Create / edit form state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [form, setForm] = useState<ListingForm>(emptyListingForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Read-only view + delete confirm
  const [viewing, setViewing] = useState<Listing | null>(null);
  const [toDelete, setToDelete] = useState<Listing | null>(null);

  // Gallery management (per-listing photos). The full listing detail
  // (GET /landlord/listings/{id}) returns `media_assets` ordered by sort_order.
  const [galleryListing, setGalleryListing] = useState<Listing | null>(null);
  const [galleryItems, setGalleryItems] = useState<MediaAsset[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  async function loadGallery(listingId: number) {
    setGalleryLoading(true);
    try {
      const full = await landlordApi.listing(listingId);
      setGalleryItems((full.media_assets ?? []).slice().sort((a, b) => a.sort_order - b.sort_order));
    } catch (err) {
      toast((err as ApiError).message, 'error');
    } finally {
      setGalleryLoading(false);
    }
  }

  function openGallery(listing: Listing) {
    setGalleryListing(listing);
    setGalleryItems([]);
    void loadGallery(listing.id);
  }

  const listings = useMemo(() => data ?? [], [data]);

  const appCountByListing = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of appsApi.data ?? []) map.set(a.listing_id, (map.get(a.listing_id) ?? 0) + 1);
    return map;
  }, [appsApi.data]);

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of listings) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [listings]);

  const tabs: Tab<FilterKey>[] = [
    { key: 'all', label: 'All', count: listings.length },
    { key: 'active', label: 'Active', count: tabCounts.active ?? 0, tone: 'success' },
    { key: 'draft', label: 'Draft', count: tabCounts.draft ?? 0, tone: 'neutral' },
    { key: 'pending_review', label: 'Pending review', count: tabCounts.pending_review ?? 0, tone: 'warning' },
    { key: 'inactive', label: 'Inactive', count: tabCounts.inactive ?? 0, tone: 'neutral' },
    { key: 'rejected', label: 'Rejected', count: tabCounts.rejected ?? 0, tone: 'danger' },
    { key: 'archived', label: 'Archived', count: tabCounts.archived ?? 0, tone: 'neutral' },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = tab === 'all' ? listings : listings.filter((l) => l.status === tab);
    if (q) {
      rows = rows.filter((l) => {
        const hay = [
          l.title,
          l.unit?.unit_number,
          l.unit?.property?.name,
          l.unit?.property?.city,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const rentOf = (l: Listing) => parseFloat(l.unit?.rent_amount ?? '0') || 0;
    const sorted = [...rows].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return +new Date(a.updated_at) - +new Date(b.updated_at);
        case 'rent_high':
          return rentOf(b) - rentOf(a);
        case 'rent_low':
          return rentOf(a) - rentOf(b);
        case 'views':
          return b.view_count - a.view_count;
        case 'applications':
          return (appCountByListing.get(b.id) ?? 0) - (appCountByListing.get(a.id) ?? 0);
        case 'newest':
        default:
          return +new Date(b.updated_at) - +new Date(a.updated_at);
      }
    });
    return sorted;
  }, [listings, tab, search, sort, appCountByListing]);

  const slice = paginate(filtered, page, PER_PAGE);

  // KPIs — all real counts from the landlord's own listings.
  const kpi = {
    total: listings.length,
    active: tabCounts.active ?? 0,
    pending: tabCounts.pending_review ?? 0,
    drafts: tabCounts.draft ?? 0,
  };

  function update<K extends keyof ListingForm>(key: K, value: ListingForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  // Create now opens the full-page, multi-step listing builder (route-based).
  // The modal below is retained only for EDITING an existing listing.
  function openCreate() {
    navigate('/app/listings/create');
  }
  function openEdit(listing: Listing) {
    setEditing(listing);
    setForm(listingFormFrom(listing));
    setFormErrors({});
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Edit-only path — create navigates to /app/listings/create (route-based multi-step flow).
    if (!editing) return;
    const localErrors = validateListing(form, false);
    if (Object.keys(localErrors).length > 0) {
      setFormErrors(localErrors);
      return;
    }
    setSaving(true);
    setFormErrors({});
    const payload: Partial<Listing> = {
      title: form.title.trim(),
      description: form.description.trim(),
      pets_allowed: form.pets_allowed,
      pet_policy: form.pets_allowed ? form.pet_policy || null : null,
      lease_duration_months: form.lease_duration_months ? Number(form.lease_duration_months) : null,
      move_in_date: form.move_in_date || null,
    };
    try {
      await landlordApi.updateListing(editing.id, payload);
      toast('Listing updated', 'success');
      setFormOpen(false);
      reload();
    } catch (err) {
      const e2 = err as ApiError;
      const fe = fieldErrors(e2);
      setFormErrors(fe);
      if (Object.keys(fe).length === 0) toast(e2.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(listing: Listing) {
    setBusyId(listing.id);
    setBusyAction('submit');
    try {
      await landlordApi.submitListing(listing.id);
      toast('Listing submitted for review', 'success');
      reload();
    } catch (err) {
      toast((err as ApiError).message, 'error');
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    setBusyAction('delete');
    try {
      await landlordApi.deleteListing(toDelete.id);
      toast('Listing deleted', 'success');
      setToDelete(null);
      reload();
    } catch (err) {
      toast((err as ApiError).message, 'error');
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await landlordApi.exportListings();
      toast('Listings exported', 'success');
    } catch {
      toast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  const editingUnit = editing?.unit;
  const hasAny = listings.length > 0;

  return (
    <div className="animate-rise space-y-10">
      <PageHeader
        eyebrow="Portfolio"
        title="Listings"
        description="Publish and track rental listings across your units."
        action={
          <>
            <Button
              variant="secondary"
              leftIcon={<IconDownload size={16} />}
              onClick={handleExport}
              loading={exporting}
              disabled={!hasAny}
            >
              Export
            </Button>
            <Button leftIcon={<IconPlus size={16} />} onClick={openCreate}>
              Create listing
            </Button>
          </>
        }
      />

      {/* KPIs — real counts, semantic roles */}
      <DashboardSection eyebrow="LISTING OVERVIEW">
        <DataCardGrid cols={4}>
          <StatusCard
            label="Total listings"
            value={kpi.total}
            sub="Across your portfolio"
            icon={<IconFileText size={18} />}
            role="neutral"
            loading={loading}
          />
          <StatusCard
            label="Active listings"
            value={kpi.active}
            sub={kpi.total ? `${Math.round((kpi.active / kpi.total) * 100)}% of total` : 'None yet'}
            role="success"
            icon={<IconCheckCircle size={18} />}
            loading={loading}
          />
          <StatusCard
            label="Pending review"
            value={kpi.pending}
            sub="Awaiting admin approval"
            role={getReviewQueueVariant(kpi.pending)}
            icon={<IconClock size={18} />}
            loading={loading}
          />
          <StatusCard
            label="Drafts"
            value={kpi.drafts}
            sub="Not yet submitted"
            role="neutral"
            icon={<IconFileText size={18} />}
            loading={loading}
          />
        </DataCardGrid>
      </DashboardSection>

      {/* Command bar */}
      <CommandBar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search listings by property, unit or location…" label="Search listings" />
        <FilterTabs tabs={tabs} value={tab} onChange={(k) => { setTab(k); setPage(1); }} />
        <SortSelect value={sort} onChange={setSort} options={SORT_OPTIONS} />
      </CommandBar>

      {loading ? (
        <LoadingState label="Loading listings…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !hasAny ? (
        <EmptyState
          icon={<IconHome />}
          title="No listings yet"
          description="Create a listing from one of your units. Published listings appear here with their review and application activity."
          action={<Button leftIcon={<IconPlus size={16} />} onClick={openCreate}>Create listing</Button>}
        />
      ) : slice.total === 0 ? (
        <EmptyState
          icon={<IconHome />}
          title="No listings match"
          description="Try a different status filter or search term."
        />
      ) : (
        /* Record list — one standalone card per listing. No table shell, no
           horizontal scroll: thumbnail + identity + rent/engagement + status +
           actions all stay visible (stacking on mobile, inline columns on
           desktop). */
        <div className="space-y-5">
          <RecordList>
            {slice.items.map((listing) => {
              const isBusy = busyId === listing.id;
              const canSubmit = listing.status === 'draft';
              const isEditable = listing.status === 'draft' || listing.status === 'rejected' || listing.status === 'inactive';
              const canDelete = listing.status !== 'active' && listing.status !== 'pending_review';
              const apps = appCountByListing.get(listing.id) ?? 0;
              const rent = listing.unit?.rent_amount;

              const menuItems = [
                { label: 'Open public page', icon: <IconEye size={15} />, onClick: () => navigate(`/app/listing/${listing.id}`) },
                { label: 'Quick view', icon: <IconFileText size={15} />, onClick: () => setViewing(listing) },
                { label: 'Manage photos', icon: <IconImage size={15} />, onClick: () => openGallery(listing) },
                ...(canSubmit ? [{ label: 'Submit for review', icon: <IconCheckCircle size={15} />, onClick: () => handleSubmit(listing) }] : []),
                ...(isEditable ? [{ label: 'Edit listing', icon: <IconEdit size={15} />, onClick: () => openEdit(listing) }] : []),
                ...(canDelete ? [{ label: 'Delete', icon: <IconTrash size={15} />, danger: true, onClick: () => setToDelete(listing) }] : []),
              ];

              return (
                <RecordCard
                  key={listing.id}
                  onClick={() => setViewing(listing)}
                  leading={
                    <Thumbnail src={storageUrl(listing.primary_photo?.path)} alt={listing.title} seed={listing.title} size={64} />
                  }
                  title={listing.title}
                  titleMeta={
                    listing.featured ? <SemanticBadge role="info">Featured</SemanticBadge> : undefined
                  }
                  subtitle={
                    <>
                      <span>
                        {listing.unit ? `Unit ${listing.unit.unit_number}` : `Unit #${listing.unit_id}`}
                        {listing.unit?.property ? ` · ${listing.unit.property.name}, ${listing.unit.property.city}` : ''}
                      </span>
                      {listing.status === 'rejected' && listing.rejection_reason && (
                        <span className="flex items-center gap-1 text-danger-600">
                          <IconAlertTriangle size={12} className="shrink-0" /> Rejected
                        </span>
                      )}
                    </>
                  }
                  related={
                    <RecordRelated
                      title={rent ? `${formatCedisDecimal(rent)}/mo` : '—'}
                      lines={['Monthly rent']}
                    />
                  }
                  indicator={
                    <div className="flex gap-5">
                      <div>
                        <p className="flex items-center gap-1 text-sm font-semibold text-ink-800 tabular-nums">
                          <IconEye size={13} className="text-ink-400" />
                          {listing.view_count}
                        </p>
                        <p className="text-[11px] text-ink-400">Views</p>
                      </div>
                      <div>
                        <p className="flex items-center gap-1 text-sm font-semibold text-ink-800 tabular-nums">
                          <IconUsers size={13} className="text-ink-400" />
                          {apps}
                        </p>
                        <p className="text-[11px] text-ink-400">Applications</p>
                      </div>
                    </div>
                  }
                  status={
                    <SemanticBadge role={getListingModerationVariant(listing.status)}>
                      {humanize(listing.status)}
                    </SemanticBadge>
                  }
                  timestamp={<>Updated {timeAgo(listing.updated_at)}</>}
                  primaryAction={
                    isEditable ? (
                      <Button variant="secondary" size="sm" leftIcon={<IconEdit size={14} />} disabled={isBusy} onClick={() => openEdit(listing)}>
                        Edit
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" leftIcon={<IconEye size={14} />} onClick={() => navigate(`/app/listing/${listing.id}`)}>
                        View details
                      </Button>
                    )
                  }
                  menu={<ActionMenu items={menuItems} />}
                />
              );
            })}
          </RecordList>

          {/* Pagination — sits below the cards, never inside a table shell. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-500">{rangeLabel(slice, 'listing')}</p>
            <Pagination slice={slice} onPage={setPage} />
          </div>
        </div>
      )}

      {/* Edit listing drawer (create navigates to /app/listings/create) */}
      <DetailDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        eyebrow="LISTING"
        title="Edit listing"
        description="Update the listing details. Rejected listings return to draft for resubmission."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="listing-form" loading={saving}>Save changes</Button>
          </>
        }
      >
        <form id="listing-form" onSubmit={handleSave} className="space-y-4">
          {/* Unit — read-only in edit mode */}
          <Field label="Unit">
            {(fid) => (
              <Input
                id={fid}
                value={
                  editingUnit
                    ? `Unit ${editingUnit.unit_number}` + (editingUnit.internal_name ? ` · ${editingUnit.internal_name}` : '')
                    : `Unit #${editing?.unit_id ?? ''}`
                }
                disabled
              />
            )}
          </Field>

          <Field label="Title" error={formErrors.title} required>
            {(fid, invalid) => (
              <Input id={fid} invalid={invalid} placeholder="e.g. Bright 2-bed apartment in East Legon" value={form.title} onChange={(e) => update('title', e.target.value)} />
            )}
          </Field>

          <Field label="Description" error={formErrors.description} hint={`At least 50 characters · ${form.description.trim().length}/50`} required>
            {(fid, invalid) => (
              <Textarea id={fid} invalid={invalid} rows={5} placeholder="Describe the home, the neighbourhood, and what makes it a great rental…" value={form.description} onChange={(e) => update('description', e.target.value)} />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lease duration (months)" error={formErrors.lease_duration_months}>
              {(fid, invalid) => (
                <Input id={fid} type="number" min="1" invalid={invalid} placeholder="e.g. 12" value={form.lease_duration_months} onChange={(e) => update('lease_duration_months', e.target.value)} />
              )}
            </Field>
            <Field label="Available move-in date" error={formErrors.move_in_date}>
              {(fid, invalid) => (
                <Input id={fid} type="date" invalid={invalid} value={form.move_in_date} onChange={(e) => update('move_in_date', e.target.value)} />
              )}
            </Field>
          </div>

          <Field label="Pets" error={formErrors.pets_allowed}>
            {(fid) => (
              <label htmlFor={fid} className="flex items-center gap-2 text-sm text-ink-700">
                <input id={fid} type="checkbox" className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" checked={form.pets_allowed} onChange={(e) => update('pets_allowed', e.target.checked)} />
                Pets allowed
              </label>
            )}
          </Field>

          {form.pets_allowed && (
            <Field label="Pet policy" error={formErrors.pet_policy}>
              {(fid, invalid) => (
                <Input id={fid} invalid={invalid} placeholder="e.g. Cats and small dogs welcome, GH₵ 500 pet deposit" value={form.pet_policy} onChange={(e) => update('pet_policy', e.target.value)} />
              )}
            </Field>
          )}
        </form>
      </DetailDrawer>

      {/* Quick view — read-only details drawer */}
      <DetailDrawer
        open={viewing !== null}
        onClose={() => setViewing(null)}
        eyebrow="LISTING"
        title={viewing?.title ?? 'Listing'}
        footer={<Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>}
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <SemanticBadge role={getListingModerationVariant(viewing.status)}>
                {humanize(viewing.status)}
              </SemanticBadge>
              {viewing.featured && <SemanticBadge role="info">Featured</SemanticBadge>}
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <div><dt className="text-xs text-ink-500">Unit</dt><dd className="mt-1 text-sm font-medium text-ink-900">{viewing.unit ? `Unit ${viewing.unit.unit_number}` : `Unit #${viewing.unit_id}`}</dd></div>
              <div><dt className="text-xs text-ink-500">Property</dt><dd className="mt-1 text-sm font-medium text-ink-900">{viewing.unit?.property?.name ?? '—'}</dd></div>
              <div><dt className="text-xs text-ink-500">Rent</dt><dd className="mt-1 text-sm font-medium" style={{ color: 'var(--color-money)' }}>{viewing.unit?.rent_amount ? `${formatCedisDecimal(viewing.unit.rent_amount)}/mo` : '—'}</dd></div>
              <div><dt className="text-xs text-ink-500">Views</dt><dd className="mt-1 text-sm font-medium text-ink-900">{viewing.view_count}</dd></div>
              <div><dt className="text-xs text-ink-500">Applications</dt><dd className="mt-1 text-sm font-medium text-ink-900">{appCountByListing.get(viewing.id) ?? 0}</dd></div>
              <div><dt className="text-xs text-ink-500">Published</dt><dd className="mt-1 text-sm font-medium text-ink-900">{formatDate(viewing.published_at)}</dd></div>
            </dl>
            <div><dt className="text-xs text-ink-500">Description</dt><dd className="mt-1 whitespace-pre-line text-sm text-ink-600">{viewing.description}</dd></div>
            {viewing.rejection_reason && (
              <div className="flex gap-2 rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700">
                <IconAlertTriangle size={15} className="mt-0.5 shrink-0" /><span>{viewing.rejection_reason}</span>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>

      {/* Delete confirmation */}
      <DestructiveConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete listing"
        description={toDelete ? `Delete "${toDelete.title}"? This cannot be undone.` : undefined}
        confirmLabel="Delete"
        loading={busyAction === 'delete'}
      />

      {/* Listing gallery drawer */}
      <DetailDrawer
        open={galleryListing !== null}
        onClose={() => setGalleryListing(null)}
        title={galleryListing ? `Photos: ${galleryListing.title}` : 'Photos'}
        widthClass="sm:max-w-[820px]"
        footer={<Button variant="secondary" onClick={() => setGalleryListing(null)}>Close</Button>}
      >
        {galleryListing && (
          <GalleryManager
            target={{ type: 'listing', id: galleryListing.id }}
            items={galleryItems}
            loading={galleryLoading}
            onRefetch={() => loadGallery(galleryListing.id)}
          />
        )}
      </DetailDrawer>
    </div>
  );
}
