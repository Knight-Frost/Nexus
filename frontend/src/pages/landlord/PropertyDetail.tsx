import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import { fieldErrors } from '@/lib/api';
import type {
  ApiError,
  Listing,
  MediaAsset,
  Property,
  PropertyType,
  Unit,
  UnitAvailabilityStatus,
} from '@/lib/types';
import { formatCedisDecimal, humanize } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DetailDrawer } from '@/components/ui/Drawer';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/ResponsiveTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconChevronRight, IconEdit, IconHome, IconImage, IconPlus } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import {
  SemanticBadge,
  NexusCard,
  getListingModerationVariant,
} from '@/components/cards';
import { GalleryManager } from '@/components/media/GalleryManager';

const AVAILABILITY_STATUSES: UnitAvailabilityStatus[] = [
  'available',
  'occupied',
  'pending',
  'maintenance',
  'unlisted',
];

import type { SemanticRole } from '@/components/cards';

function availabilityRole(status: UnitAvailabilityStatus): SemanticRole {
  switch (status) {
    case 'available':   return 'success';
    case 'occupied':    return 'warning';
    case 'pending':     return 'info';
    case 'maintenance': return 'danger';
    default:            return 'neutral';
  }
}

const PROPERTY_TYPES: PropertyType[] = [
  'single_family',
  'multi_family',
  'apartment',
  'condo',
  'townhouse',
  'commercial',
  'other',
];

interface UnitForm {
  unit_number: string;
  internal_name: string;
  bedrooms: string;
  bathrooms: string;
  square_feet: string;
  rent_amount: string;
  security_deposit: string;
  availability_status: UnitAvailabilityStatus;
  available_from: string;
  amenities: string;
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
    available_from: '',
    amenities: '',
  };
}

function unitFormFrom(u: Unit): UnitForm {
  return {
    unit_number: u.unit_number,
    internal_name: u.internal_name ?? '',
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms,
    square_feet: u.square_feet != null ? String(u.square_feet) : '',
    rent_amount: u.rent_amount,
    security_deposit: u.security_deposit ?? '',
    availability_status: u.availability_status,
    available_from: u.available_from ?? '',
    amenities: (u.amenities ?? []).join(', '),
  };
}

interface PropertyForm {
  name: string;
  property_type: PropertyType;
  street_address: string;
  street_address_2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  year_built: string;
  description: string;
}

