import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import { fieldErrors } from '@/lib/api';
import type { ApiError, Unit, UnitAvailabilityStatus } from '@/lib/types';
import { formatDollars, humanize } from '@/lib/format';
import type { Tone } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Field';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconChevronRight, IconHome, IconPlus } from '@/components/ui/icons';
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
    case 'available':
      return 'success';
    case 'occupied':
      return 'info';
    case 'pending':
      return 'warning';
    case 'maintenance':
      return 'danger';
    default:
      return 'neutral';
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

  function reloadUnits() {
    reload();
    if (!hasEmbeddedUnits) unitsApi.reload();
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
      reloadUnits();
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
      <div>
        <BackLink />
        <LoadingState />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <BackLink />
        <ErrorState message={error?.message ?? 'Property not found.'} onRetry={reload} />
      </div>
    );
  }

  const property = data;
  const fullAddress = [
    property.street_address,
    property.street_address_2,
    `${property.city}, ${property.state} ${property.zip_code}`,
    property.country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div>
      <BackLink />
      <PageHeader
        title={property.name}
        description={fullAddress}
        actions={
          <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={openCreate}>
            Add unit
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{humanize(property.property_type)}</Badge>
        <Badge tone={property.is_active ? 'success' : 'neutral'}>
          {property.is_active ? 'Active' : 'Inactive'}
        </Badge>
        {property.year_built != null && (
          <Badge tone="neutral">Built {property.year_built}</Badge>
        )}
      </div>

      {property.description && (
        <Card className="mb-6">
          <CardBody>
            <p className="text-sm text-ink-600">{property.description}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Units" description="Rentable units within this property." />
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
                  Add unit
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <TH>Unit</TH>
                <TH>Beds</TH>
                <TH>Baths</TH>
                <TH>Rent</TH>
                <TH>Status</TH>
              </THead>
              <TBody>
                {units.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium text-ink-900">
                      {u.unit_number}
                      {u.internal_name && (
                        <span className="ml-1 text-ink-500">({u.internal_name})</span>
                      )}
                    </TD>
                    <TD>{u.bedrooms}</TD>
                    <TD>{u.bathrooms}</TD>
                    <TD>{formatDollars(u.rent_amount)}</TD>
                    <TD>
                      <Badge tone={availabilityTone(u.availability_status)}>
                        {humanize(u.availability_status)}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add unit"
        description="Define the unit's details and rent."
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
                  step="0.5"
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

          <Field label="Square feet" error={errors.square_feet}>
            {(fid, invalid) => (
              <Input
                id={fid}
                type="number"
                min="0"
                invalid={invalid}
                value={form.square_feet}
                onChange={(e) => update('square_feet', e.target.value)}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Monthly rent (USD)" error={errors.rent_amount} required>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  type="number"
                  step="0.01"
                  min="0"
                  invalid={invalid}
                  value={form.rent_amount}
                  onChange={(e) => update('rent_amount', e.target.value)}
                />
              )}
            </Field>
            <Field label="Security deposit (USD)" error={errors.security_deposit}>
              {(fid, invalid) => (
                <Input
                  id={fid}
                  type="number"
                  step="0.01"
                  min="0"
                  invalid={invalid}
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
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 transition hover:text-ink-800"
    >
      <IconChevronRight className="h-4 w-4 rotate-180" />
      Back to properties
    </Link>
  );
}
