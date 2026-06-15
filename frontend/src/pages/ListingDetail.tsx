import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/context/auth';
import { useApi } from '@/hooks/useApi';
import { publicApi, tenantApi } from '@/lib/endpoints';
import { formatDate, formatDollars, humanize, listingStatusTone } from '@/lib/format';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import {
  IconBath,
  IconBed,
  IconChevronRight,
  IconHeart,
  IconHome,
  IconMapPin,
} from '@/components/ui/icons';

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-200/80 bg-ink-50/40 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const listingId = Number(id);
  const { data: listing, loading, error, reload } = useApi(
    () => publicApi.show(listingId),
    [listingId],
  );

  const isTenant = user?.role === 'tenant';

  async function handleSave() {
    if (!listing) return;
    setSaving(true);
    try {
      await tenantApi.saveListing(listing.id);
      setSaved(true);
      toast('Listing saved to favorites', 'success');
    } catch {
      toast('Could not save listing', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading listing…" />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!listing) {
    return (
      <ErrorState title="Listing not found" message="This listing may no longer be available." />
    );
  }

  const unit = listing.unit;
  const property = unit?.property;
  const location = property
    ? [property.city, property.state].filter(Boolean).join(', ')
    : null;
  const amenities = unit?.amenities ?? [];

  return (
    <div>
      <Link
        to="/app/browse"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-ink-500 transition hover:text-brand-700"
      >
        <IconChevronRight className="h-4 w-4 rotate-180" />
        Back to browse
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink-950">{listing.title}</h1>
            <Badge tone={listingStatusTone(listing.status)}>{humanize(listing.status)}</Badge>
            {listing.featured && <Badge tone="brand">Featured</Badge>}
          </div>
          {location && (
            <p className="mt-1.5 flex items-center gap-1 text-sm text-ink-500">
              <IconMapPin className="h-4 w-4" />
              {location}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody className="space-y-4">
              <h2 className="text-base font-semibold text-ink-900">About this rental</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
                {listing.description}
              </p>
            </CardBody>
          </Card>

          {unit && (
            <Card>
              <CardBody className="space-y-4">
                <h2 className="text-base font-semibold text-ink-900">Unit details</h2>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Fact label="Bedrooms" value={`${unit.bedrooms} bd`} />
                  <Fact label="Bathrooms" value={`${unit.bathrooms} ba`} />
                  <Fact
                    label="Square feet"
                    value={unit.square_feet ? unit.square_feet.toLocaleString() : '—'}
                  />
                  <Fact label="Monthly rent" value={formatDollars(unit.rent_amount)} />
                  <Fact label="Security deposit" value={formatDollars(unit.security_deposit)} />
                  <Fact
                    label="Available from"
                    value={unit.available_from ? formatDate(unit.available_from) : '—'}
                  />
                </dl>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody className="space-y-4">
              <h2 className="text-base font-semibold text-ink-900">Lease &amp; policies</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Fact
                  label="Lease duration"
                  value={
                    listing.lease_duration_months
                      ? `${listing.lease_duration_months} months`
                      : '—'
                  }
                />
                <Fact
                  label="Move-in date"
                  value={listing.move_in_date ? formatDate(listing.move_in_date) : '—'}
                />
                <Fact
                  label="Pets"
                  value={listing.pets_allowed ? 'Allowed' : 'Not allowed'}
                />
                <Fact label="Pet policy" value={listing.pet_policy ?? '—'} />
              </dl>
            </CardBody>
          </Card>

          {amenities.length > 0 && (
            <Card>
              <CardBody className="space-y-3">
                <h2 className="text-base font-semibold text-ink-900">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((amenity) => (
                    <Badge key={amenity} tone="neutral">
                      {humanize(amenity)}
                    </Badge>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-6">
            <CardBody className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-ink-950">
                  {formatDollars(unit?.rent_amount)}
                  <span className="text-base font-normal text-ink-500">/mo</span>
                </p>
                {unit?.security_deposit && (
                  <p className="mt-1 text-sm text-ink-500">
                    {formatDollars(unit.security_deposit)} deposit
                  </p>
                )}
              </div>

              {unit && (
                <div className="flex items-center gap-4 border-t border-ink-100 pt-4 text-sm text-ink-600">
                  <span className="flex items-center gap-1.5">
                    <IconBed className="h-4 w-4 text-ink-400" />
                    {unit.bedrooms} bd
                  </span>
                  <span className="flex items-center gap-1.5">
                    <IconBath className="h-4 w-4 text-ink-400" />
                    {unit.bathrooms} ba
                  </span>
                  {unit.square_feet && (
                    <span className="flex items-center gap-1.5">
                      <IconHome className="h-4 w-4 text-ink-400" />
                      {unit.square_feet.toLocaleString()} sqft
                    </span>
                  )}
                </div>
              )}

              {isTenant && (
                <Button
                  className="w-full"
                  variant={saved ? 'secondary' : 'primary'}
                  loading={saving}
                  disabled={saved}
                  onClick={handleSave}
                  leftIcon={<IconHeart className="h-4 w-4" />}
                >
                  {saved ? 'Saved to favorites' : 'Save to favorites'}
                </Button>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
