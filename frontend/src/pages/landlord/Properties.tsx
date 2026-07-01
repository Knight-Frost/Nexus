import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import type { ApiError, Listing, Property, PropertyType } from '@/lib/types';
import { formatCents, formatDateTime, humanize, storageUrl } from '@/lib/format';
import { paginate, pluralize, rangeLabel } from '@/lib/paginate';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { RecordList, RecordCard } from '@/components/ui/RecordCard';
import { DestructiveConfirmDialog } from '@/components/ui/DestructiveConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { PropertyFormDrawer } from './PropertyFormDrawer';
import { PROPERTY_TYPES } from './property-constants';
import {
  CommandBar,
  SearchInput,
  SortSelect,
  Pagination,
  ActionMenu,
  Thumbnail,
  type SelectOption,
} from '@/components/landlord/primitives';
import {
  IconBuilding,
  IconHome,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconUsers,
} from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import {
  StatusCard,
  SemanticBadge,
  DashboardSection,
  DataCardGrid,
  getOccupancyVariant,
} from '@/components/cards';

/* ──────────────────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
────────────────────────────────────────────────────────────────────────── */

const PER_PAGE = 8;

type OccupancyFilter = 'all' | 'has_vacancy' | 'fully_occupied';
type SortKey = 'newest' | 'name_asc' | 'most_units' | 'highest_occupancy';
type TypeFilter = 'all' | PropertyType;

const SORT_OPTIONS: SelectOption<SortKey>[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'name_asc', label: 'Name A to Z' },
  { value: 'most_units', label: 'Most units' },
  { value: 'highest_occupancy', label: 'Highest occupancy' },
];

const TYPE_OPTIONS: SelectOption<TypeFilter>[] = [
  { value: 'all', label: 'All types' },
  ...PROPERTY_TYPES.map((t) => ({ value: t as TypeFilter, label: humanize(t) })),
];

const OCCUPANCY_OPTIONS: SelectOption<OccupancyFilter>[] = [
  { value: 'all', label: 'All occupancy' },
  { value: 'has_vacancy', label: 'Has vacancy' },
  { value: 'fully_occupied', label: 'Fully occupied' },
];

/** Relative-ish time, falls back to absolute datetime. */
function whenLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(iso);
}

/* ──────────────────────────────────────────────────────────────────────────
   PHOTO MAP — property_id → first listing image URL
────────────────────────────────────────────────────────────────────────── */

function buildPhotoMap(listings: Listing[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const l of listings) {
    if (!l.primary_photo?.path) continue;
    const propId = l.unit?.property_id;
    if (propId === undefined || map.has(propId)) continue;
    const url = storageUrl(l.primary_photo.path);
    if (url) map.set(propId, url);
  }
  return map;
}

/* ──────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────────────────────────────────────── */