function propertyFormFrom(p: Property): PropertyForm {
  return {
    name: p.name,
    property_type: p.property_type,
    street_address: p.street_address,
    street_address_2: p.street_address_2 ?? '',
    city: p.city,
    state: p.state,
    zip_code: p.zip_code,
    country: p.country,
    year_built: p.year_built != null ? String(p.year_built) : '',
    description: p.description ?? '',
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

  // Gallery media for this property — returned by GET /landlord/properties/{id}
  // as `media_assets`, ordered by sort_order. Refetched after upload/delete/reorder.
  const mediaAssets: MediaAsset[] = data?.media_assets ?? [];

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
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [form, setForm] = useState<UnitForm>(emptyUnitForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Property edit modal
  const [propOpen, setPropOpen] = useState(false);
  const [propForm, setPropForm] = useState<PropertyForm | null>(null);
  const [propErrors, setPropErrors] = useState<Record<string, string>>({});
  const [propSaving, setPropSaving] = useState(false);

  // Unit gallery modal — GET /landlord/units/{id} returns `media_assets` (sort_order).
  const [galleryUnit, setGalleryUnit] = useState<Unit | null>(null);
  const [unitMedia, setUnitMedia] = useState<MediaAsset[]>([]);
  const [unitMediaLoading, setUnitMediaLoading] = useState(false);

  async function loadUnitMedia(unitId: number) {
    setUnitMediaLoading(true);
    try {
      const full = await landlordApi.unit(unitId);
      setUnitMedia((full.media_assets ?? []).slice().sort((a, b) => a.sort_order - b.sort_order));
    } catch (err) {
      toast((err as ApiError).message, 'error');
    } finally {
      setUnitMediaLoading(false);
    }
  }

  function openUnitGallery(u: Unit) {
    setGalleryUnit(u);
    setUnitMedia([]);
    void loadUnitMedia(u.id);
  }

  function openCreate() {
    setEditingUnit(null);
    setForm(emptyUnitForm());
    setErrors({});
    setFormOpen(true);
  }

  function openEditUnit(u: Unit) {
    setEditingUnit(u);
    setForm(unitFormFrom(u));
    setErrors({});
    setFormOpen(true);
  }

  function update<K extends keyof UnitForm>(key: K, value: UnitForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateProp<K extends keyof PropertyForm>(key: K, value: PropertyForm[K]) {
    setPropForm((prev) => (prev ? { ...prev, [key]: value } : prev));
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
    const amenities = form.amenities
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    const payload: Partial<Unit> = {
      unit_number: form.unit_number,
      internal_name: form.internal_name || null,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      square_feet: form.square_feet ? Number(form.square_feet) : null,
      rent_amount: form.rent_amount,
      security_deposit: form.security_deposit || null,
      availability_status: form.availability_status,
      available_from: form.available_from || null,
      amenities: amenities.length ? amenities : null,
    };
    try {
      if (editingUnit) {
        await landlordApi.updateUnit(editingUnit.id, payload);
        toast('Unit updated', 'success');
      } else {
        await landlordApi.createUnit(propertyId, payload);
        toast('Unit created', 'success');
      }
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

  async function handlePropertySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propForm) return;
    setPropSaving(true);
    setPropErrors({});
    const payload: Partial<Property> = {
      name: propForm.name,
      property_type: propForm.property_type,
      street_address: propForm.street_address,
      street_address_2: propForm.street_address_2 || null,
      city: propForm.city,
      state: propForm.state,
      zip_code: propForm.zip_code,
      country: propForm.country,
      year_built: propForm.year_built ? Number(propForm.year_built) : null,
      description: propForm.description || null,
    };
    try {
      await landlordApi.updateProperty(propertyId, payload);
      toast('Property updated', 'success');
      setPropOpen(false);
      reload();
    } catch (err) {
      const e2 = err as ApiError;
      const fe = fieldErrors(e2);
      setPropErrors(fe);
      if (Object.keys(fe).length === 0) toast(e2.message, 'error');
    } finally {
      setPropSaving(false);
    }
  }

  const unitColumns: ResponsiveColumn<Unit>[] = [
    {
      key: 'num',
      header: 'Unit #',
      primary: true,
      cell: (u) => (
        <>
          {u.unit_number}
          {u.internal_name && (
            <span className="ml-1 text-xs text-ink-400">({u.internal_name})</span>
          )}
        </>
      ),
    },
    { key: 'beds', header: 'Beds', hideBelow: 'lg', cell: (u) => u.bedrooms },
    { key: 'baths', header: 'Baths', hideBelow: 'lg', cell: (u) => u.bathrooms },
    {
      key: 'rent',
      header: 'Rent / mo',
      align: 'right',
      cell: (u) => (
        <span className="font-mono tabular-nums text-[var(--color-money)]">
          {formatCedisDecimal(u.rent_amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => (
        <SemanticBadge role={availabilityRole(u.availability_status)}>
          {humanize(u.availability_status)}
        </SemanticBadge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (u) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<IconImage size={14} />}
            onClick={() => openUnitGallery(u)}
            aria-label={`Manage photos for unit ${u.unit_number}`}
          >
            Photos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditUnit(u)}
            aria-label={`Edit unit ${u.unit_number}`}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

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
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<IconEdit size={15} />}
              onClick={() => {
                setPropForm(propertyFormFrom(property));
                setPropErrors({});
                setPropOpen(true);
              }}
            >
              Edit
            </Button>
            <Button size="sm" leftIcon={<IconPlus size={15} />} onClick={openCreate}>
              Add Unit
            </Button>
          </div>
        }
      />

      {/* Property info */}
      <NexusCard role="neutral" specular className="p-6">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-500">Type</dt>
            <dd className="mt-1">
              <SemanticBadge role="neutral">{humanize(property.property_type)}</SemanticBadge>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">Status</dt>
            <dd className="mt-1">
              <SemanticBadge role={property.is_active ? 'success' : 'neutral'}>
                {property.is_active ? 'Active' : 'Inactive'}
              </SemanticBadge>
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
      </NexusCard>

      {/* Photo gallery */}
      <Card>
        <CardHeader
          title="Photo Gallery"
          description="Upload, reorder, or remove photos for this property. The first image is used as the primary photo."
          action={<IconImage size={18} className="text-ink-400" />}
        />
        <CardBody>
          <GalleryManager
            target={{ type: 'property', id: propertyId }}
            items={mediaAssets}
            onRefetch={reload}
            loading={loading}
          />
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
            <ResponsiveTable columns={unitColumns} rows={units} keyFn={(u) => u.id} />
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
                      <SemanticBadge role={getListingModerationVariant(l.status)}>
                        {humanize(l.status)}
                      </SemanticBadge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {/* Add / Edit unit drawer */}
      <DetailDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        eyebrow="UNIT"
        title={editingUnit ? 'Edit unit' : 'Add unit'}
        description="Define the unit details and monthly rent."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="unit-form" loading={saving}>
              {editingUnit ? 'Save changes' : 'Create unit'}
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
                  placeholder="e.g. Block A, Floor 3"
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

          <div className="grid gap-4 sm:grid-cols-2">
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
            <Field label="Available from" error={errors.available_from}>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  type="date"
                  invalid={invalid}
                  value={form.available_from}
                  onChange={(e) => update('available_from', e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field
            label="Amenities"
            error={errors.amenities}
            hint="Comma-separated, e.g. Air conditioning, Parking, Borehole"
          >
            {(fid, invalid) => (
              <Input
                id={fid}
                invalid={invalid}
                placeholder="Air conditioning, Parking, Borehole"
                value={form.amenities}
                onChange={(e) => update('amenities', e.target.value)}
              />
            )}
          </Field>
        </form>
      </DetailDrawer>

      {/* Edit property drawer */}
      <DetailDrawer
        open={propOpen}
        onClose={() => setPropOpen(false)}
        eyebrow="PROPERTY"
        title="Edit property"
        description="Update the property details and full address."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPropOpen(false)} disabled={propSaving}>
              Cancel
            </Button>
            <Button type="submit" form="property-edit-form" loading={propSaving}>
              Save changes
            </Button>
          </>
        }
      >
        {propForm && (
          <form id="property-edit-form" onSubmit={handlePropertySubmit} className="space-y-4">
            <Field label="Property name" error={propErrors.name} required>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  invalid={invalid}
                  value={propForm.name}
                  onChange={(e) => updateProp('name', e.target.value)}
                />
              )}
            </Field>

            <Field label="Property type" error={propErrors.property_type} required>
              {(fid, invalid) => (
                <Select
                  id={fid}
                  invalid={invalid}
                  value={propForm.property_type}
                  onChange={(e) => updateProp('property_type', e.target.value as PropertyType)}
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {humanize(t)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Street address" error={propErrors.street_address} required>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  invalid={invalid}
                  value={propForm.street_address}
                  onChange={(e) => updateProp('street_address', e.target.value)}
                />
              )}
            </Field>

            <Field label="Street address 2 / Estate / Area" error={propErrors.street_address_2}>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  invalid={invalid}
                  value={propForm.street_address_2}
                  onChange={(e) => updateProp('street_address_2', e.target.value)}
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" error={propErrors.city} required>
                {(fid, invalid) => (
                  <Input
                    id={fid}
                    invalid={invalid}
                    value={propForm.city}
                    onChange={(e) => updateProp('city', e.target.value)}
                  />
                )}
              </Field>
              <Field label="Region / State" error={propErrors.state} required>
                {(fid, invalid) => (
                  <Input
                    id={fid}
                    invalid={invalid}
                    value={propForm.state}
                    onChange={(e) => updateProp('state', e.target.value)}
                  />
                )}
              </Field>
              <Field label="Digital address / Postcode" error={propErrors.zip_code} required>
                {(fid, invalid) => (
                  <Input
                    id={fid}
                    invalid={invalid}
                    value={propForm.zip_code}
                    onChange={(e) => updateProp('zip_code', e.target.value)}
                  />
                )}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country" error={propErrors.country} required>
                {(fid, invalid) => (
                  <Input
                    id={fid}
                    invalid={invalid}
                    value={propForm.country}
                    onChange={(e) => updateProp('country', e.target.value)}
                  />
                )}
              </Field>
              <Field label="Year built" error={propErrors.year_built}>
                {(fid, invalid) => (
                  <Input
                    id={fid}
                    type="number"
                    invalid={invalid}
                    value={propForm.year_built}
                    onChange={(e) => updateProp('year_built', e.target.value)}
                  />
                )}
              </Field>
            </div>

            <Field label="Description" error={propErrors.description}>
              {(fid, invalid) => (
                <Textarea
                  id={fid}
                  invalid={invalid}
                  rows={3}
                  value={propForm.description}
                  onChange={(e) => updateProp('description', e.target.value)}
                />
              )}
            </Field>
          </form>
        )}
      </DetailDrawer>

      {/* Unit gallery drawer */}
      <DetailDrawer
        open={galleryUnit !== null}
        onClose={() => setGalleryUnit(null)}
        eyebrow="UNIT"
        title={galleryUnit ? `Photos: Unit ${galleryUnit.unit_number}` : 'Photos'}
        description="Upload, reorder, or remove photos for this unit."
        widthClass="sm:max-w-[820px]"
        footer={<Button variant="secondary" onClick={() => setGalleryUnit(null)}>Close</Button>}
      >
        {galleryUnit && (
          <GalleryManager
            target={{ type: 'unit', id: galleryUnit.id }}
            items={unitMedia}
            loading={unitMediaLoading}
            onRefetch={() => loadUnitMedia(galleryUnit.id)}
          />
        )}
      </DetailDrawer>
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
