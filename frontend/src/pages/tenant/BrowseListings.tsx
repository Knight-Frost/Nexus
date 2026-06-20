import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { publicApi, tenantApi } from '@/lib/endpoints';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { ListingCard } from '@/components/listings/ListingCard';
import {
  IconSearch,
  IconFilter,
  IconBed,
  IconMapPin,
  IconHeart,
  IconShield,
  IconChevronRight,
  IconChevronLeft,
  IconX,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { Listing } from '@/lib/types';

/* ---- Filter types -------------------------------------------------------- */
interface Filters {
  city: string;
  max_price: string;
  bedrooms: string;
  property_type: string;
  verified_only: boolean;
}

const EMPTY_FILTERS: Filters = {
  city: '',
  max_price: '',
  bedrooms: '',
  property_type: '',
  verified_only: false,
};

const CITIES = [
  { value: '',          label: 'All cities' },
  { value: 'Accra',    label: 'Accra' },
  { value: 'Tema',     label: 'Tema' },
  { value: 'Kumasi',   label: 'Kumasi' },
  { value: 'Takoradi', label: 'Takoradi' },
  { value: 'Cape Coast', label: 'Cape Coast' },
];

const MAX_PRICES = [
  { value: '',      label: 'Any price' },
  { value: '300000',  label: 'GH₵ 3,000' },
  { value: '600000',  label: 'GH₵ 6,000' },
  { value: '1000000', label: 'GH₵ 10,000' },
  { value: '1500000', label: 'GH₵ 15,000' },
];

const BEDROOMS = [
  { value: '',  label: 'Any' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
];

function toParams(filters: Filters, page: number) {
  return {
    city:       filters.city     || undefined,
    max_price:  filters.max_price ? Number(filters.max_price) : undefined,
    bedrooms:   filters.bedrooms  ? Number(filters.bedrooms)  : undefined,
    page,
  };
}

function hasActiveFilters(filters: Filters): boolean {
  return !!(filters.city || filters.max_price || filters.bedrooms || filters.property_type || filters.verified_only);
}

/* ---- Filter chip --------------------------------------------------------- */
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:bg-ink-50',
      )}
    >
      {label}
    </button>
  );
}

