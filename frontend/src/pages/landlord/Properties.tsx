import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import { fieldErrors } from '@/lib/api';
import type { ApiError, Property, PropertyType } from '@/lib/types';
import { humanize } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconBuilding, IconPlus, IconX } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';

const PROPERTY_TYPES: PropertyType[] = [
  'single_family',
  'multi_family',
  'apartment',
  'condo',
  'townhouse',
  'commercial',
  'other',
];

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

function emptyForm(): PropertyForm {
  return {
    name: '',
    property_type: 'single_family',
    street_address: '',
    street_address_2: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    year_built: '',
    description: '',
  };
}

function formFromProperty(p: Property): PropertyForm {
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

export function Properties() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi(() => landlordApi.properties(), []);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(p: Property) {
    setEditing(p);
    setForm(formFromProperty(p));
    setErrors({});
    setFormOpen(true);
  }

  function update<K extends keyof PropertyForm>(key: K, value: PropertyForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload: Partial<Property> = {
      name: form.name,
      property_type: form.property_type,
      street_address: form.street_address,
      street_address_2: form.street_address_2 || null,
      city: form.city,
      state: form.state,
      zip_code: form.zip_code,
      country: form.country,
      year_built: form.year_built ? Number(form.year_built) : null,
      description: form.description || null,
    };
    try {
      if (editing) {
        await landlordApi.updateProperty(editing.id, payload);
        toast('Property updated', 'success');
      } else {
        await landlordApi.createProperty(payload);
        toast('Property created', 'success');
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      const e2 = err as ApiError;
      const fe = fieldErrors(e2);
      setErrors(fe);
      if (Object.keys(fe).length === 0) toast(e2.message, 'error');
    } finally {
      setSaving(false);
    }
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

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Manage the buildings and homes in your portfolio."
        actions={
          <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={openCreate}>
            Add property
          </Button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState
          icon={<IconBuilding />}
          title="No properties yet"
          description="Add your first property to start creating units and listings."
          action={
            <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={openCreate}>
              Add property
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <TH>Name</TH>
              <TH>Type</TH>
              <TH>Location</TH>
              <TH>Units</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <TBody>
              {data.map((p) => (
                <TR key={p.id} onClick={() => navigate(`/app/properties/${p.id}`)}>
                  <TD className="font-medium text-ink-900">{p.name}</TD>
                  <TD>{humanize(p.property_type)}</TD>
                  <TD>
                    {p.city}, {p.state}
                  </TD>
                  <TD>{p.units_count ?? '—'}</TD>
                  <TD>
                    <Badge tone={p.is_active ? 'success' : 'neutral'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${p.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setToDelete(p);
                        }}
                      >
                        <IconX className="h-4 w-4 text-danger-600" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit property' : 'Add property'}
        description="Provide the property's details and address."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="property-form" loading={saving}>
              {editing ? 'Save changes' : 'Create property'}
            </Button>
          </>
        }
      >
        <form id="property-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" error={errors.name} required>
            {(id, invalid) => (
              <Input
                id={id}
                invalid={invalid}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            )}
          </Field>

          <Field label="Property type" error={errors.property_type} required>
            {(id, invalid) => (
              <Select
                id={id}
                invalid={invalid}
                value={form.property_type}
                onChange={(e) => update('property_type', e.target.value as PropertyType)}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {humanize(t)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Street address" error={errors.street_address} required>
            {(id, invalid) => (
              <Input
                id={id}
                invalid={invalid}
                value={form.street_address}
                onChange={(e) => update('street_address', e.target.value)}
              />
            )}
          </Field>

          <Field label="Street address 2" error={errors.street_address_2}>
            {(id, invalid) => (
              <Input
                id={id}
                invalid={invalid}
                value={form.street_address_2}
                onChange={(e) => update('street_address_2', e.target.value)}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" error={errors.city} required>
              {(id, invalid) => (
                <Input
                  id={id}
                  invalid={invalid}
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              )}
            </Field>
            <Field label="State" error={errors.state} required>
              {(id, invalid) => (
                <Input
                  id={id}
                  invalid={invalid}
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                />
              )}
            </Field>
            <Field label="ZIP code" error={errors.zip_code} required>
              {(id, invalid) => (
                <Input
                  id={id}
                  invalid={invalid}
                  value={form.zip_code}
                  onChange={(e) => update('zip_code', e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country" error={errors.country} required>
              {(id, invalid) => (
                <Input
                  id={id}
                  invalid={invalid}
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                />
              )}
            </Field>
            <Field label="Year built" error={errors.year_built}>
              {(id, invalid) => (
                <Input
                  id={id}
                  type="number"
                  invalid={invalid}
                  value={form.year_built}
                  onChange={(e) => update('year_built', e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label="Description" error={errors.description}>
            {(id, invalid) => (
              <Textarea
                id={id}
                invalid={invalid}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            )}
          </Field>
        </form>
      </Modal>

      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Delete property"
        description={
          toDelete
            ? `Delete "${toDelete.name}"? This action cannot be undone.`
            : undefined
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
