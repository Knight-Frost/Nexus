import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import { fieldErrors } from '@/lib/api';
import type { ApiError, Listing, Unit, UnitAvailabilityStatus } from '@/lib/types';
import { formatCedisDecimal, humanize, listingStatusTone } from '@/lib/format';
import type { Tone } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Field';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconChevronRight, IconEdit, IconHome, IconPlus } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';

const AVAILABILITY_STATUSES: UnitAvailabilityStatus[] = [
  'available',
  'occupied',
  'pending',
  'maintenance',
  'unlisted',
];

function availabilityTone(status: UnitAvailabilityStatus): Tone {
  switch (status) {
    case 'available':   return 'success';
    case 'occupied':    return 'warning';
    case 'pending':     return 'info';
    case 'maintenance': return 'danger';
    default:            return 'neutral';
  }
}

interface UnitForm {
  unit_number: string;
  internal_name: string;
  bedrooms: string;
  bathrooms: string;
  square_feet: string;
  rent_amount: string;
  security_deposit: string;
  availability_status: UnitAvailabilityStatus;
}

function emptyUnitForm(): UnitForm {
  return {
    unit_number: '',
    internal_name: '',
    bedrooms: '1',
    bathrooms: '1',
    square_feet: '',
    rent_amount: '',
    security_deposit: '',
    availability_status: 'available',
  };
}

