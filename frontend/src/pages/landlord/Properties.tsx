import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import type { ApiError, Listing, Property, PropertyType } from '@/lib/types';
import { formatCents, formatDateTime, humanize, storageUrl } from '@/lib/format';
import { paginate, pluralize, rangeLabel } from '@/lib/paginate';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
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
  { value: 'name_asc', label: 'Name A–Z' },
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
            <Card>
              <CardBody className="p-0">
                <ul className="divide-y divide-ink-200">
                  {slice.items.map((p) => {
                    const photoUrl = photoMap.get(p.id);
                    const totalU = p.units_count ?? 0;
                    const occupiedU = p.occupied_units ?? 0;
                    const vacantU = p.vacant_units ?? 0;
                    const occRate = p.occupancy_rate ?? 0;
                    const collectedCents = p.collected_this_month_cents ?? 0;
                    const occRole = getOccupancyVariant(occRate);

                    const menuItems = [
                      {
                        label: 'Manage units',
                        icon: <IconUsers size={15} />,
                        onClick: () => navigate(`/app/properties/${p.id}`),
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
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-50/60"
                      >
                        {/* Thumbnail */}
                        <Thumbnail
                          src={photoUrl}
                          alt={p.name}
                          seed={p.name}
                          size={64}
                        />

                        {/* Identity */}
                        <div className="min-w-[14rem] flex-1">
                          <p className="font-display text-base font-semibold leading-snug text-ink-900">
                            {p.name}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            {p.city}, {p.state}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <SemanticBadge role="neutral" status={p.property_type}>
                              {humanize(p.property_type)}
                            </SemanticBadge>
                            {!p.is_active && (
                              <SemanticBadge role="neutral">Inactive</SemanticBadge>
                            )}
                          </div>
                        </div>

                        {/* Units */}
                        <div className="hidden min-w-[4rem] text-center sm:block">
                          <p className="font-display text-lg font-semibold tabular-nums text-ink-900">
                            {totalU}
                          </p>
                          <p className="text-[11px] text-ink-400">
                            {totalU === 1 ? 'unit' : 'units'}
                          </p>
                        </div>

                        {/* Occupied / Vacant */}
                        <div className="hidden gap-4 sm:flex">
                          <div className="text-center">
                            <p className="font-display text-lg font-semibold tabular-nums text-success-600">
                              {occupiedU}
                            </p>
                            <p className="text-[11px] text-ink-400">Occupied</p>
                          </div>
                          <div className="text-center">
                            <p className="font-display text-lg font-semibold tabular-nums text-warning-600">
                              {vacantU}
                            </p>
                            <p className="text-[11px] text-ink-400">Vacant</p>
                          </div>
                        </div>

                        {/* Occupancy rate */}
                        <div className="hidden min-w-[5rem] sm:block">
                          <p className={`font-display text-lg font-semibold tabular-nums ${
                            occRole === 'success' ? 'text-success-600'
                            : occRole === 'warning' ? 'text-warning-600'
                            : 'text-danger-600'
                          }`}>
                            {occRate}%
                          </p>
                          <p className="text-[11px] text-ink-400">Occupancy</p>
                          {totalU > 0 && (
                            <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
                              <div
                                className={`h-full rounded-full ${
                                  occRole === 'success' ? 'bg-success-500'
                                  : occRole === 'warning' ? 'bg-warning-500'
                                  : 'bg-danger-500'
                                }`}
                                style={{ width: `${occRate}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Collected this month */}
                        <div className="hidden min-w-[7rem] sm:block">
                          <p
                            className="font-display text-sm font-semibold"
                            style={{ color: 'var(--color-money)' }}
                          >
                            {collectedCents > 0 ? formatCents(collectedCents) : '—'}
                          </p>
                          <p className="text-[11px] text-ink-400">
                            Collected this month
                          </p>
                        </div>

                        {/* Updated */}
                        <div className="hidden min-w-[5rem] text-right lg:block">
                          <p className="text-xs text-ink-500">Updated</p>
                          <p className="text-xs font-medium text-ink-700">
                            {whenLabel(p.updated_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<IconEye size={14} />}
                            onClick={() => navigate(`/app/properties/${p.id}`)}
                          >
                            View details
                          </Button>
                          <ActionMenu items={menuItems} />
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Footer: range label + pagination */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 px-5 py-3">
                  <p className="text-xs text-ink-500">
                    {rangeLabel(slice, 'property', 'properties')}
                  </p>
                  <Pagination slice={slice} onPage={setPage} />
                </div>
              </CardBody>
            </Card>
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

      {/* ── Delete confirmation (logic preserved exactly) ─────────────────── */}
      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Delete property"
        description={
          toDelete ? `Delete "${toDelete.name}"? This cannot be undone.` : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