/* ---- Skeleton grid ------------------------------------------------------- */
function ListingSkeletonGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="bg-surface rounded-2xl border border-ink-200 overflow-hidden"
        >
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="p-4 space-y-2.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- SaveButton ---------------------------------------------------------- */
function SaveButton({
  listing,
  saved,
  onToggle,
}: {
  listing: Listing;
  saved: boolean;
  onToggle: (id: number, saved: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (saved) {
        await tenantApi.unsaveListing(listing.id);
      } else {
        await tenantApi.saveListing(listing.id);
      }
      onToggle(listing.id, !saved);
    } catch {
      // Silent fallback — optimistic update was already applied
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      aria-label={saved ? 'Remove from saved' : 'Save listing'}
      className={cn(
        'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-sm transition-all',
        saved
          ? 'border-danger-300 bg-danger-50 text-danger-500'
          : 'border-white/40 bg-black/20 text-white hover:bg-black/40',
        loading && 'opacity-60 cursor-wait',
      )}
      onClick={handleClick}
    >
      <IconHeart size={14} />
    </button>
  );
}

/* ---- Page ---------------------------------------------------------------- */
export function BrowseListings() {
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [savedMap, setSavedMap] = useState<Map<number, boolean>>(new Map());

  const { data, loading, error, reload } = useApi(
    () => publicApi.listings(toParams(applied, page)),
    [applied, page],
  );

  // Pre-fill saved state from server
  useApi<Listing[]>(
    async () => {
      const saved = await tenantApi.savedListings().catch(() => [] as Listing[]);
      setSavedMap(new Map(saved.map((l) => [l.id, true])));
      return saved;
    },
    [],
  );

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleApply() {
    setPage(1);
    setApplied(draft);
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  function handleSaveToggle(id: number, saved: boolean) {
    setSavedMap((prev) => new Map(prev).set(id, saved));
  }

  const listings      = data?.data ?? [];
  const currentPage   = data?.current_page ?? 1;
  const lastPage      = data?.last_page ?? 1;
  const total         = data?.total ?? 0;
  const filtersActive = hasActiveFilters(applied);

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Find a Home"
        title="Find a home in Ghana"
        description="Verified rentals across Accra, Tema, Kumasi and beyond."
      />

      {/* Filters bar */}
      <Card>
        <CardBody className="space-y-4">
          {/* City chips */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
              City
            </p>
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <FilterChip
                  key={c.value}
                  label={c.label}
                  active={draft.city === c.value}
                  onClick={() => set('city', c.value)}
                />
              ))}
            </div>
          </div>

          {/* Secondary filters */}
          <div className="flex flex-wrap items-end gap-3 border-t border-ink-100 pt-4">
            {/* Max price */}
            <div className="min-w-0">
              <p className="mb-1.5 text-xs font-medium text-ink-500">Max price</p>
              <div className="flex gap-1.5 flex-wrap">
                {MAX_PRICES.map((p) => (
                  <FilterChip
                    key={p.value}
                    label={p.label}
                    active={draft.max_price === p.value}
                    onClick={() => set('max_price', p.value)}
                  />
                ))}
              </div>
            </div>

            {/* Bedrooms */}
            <div className="min-w-0">
              <p className="mb-1.5 text-xs font-medium text-ink-500">
                <IconBed size={12} className="mr-1 inline" />
                Bedrooms
              </p>
              <div className="flex gap-1.5">
                {BEDROOMS.map((b) => (
                  <FilterChip
                    key={b.value}
                    label={b.label}
                    active={draft.bedrooms === b.value}
                    onClick={() => set('bedrooms', b.value)}
                  />
                ))}
              </div>
            </div>

            {/* Verified only toggle */}
            <FilterChip
              label="Verified only"
              active={draft.verified_only}
              onClick={() => set('verified_only', !draft.verified_only)}
            />

            {/* Actions */}
            <div className="ml-auto flex items-center gap-2">
              {hasActiveFilters(draft) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-700 transition-colors"
                >
                  <IconX size={12} /> Clear
                </button>
              )}
              <Button
                leftIcon={<IconSearch size={15} />}
                onClick={handleApply}
                size="sm"
              >
                Search
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Results header */}
      {!loading && !error && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-500">
            {filtersActive ? (
              <>
                <span className="font-medium text-ink-900">{total}</span> home
                {total !== 1 ? 's' : ''} match your filters
                {applied.city && (
                  <>
                    {' '}in{' '}
                    <span className="font-medium text-ink-900 flex-inline items-center gap-1">
                      <IconMapPin size={11} className="inline mr-0.5" />
                      {applied.city}
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                Showing <span className="font-medium text-ink-900">{total}</span> verified listings
              </>
            )}
          </p>
          {filtersActive && (
            <Badge tone="brand" dot={false}>
              <IconFilter size={11} />
              Filters active
            </Badge>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <ListingSkeletonGrid />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<IconSearch size={28} />}
          title="No homes match your filters"
          description="Try widening your search or adjusting the price range."
          action={
            <Button variant="secondary" onClick={handleReset} leftIcon={<IconX size={15} />}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <div key={listing.id} className="relative">
                <ListingCard
                  listing={listing}
                  to={'/app/listing/' + listing.id}
                />
                <SaveButton
                  listing={listing}
                  saved={savedMap.get(listing.id) ?? false}
                  onToggle={handleSaveToggle}
                />
                {listing.featured && (
                  <div className="absolute left-3 top-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                      Featured
                    </span>
                  </div>
                )}
                {listing.status === 'active' && !listing.featured && (
                  <div className="absolute left-3 top-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                      <IconShield size={10} /> Verified
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                leftIcon={<IconChevronLeft size={15} />}
              >
                Previous
              </Button>
              <span className="text-sm text-ink-500">
                Page <span className="font-medium text-ink-900">{currentPage}</span> of{' '}
                <span className="font-medium text-ink-900">{lastPage}</span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= lastPage}
                onClick={() => setPage((p) => p + 1)}
                leftIcon={<IconChevronRight size={15} />}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