export function Properties() {
  const navigate = useNavigate();
  const { toast } = useToast();

  /* ── Data fetching ── */
  const { data, loading, error, reload } = useApi(() => landlordApi.properties(), []);
  const listingsApi = useApi(() => landlordApi.listings(), []);

  /* ── Create / edit drawer state ── */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);

  const [toDelete, setToDelete] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Controls state ── */
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [occupancyFilter, setOccupancyFilter] = useState<OccupancyFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  /* ── Derived data ── */
  const properties = useMemo(() => data ?? [], [data]);

  const photoMap = useMemo(
    () => buildPhotoMap(listingsApi.data ?? []),
    [listingsApi.data],
  );

  /* ── KPI aggregates from real per-property data ── */
  const kpi = useMemo(() => {
    let totalUnits = 0;
    let occupiedUnits = 0;
    let vacantUnits = 0;
    for (const p of properties) {
      totalUnits += p.units_count ?? 0;
      occupiedUnits += p.occupied_units ?? 0;
      vacantUnits += p.vacant_units ?? 0;
    }
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    return { totalUnits, occupiedUnits, vacantUnits, occupancyRate };
  }, [properties]);

  /* ── Filtered + sorted list ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let result = properties.filter((p) => {
      if (q) {
        const hay = [p.name, p.city, p.state, p.street_address].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (typeFilter !== 'all' && p.property_type !== typeFilter) return false;
      if (occupancyFilter === 'has_vacancy') {
        const vacant = p.vacant_units ?? 0;
        if (vacant === 0) return false;
      }
      if (occupancyFilter === 'fully_occupied') {
        const totalU = p.units_count ?? 0;
        const occupiedU = p.occupied_units ?? 0;
        if (totalU === 0 || occupiedU < totalU) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'most_units':
          return (b.units_count ?? 0) - (a.units_count ?? 0);
        case 'highest_occupancy':
          return (b.occupancy_rate ?? 0) - (a.occupancy_rate ?? 0);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [properties, search, typeFilter, occupancyFilter, sort]);

  const slice = paginate(filtered, page, PER_PAGE);

  function resetPage() {
    setPage(1);
  }

  /* ──────────────────────────────────────────────────────────────────────────
     HANDLERS (preserved exactly)
  ────────────────────────────────────────────────────────────────────────── */

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: Property) {
    setEditing(p);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await landlordApi.deleteProperty(toDelete.id);
      toast('Property deleted', 'success');
      setToDelete(null);
      reload();
    } catch (err) {
      toast((err as ApiError).message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  const hasAny = properties.length > 0;

  /* ──────────────────────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────────────────────── */

  return (
    <div className="animate-rise space-y-10">
      {/* Page header */}
      <PageHeader
        eyebrow="Portfolio"
        title="Properties"
        description="Manage the buildings and homes in your rental portfolio."
        action={
          <Button leftIcon={<IconPlus size={16} />} onClick={openCreate}>
            Add property
          </Button>
        }
      />

      {/* KPI row — always shown (loading-aware) */}
      <DashboardSection eyebrow="PORTFOLIO SUMMARY">
        <DataCardGrid cols={4}>
          <StatusCard
            label="Total properties"
            value={properties.length}
            sub="Across your portfolio"
            icon={<IconBuilding size={18} />}
            role="neutral"
            loading={loading}
          />
          <StatusCard
            label="Total units"
            value={kpi.totalUnits}
            sub={pluralize(kpi.totalUnits, 'unit')}
            icon={<IconHome size={18} />}
            role="neutral"
            loading={loading}
          />
          <StatusCard
            label="Occupied units"
            value={kpi.occupiedUnits}
            sub="Currently tenanted"
            role="success"
            icon={<IconUsers size={18} />}
            loading={loading}
          />
          <StatusCard
            label="Vacant units"
            value={kpi.vacantUnits}
            sub={kpi.totalUnits > 0 ? `${kpi.occupancyRate}% occupancy rate` : 'No units yet'}
            role={getOccupancyVariant(kpi.occupancyRate)}
            icon={<IconHome size={18} />}
            loading={loading}
          />
        </DataCardGrid>
      </DashboardSection>

      {/* Main content */}
      {loading ? (
        <LoadingState label="Loading properties…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !hasAny ? (
        <EmptyState
          icon={<IconBuilding />}
          title="No properties yet"
          description="Add your first property to start managing units, listings, tenants, rent, and maintenance."
          action={
            <Button leftIcon={<IconPlus size={16} />} onClick={openCreate}>
              Add property
            </Button>
          }
        />
      ) : (
        <DashboardSection eyebrow="YOUR PROPERTIES">
          {/* Command bar */}
          <CommandBar>
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); resetPage(); }}
              placeholder="Search by name, city, or address…"
              label="Search properties"
            />
            <SortSelect
              value={typeFilter}
              onChange={(v) => { setTypeFilter(v); resetPage(); }}
              options={TYPE_OPTIONS}
              label="Filter by type"
              prefix=""
            />
            <SortSelect
              value={occupancyFilter}
              onChange={(v) => { setOccupancyFilter(v); resetPage(); }}
              options={OCCUPANCY_OPTIONS}
              label="Filter by occupancy"
              prefix=""
            />
            <SortSelect
              value={sort}
              onChange={(v) => { setSort(v); resetPage(); }}
              options={SORT_OPTIONS}
              label="Sort"
              prefix="Sort: "
            />
          </CommandBar>

          {/* No-match state */}
          {slice.total === 0 ? (
            <EmptyState
              icon={<IconBuilding />}
              title="No properties match"
              description="Try a different search term or adjust the filters."
            />
          ) : (
            <div className="space-y-5">
              {/* Record list — one standalone card per property. No table shell,
                  no horizontal scroll: identity + units summary + occupancy +
                  collected + status + actions all stay visible (stacking on
                  mobile, inline columns on desktop). */}
              <RecordList>
                {slice.items.map((p) => {
                  const photoUrl = photoMap.get(p.id);
                  const totalU = p.units_count ?? 0;
                  const occupiedU = p.occupied_units ?? 0;
                  const vacantU = p.vacant_units ?? 0;
                  const occRate = p.occupancy_rate ?? 0;
                  const collectedCents = p.collected_this_month_cents ?? 0;
                  const occRole = getOccupancyVariant(occRate);
                  const detailHref = `/app/properties/${p.id}`;

                  const occText =
                    occRole === 'success'
                      ? 'text-success-600'
                      : occRole === 'warning'
                      ? 'text-warning-600'
                      : 'text-danger-600';
                  const occBar =
                    occRole === 'success'
                      ? 'bg-success-500'
                      : occRole === 'warning'
                      ? 'bg-warning-500'
                      : 'bg-danger-500';

                  const menuItems = [
                    {
                      label: 'Manage units',
                      icon: <IconUsers size={15} />,
                      onClick: () => navigate(detailHref),
                    },
                    {
                      label: 'Edit property',
                      icon: <IconEdit size={15} />,
                      onClick: () => openEdit(p),
                    },
                    {
                      label: 'Delete',
                      icon: <IconTrash size={15} />,
                      danger: true,
                      onClick: () => setToDelete(p),
                    },
                  ];

                  return (
                    <RecordCard
                      key={p.id}
                      onClick={() => navigate(detailHref)}
                      leading={
                        <Thumbnail src={photoUrl} alt={p.name} seed={p.name} size={64} />
                      }
                      title={p.name}
                      titleMeta={
                        <span className="flex flex-wrap items-center gap-1.5">
                          <SemanticBadge role="neutral" status={p.property_type}>
                            {humanize(p.property_type)}
                          </SemanticBadge>
                          {!p.is_active && (
                            <SemanticBadge role="neutral">Inactive</SemanticBadge>
                          )}
                        </span>
                      }
                      subtitle={
                        <span className="text-ink-500">
                          {p.city}, {p.state}
                        </span>
                      }
                      related={
                        <div>
                          <p className="font-display text-base font-semibold tabular-nums text-ink-900">
                            {totalU} {totalU === 1 ? 'unit' : 'units'}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            <span className="font-medium text-success-600">
                              {occupiedU} occupied
                            </span>
                            {' · '}
                            <span className="font-medium text-warning-600">
                              {vacantU} vacant
                            </span>
                          </p>
                        </div>
                      }
                      indicator={
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[11px] text-ink-400">Occupancy</span>
                              <span
                                className={`font-display text-sm font-semibold tabular-nums ${occText}`}
                              >
                                {occRate}%
                              </span>
                            </div>
                            {totalU > 0 && (
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                                <div
                                  className={`h-full rounded-full ${occBar}`}
                                  style={{ width: `${occRate}%` }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[11px] text-ink-400">Collected</span>
                            <span
                              className="font-display text-sm font-semibold"
                              style={{ color: 'var(--color-money)' }}
                            >
                              {collectedCents > 0 ? formatCents(collectedCents) : '—'}
                            </span>
                          </div>
                        </div>
                      }
                      status={
                        <SemanticBadge role={occRole}>
                          {totalU > 0 ? `${occRate}% occupied` : 'No units'}
                        </SemanticBadge>
                      }
                      timestamp={<>Updated {whenLabel(p.updated_at)}</>}
                      primaryAction={
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<IconEye size={14} />}
                          onClick={() => navigate(detailHref)}
                        >
                          View details
                        </Button>
                      }
                      menu={<ActionMenu items={menuItems} />}
                    />
                  );
                })}
              </RecordList>

              {/* Footer: range label + pagination — below the cards. */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-ink-500">
                  {rangeLabel(slice, 'property', 'properties')}
                </p>
                <Pagination slice={slice} onPage={setPage} />
              </div>
            </div>
          )}
        </DashboardSection>
      )}

      {/* ── Add / Edit drawer — right-side multi-step creation panel ────────── */}
      <PropertyFormDrawer
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <DestructiveConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete property"
        description={toDelete ? `Delete "${toDelete.name}"? This cannot be undone.` : undefined}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