export function PropertyDetail() {
  const { id } = useParams();
  const propertyId = Number(id);
  const { toast } = useToast();

  const { data, loading, error, reload } = useApi(
    () => landlordApi.property(propertyId),
    [propertyId],
  );

  // Fetch all listings and filter by units belonging to this property.
  const listingsApi = useApi(() => landlordApi.listings(), []);

  // Fallback unit fetch when the property payload does not embed units.
  const hasEmbeddedUnits = data?.units !== undefined;
  const unitsApi = useApi(
    () =>
      hasEmbeddedUnits
        ? Promise.resolve<Unit[]>([])
        : landlordApi.units().then((all) => all.filter((u) => u.property_id === propertyId)),
    [propertyId, hasEmbeddedUnits],
  );

  const units: Unit[] = hasEmbeddedUnits ? data?.units ?? [] : unitsApi.data ?? [];
  const unitsLoading = hasEmbeddedUnits ? false : unitsApi.loading;

  // Listings associated with units of this property
  const unitIds = new Set(units.map((u) => u.id));
  const propertyListings: Listing[] = (listingsApi.data ?? []).filter(
    (l) => l.unit_id !== undefined && unitIds.has(l.unit_id),
  );

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<UnitForm>(emptyUnitForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm(emptyUnitForm());
    setErrors({});
    setFormOpen(true);
  }

  function update<K extends keyof UnitForm>(key: K, value: UnitForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reloadAll() {
    reload();
    if (!hasEmbeddedUnits) unitsApi.reload();
    listingsApi.reload();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload: Partial<Unit> = {
      unit_number: form.unit_number,
      internal_name: form.internal_name || null,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      square_feet: form.square_feet ? Number(form.square_feet) : null,
      rent_amount: form.rent_amount,
      security_deposit: form.security_deposit || null,
      availability_status: form.availability_status,
    };
    try {
      await landlordApi.createUnit(propertyId, payload);
      toast('Unit created', 'success');
      setFormOpen(false);
      reloadAll();
    } catch (err) {
      const e2 = err as ApiError;
      const fe = fieldErrors(e2);
      setErrors(fe);
      if (Object.keys(fe).length === 0) toast(e2.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-rise space-y-6">
        <BackLink />
        <LoadingState label="Loading property..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="animate-rise space-y-6">
        <BackLink />
        <ErrorState message={error?.message ?? 'Property not found.'} onRetry={reload} />
      </div>
    );
  }

  const property = data;
  const fullAddress = [
    property.street_address,
    property.street_address_2,
    `${property.city}, ${property.state}`,
    property.country !== 'Ghana' ? property.country : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="animate-rise space-y-6">
      <BackLink />

      <PageHeader
        eyebrow="Property"
        title={property.name}
        description={fullAddress}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<IconEdit size={15} />}>
              Edit
            </Button>
            <Button size="sm" leftIcon={<IconPlus size={15} />} onClick={openCreate}>
              Add Unit
            </Button>
          </div>
        }
      />

      {/* Property info */}
      <Card>
        <CardBody>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-500">Type</dt>
              <dd className="mt-1">
                <Badge tone="brand">{humanize(property.property_type)}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Status</dt>
              <dd className="mt-1">
                <Badge tone={property.is_active ? 'success' : 'neutral'}>
                  {property.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </dd>
            </div>
            {property.year_built != null && (
              <div>
                <dt className="text-xs text-ink-500">Year Built</dt>
                <dd className="mt-1 text-sm font-medium text-ink-900">{property.year_built}</dd>
              </div>
            )}
            {property.lot_size && (
              <div>
                <dt className="text-xs text-ink-500">Lot Size</dt>
                <dd className="mt-1 text-sm font-medium text-ink-900">{property.lot_size}</dd>
              </div>
            )}
          </dl>
          {property.description && (
            <p className="mt-4 border-t border-ink-100 pt-4 text-sm text-ink-600">
              {property.description}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Units */}
      <Card>
        <CardHeader
          title="Units"
          description="Rentable spaces within this property."
          action={
            <Button size="sm" leftIcon={<IconPlus size={14} />} onClick={openCreate}>
              Add Unit
            </Button>
          }
        />
        <CardBody className="pt-2">
          {unitsLoading ? (
            <LoadingState />
          ) : !units.length ? (
            <EmptyState
              icon={<IconHome />}
              title="No units yet"
              description="Add a unit to start listing it for rent."
              action={
                <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={openCreate}>
                  Add Unit
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <TH>Unit #</TH>
                <TH>Beds</TH>
                <TH>Baths</TH>
                <TH>Rent / mo</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {units.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium text-ink-900">
                      {u.unit_number}
                      {u.internal_name && (
                        <span className="ml-1 text-xs text-ink-400">({u.internal_name})</span>
                      )}
                    </TD>
                    <TD>{u.bedrooms}</TD>
                    <TD>{u.bathrooms}</TD>
                    <TD>
                      <span style={{ color: 'var(--color-money)' }}>
                        {formatCedisDecimal(u.rent_amount)}
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={availabilityTone(u.availability_status)}>
                        {humanize(u.availability_status)}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Active Listings */}
      {(listingsApi.data ?? []).length > 0 && (
        <Card>
          <CardHeader
            title="Listings"
            description="Published listings for this property's units."
            action={
              <Link to="/app/listings">
                <Button variant="ghost" size="sm">
                  Manage listings
                </Button>
              </Link>
            }
          />
          <CardBody className="pt-2">
            {listingsApi.loading ? (
              <LoadingState />
            ) : propertyListings.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-500">
                No listings for this property yet.
              </p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {propertyListings.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium text-ink-900">{l.title}</p>
                      <p className="text-xs text-ink-500">
                        Unit {l.unit?.unit_number ?? l.unit_id} ·{' '}
                        {l.unit?.rent_amount
                          ? formatCedisDecimal(l.unit.rent_amount) + '/mo'
                          : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-ink-500">{l.view_count} views</span>
                      <Badge tone={listingStatusTone(l.status)}>{humanize(l.status)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {/* Add Unit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add unit"
        description="Define the unit details and monthly rent."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="unit-form" loading={saving}>
              Create unit
            </Button>
          </>
        }
      >
        <form id="unit-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unit number" error={errors.unit_number} required>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  invalid={invalid}
                  placeholder="e.g. A3 or Villa-1"
                  value={form.unit_number}
                  onChange={(e) => update('unit_number', e.target.value)}
                />
              )}
            </Field>
            <Field label="Internal name" error={errors.internal_name}>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  invalid={invalid}
                  placeholder="e.g. Block A — Floor 3"
                  value={form.internal_name}
                  onChange={(e) => update('internal_name', e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bedrooms" error={errors.bedrooms} required>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  type="number"
                  step="1"
                  min="0"
                  invalid={invalid}
                  value={form.bedrooms}
                  onChange={(e) => update('bedrooms', e.target.value)}
                />
              )}
            </Field>
            <Field label="Bathrooms" error={errors.bathrooms} required>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  type="number"
                  step="0.5"
                  min="0"
                  invalid={invalid}
                  value={form.bathrooms}
                  onChange={(e) => update('bathrooms', e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label="Size (sq ft)" error={errors.square_feet}>
            {(fid, invalid) => (
              <Input
                id={fid}
                type="number"
                min="0"
                invalid={invalid}
                placeholder="Optional"
                value={form.square_feet}
                onChange={(e) => update('square_feet', e.target.value)}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Monthly rent (GH₵)" error={errors.rent_amount} required>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  type="number"
                  step="0.01"
                  min="0"
                  invalid={invalid}
                  placeholder="e.g. 5800.00"
                  value={form.rent_amount}
                  onChange={(e) => update('rent_amount', e.target.value)}
                />
              )}
            </Field>
            <Field label="Security deposit (GH₵)" error={errors.security_deposit}>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  type="number"
                  step="0.01"
                  min="0"
                  invalid={invalid}
                  placeholder="Optional"
                  value={form.security_deposit}
                  onChange={(e) => update('security_deposit', e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label="Availability" error={errors.availability_status} required>
            {(fid, invalid) => (
              <Select
                id={fid}
                invalid={invalid}
                value={form.availability_status}
                onChange={(e) =>
                  update('availability_status', e.target.value as UnitAvailabilityStatus)
                }
              >
                {AVAILABILITY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </form>
      </Modal>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/app/properties"
      className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 transition hover:text-ink-800"
    >
      <IconChevronRight className="h-4 w-4 rotate-180" />
      Back to properties
    </Link>
  );
}
