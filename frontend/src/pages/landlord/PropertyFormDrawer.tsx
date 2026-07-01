import { useEffect, useMemo, useRef, useState } from 'react';
import { landlordApi } from '@/lib/endpoints';
import { fieldErrors } from '@/lib/api';
import { humanize } from '@/lib/format';
import type { ApiError, Property, PropertyType } from '@/lib/types';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import {
  Drawer,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from '@/components/ui/Drawer';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { DestructiveConfirmDialog } from '@/components/ui/DestructiveConfirmDialog';
import { IconArrowRight, IconArrowLeft } from '@/components/ui/icons';
import { PROPERTY_TYPES } from './property-constants';

/* Ghana regions → 2-letter codes (backend requires state size:2, uppercase).
   The codes are valid 2-letter uppercase strings; the list is Ghana-appropriate
   because the app assumes Ghana. The select still surfaces any pre-existing
   code on edit (see `regionOptions`). */
const GHANA_REGIONS: { code: string; name: string }[] = [
  { code: 'GA', name: 'Greater Accra' },
  { code: 'AS', name: 'Ashanti' },
  { code: 'WE', name: 'Western' },
  { code: 'WN', name: 'Western North' },
  { code: 'CE', name: 'Central' },
  { code: 'EA', name: 'Eastern' },
  { code: 'VO', name: 'Volta' },
  { code: 'OT', name: 'Oti' },
  { code: 'NO', name: 'Northern' },
  { code: 'NE', name: 'North East' },
  { code: 'SV', name: 'Savannah' },
  { code: 'UE', name: 'Upper East' },
  { code: 'UW', name: 'Upper West' },
  { code: 'BO', name: 'Bono' },
  { code: 'BE', name: 'Bono East' },
  { code: 'AH', name: 'Ahafo' },
];

/* ISO-2 country codes (backend requires country size:2, uppercase). */
const COUNTRIES: { code: string; name: string }[] = [
  { code: 'GH', name: 'Ghana' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'CI', name: 'Côte d’Ivoire' },
  { code: 'TG', name: 'Togo' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

interface PropertyForm {
  name: string;
  property_type: PropertyType | '';
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
    property_type: '',
    street_address: '',
    street_address_2: '',
    city: 'Accra',
    state: 'GA',
    zip_code: '',
    country: 'GH',
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

const STEP_LABELS = ['Property basics', 'Location details'];
/** Which step each field lives on — used to jump to a server error's step. */
const FIELD_STEP: Record<string, 0 | 1> = {
  name: 0,
  property_type: 0,
  year_built: 0,
  description: 0,
  street_address: 1,
  street_address_2: 1,
  city: 1,
  state: 1,
  zip_code: 1,
  country: 1,
};

interface PropertyFormDrawerProps {
  open: boolean;
  /** null = create, a Property = edit. */
  editing: Property | null;
  onClose: () => void;
  /** Fired after a successful create/update so the page can reload real data. */
  onSaved: () => void;
}

export function PropertyFormDrawer({
  open,
  editing,
  onClose,
  onSaved,
}: PropertyFormDrawerProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<0 | 1>(0);
  const [form, setForm] = useState<PropertyForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const initialRef = useRef<string>('');

  /* Reset to a clean state whenever the drawer opens. */
  useEffect(() => {
    if (!open) return;
    const next = editing ? formFromProperty(editing) : emptyForm();
    setForm(next);
    initialRef.current = JSON.stringify(next);
    setErrors({});
    setStep(0);
    setSaving(false);
    setShowDiscard(false);
  }, [open, editing]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== initialRef.current,
    [form],
  );

  /* Edit may carry a region/country code not in our curated lists — surface it. */
  const regionOptions = useMemo(() => {
    if (form.state && !GHANA_REGIONS.some((r) => r.code === form.state)) {
      return [{ code: form.state, name: form.state }, ...GHANA_REGIONS];
    }
    return GHANA_REGIONS;
  }, [form.state]);
  const countryOptions = useMemo(() => {
    if (form.country && !COUNTRIES.some((c) => c.code === form.country)) {
      return [{ code: form.country, name: form.country }, ...COUNTRIES];
    }
    return COUNTRIES;
  }, [form.country]);

  function update<K extends keyof PropertyForm>(key: K, value: PropertyForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  }

  /* ── Validation (mirrors StorePropertyRequest, no invented rules) ── */
  function validate(which: 0 | 1 | 'all'): Record<string, string> {
    const e: Record<string, string> = {};
    const checkBasics = which === 0 || which === 'all';
    const checkLocation = which === 1 || which === 'all';

    if (checkBasics) {
      if (!form.name.trim()) e.name = 'Property name is required.';
      else if (form.name.length > 255) e.name = 'Keep the name under 255 characters.';
      if (!form.property_type) e.property_type = 'Choose a property type.';
      if (form.year_built.trim()) {
        const y = Number(form.year_built);
        const max = new Date().getFullYear() + 1;
        if (!Number.isInteger(y)) e.year_built = 'Enter a valid year.';
        else if (y < 1800) e.year_built = 'Year built must be 1800 or later.';
        else if (y > max) e.year_built = 'Year built cannot be in the future.';
      }
      if (form.description.length > 2000)
        e.description = 'Keep the description under 2000 characters.';
    }

    if (checkLocation) {
      if (!form.street_address.trim()) e.street_address = 'Street address is required.';
      if (!form.city.trim()) e.city = 'City is required.';
      if (!/^[A-Z]{2}$/.test(form.state)) e.state = 'Select a region (2-letter code).';
      if (!form.zip_code.trim()) e.zip_code = 'Digital address / postcode is required.';
      else if (form.zip_code.length > 10) e.zip_code = 'Keep this under 10 characters.';
      if (!/^[A-Z]{2}$/.test(form.country)) e.country = 'Select a country.';
    }

    return e;
  }

  function goNext() {
    const e = validate(0);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(1);
  }

  async function handleSubmit(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (saving) return; // guard double submission
    // On the basics step, Enter advances rather than submitting the whole form.
    if (step === 0) {
      goNext();
      return;
    }

    const e = validate('all');
    if (Object.keys(e).length > 0) {
      setErrors(e);
      // jump to the earliest step that has an error
      const firstStep = Object.keys(e).some((k) => FIELD_STEP[k] === 0) ? 0 : 1;
      setStep(firstStep);
      return;
    }

    setSaving(true);
    setErrors({});
    const payload: Partial<Property> = {
      name: form.name.trim(),
      property_type: form.property_type as PropertyType,
      street_address: form.street_address.trim(),
      street_address_2: form.street_address_2.trim() || null,
      city: form.city.trim(),
      state: form.state,
      zip_code: form.zip_code.trim(),
      country: form.country,
      year_built: form.year_built ? Number(form.year_built) : null,
      description: form.description.trim() || null,
    };

    try {
      if (editing) {
        await landlordApi.updateProperty(editing.id, payload);
        toast('Property updated', 'success');
      } else {
        await landlordApi.createProperty(payload);
        toast('Property created', 'success');
      }
      onSaved();
      onClose();
    } catch (err) {
      const e2 = err as ApiError;
      const fe = fieldErrors(e2);
      if (Object.keys(fe).length > 0) {
        setErrors(fe);
        const firstStep = Object.keys(fe).some((k) => FIELD_STEP[k] === 0) ? 0 : 1;
        setStep(firstStep);
      } else {
        toast(e2.message, 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  /* ── Close flow with unsaved-changes guard ── */
  function requestClose() {
    if (saving) return;
    if (dirty) setShowDiscard(true);
    else onClose();
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(o) => {
          if (!o) requestClose();
        }}
        blockInteractions={showDiscard}
      >
        <DrawerHeader
          title={editing ? 'Edit property' : 'Add property'}
          description="Provide the property details and full address."
          onClose={requestClose}
          accessory={<StepIndicator steps={STEP_LABELS} current={step} onStepClick={(i) => setStep(i as 0 | 1)} />}
        />

        <DrawerBody>
          <form id="property-drawer-form" onSubmit={handleSubmit} className="space-y-5">
            {step === 0 ? (
              <>
                <Field label="Property name" error={errors.name} required>
                  {(id, invalid) => (
                    <Input
                      id={id}
                      invalid={invalid}
                      autoFocus
                      placeholder="e.g. East Legon Heights"
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
                      <option value="" disabled>
                        Select property type
                      </option>
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {humanize(t)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <Field label="Year built" error={errors.year_built} hint="Optional">
                  {(id, invalid) => (
                    <Input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      invalid={invalid}
                      placeholder="e.g. 2019"
                      value={form.year_built}
                      onChange={(e) => update('year_built', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Description" error={errors.description} hint="Optional">
                  {(id, invalid) => (
                    <Textarea
                      id={id}
                      invalid={invalid}
                      rows={4}
                      placeholder="Brief description of the property…"
                      value={form.description}
                      onChange={(e) => update('description', e.target.value)}
                    />
                  )}
                </Field>

                <p className="text-xs text-ink-400">You can add more details later.</p>
              </>
            ) : (
              <>
                <Field label="Street address" error={errors.street_address} required>
                  {(id, invalid) => (
                    <Input
                      id={id}
                      invalid={invalid}
                      autoFocus
                      placeholder="e.g. 14 Boundary Road"
                      value={form.street_address}
                      onChange={(e) => update('street_address', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Street address 2 / Estate / Area" error={errors.street_address_2} hint="Optional">
                  {(id, invalid) => (
                    <Input
                      id={id}
                      invalid={invalid}
                      placeholder="e.g. East Legon"
                      value={form.street_address_2}
                      onChange={(e) => update('street_address_2', e.target.value)}
                    />
                  )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City" error={errors.city} required>
                    {(id, invalid) => (
                      <Input
                        id={id}
                        invalid={invalid}
                        placeholder="e.g. Accra"
                        value={form.city}
                        onChange={(e) => update('city', e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Region" error={errors.state} required>
                    {(id, invalid) => (
                      <Select
                        id={id}
                        invalid={invalid}
                        value={form.state}
                        onChange={(e) => update('state', e.target.value)}
                      >
                        {regionOptions.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name} ({r.code})
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Digital address / Postcode" error={errors.zip_code} required>
                    {(id, invalid) => (
                      <Input
                        id={id}
                        invalid={invalid}
                        placeholder="GA-123-4567"
                        value={form.zip_code}
                        onChange={(e) => update('zip_code', e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Country" error={errors.country} required>
                    {(id, invalid) => (
                      <Select
                        id={id}
                        invalid={invalid}
                        value={form.country}
                        onChange={(e) => update('country', e.target.value)}
                      >
                        {countryOptions.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
              </>
            )}
          </form>
        </DrawerBody>

        <DrawerFooter>
          {step === 0 ? (
            <>
              <Button variant="secondary" onClick={requestClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={goNext} rightIcon={<IconArrowRight size={16} />}>
                Next
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => setStep(0)}
                disabled={saving}
                leftIcon={<IconArrowLeft size={16} />}
              >
                Back
              </Button>
              <Button
                type="submit"
                form="property-drawer-form"
                loading={saving}
              >
                {editing ? 'Save changes' : 'Create property'}
              </Button>
            </>
          )}
        </DrawerFooter>
      </Drawer>

      {/* Unsaved-changes guard */}
      <DestructiveConfirmDialog
        open={showDiscard}
        onClose={() => setShowDiscard(false)}
        onConfirm={() => {
          setShowDiscard(false);
          onClose();
        }}
        title="Discard changes?"
        description="You have unsaved details. If you leave now, they’ll be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
      />
    </>
  );
}
