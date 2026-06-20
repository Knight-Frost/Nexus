import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import {
  IconCheck,
  IconCheckCircle,
  IconAlertTriangle,
  IconLock,
  IconLogout,
  IconEdit,
  IconMail,
  IconPhone,
  IconUsers,
} from '@/components/ui/icons';

/* ---- Tiny toggle pill ---------------------------------------------------- */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-brand-600',
        checked ? 'bg-brand-600' : 'bg-ink-200',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 translate-x-0 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}

/* ---- Section that shows a result banner ---------------------------------- */
function ResultBanner({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border',
        type === 'success'
          ? 'bg-success-50 text-success-700 border-success-200'
          : 'bg-danger-50 text-danger-700 border-danger-200',
      )}
    >
      {type === 'success' ? (
        <IconCheckCircle size={15} className="shrink-0" />
      ) : (
        <IconAlertTriangle size={15} className="shrink-0" />
      )}
      {message}
    </div>
  );
}

/* ---- Preference row ------------------------------------------------------ */
function PrefRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-900">{label}</p>
        <p className="mt-0.5 text-xs text-ink-500">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/* ---- Main component ------------------------------------------------------ */
export function ProfilePage() {
  const { user, logout } = useAuth();

  /* ---- Profile edit state ---- */
  const [editing, setEditing] = useState(false);
  const [profileResult, setProfileResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const displayName =
    user && 'first_name' in user
      ? `${user.first_name} ${user.last_name}`
      : user && 'name' in user
        ? user.name
        : 'Unknown';

  const [firstName, setFirstName] = useState(
    user && 'first_name' in user ? user.first_name : '',
  );
  const [lastName, setLastName] = useState(
    user && 'last_name' in user ? user.last_name : '',
  );
  const [phone, setPhone] = useState(
    user && 'phone' in user ? user.phone ?? '' : '',
  );

  function handleSaveProfile() {
    // No real endpoint yet — show success feedback
    setProfileResult({ type: 'success', message: 'Profile updated. (Changes are preview only — no save endpoint is available yet.)' });
    setEditing(false);
  }

  /* ---- Notification preferences state ---- */
  const [prefs, setPrefs] = useState({
    rentReminders: true,
    listingUpdates: true,
    applicationUpdates: true,
    maintenanceUpdates: false,
  });

  function setPref(key: keyof typeof prefs, val: boolean) {
    setPrefs((p) => ({ ...p, [key]: val }));
  }

  /* ---- Password change state ---- */
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwResult, setPwResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function handleChangePassword() {
    const errors: Record<string, string> = {};
    if (!pwCurrent) errors.pwCurrent = 'Current password is required.';
    if (!pwNew || pwNew.length < 8) errors.pwNew = 'New password must be at least 8 characters.';
    if (pwNew !== pwConfirm) errors.pwConfirm = 'Passwords do not match.';
    if (Object.keys(errors).length > 0) {
      setPwErrors(errors);
      return;
    }
    // No real endpoint yet
    setPwResult({ type: 'success', message: 'Password change submitted. (Preview only — no save endpoint yet.)' });
    setPwCurrent('');
    setPwNew('');
    setPwConfirm('');
    setPwErrors({});
  }

  /* ---- Sign-out modal ---- */
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      setSignOutOpen(false);
    }
  }

  /* ---- Delete account modal ---- */
  const [deleteOpen, setDeleteOpen] = useState(false);

  const identityVerified =
    user && 'identity_verified' in user ? user.identity_verified : false;
  const userEmail = user?.email ?? '';
  const userRole =
    user && 'role' in user
      ? user.role === 'admin'
        ? 'Administrator'
        : user.role === 'landlord'
          ? 'Landlord'
          : 'Tenant'
      : 'User';

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Profile & Settings"
        description="Manage your personal details, preferences, and security."
      />

      {/* ── 1. Profile ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Profile"
          action={
            !editing ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setEditing(true); setProfileResult(null); }}
                leftIcon={<IconEdit size={15} />}
              >
                Edit
              </Button>
            ) : null
          }
        />
        <CardBody>
          {profileResult && (
            <div className="mb-4">
              <ResultBanner message={profileResult.message} type={profileResult.type} />
            </div>
          )}

          {!editing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 font-display text-xl font-bold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-ink-900">{displayName}</p>
                  <p className="text-sm text-ink-500">{userRole}</p>
                </div>
              </div>
              <div className="mt-4 divide-y divide-ink-100">
                <div className="flex items-center gap-2.5 py-3">
                  <IconMail size={15} className="shrink-0 text-ink-400" />
                  <span className="text-sm text-ink-700">{userEmail}</span>
                </div>
                {user && 'phone' in user && user.phone && (
                  <div className="flex items-center gap-2.5 py-3">
                    <IconPhone size={15} className="shrink-0 text-ink-400" />
                    <span className="text-sm text-ink-700">{user.phone}</span>
                  </div>
                )}
                {user && 'user_type' in user && (
                  <div className="flex items-center gap-2.5 py-3">
                    <IconUsers size={15} className="shrink-0 text-ink-400" />
                    <span className="text-sm text-ink-700 capitalize">{user.user_type} account</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First name">
                  {(id) => (
                    <Input
                      id={id}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  )}
                </Field>
                <Field label="Last name">
                  {(id) => (
                    <Input
                      id={id}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  )}
                </Field>
              </div>
              <Field label="Email" hint="Contact support to change your email address.">
                {(id) => (
                  <Input id={id} value={userEmail} disabled />
                )}
              </Field>
              <Field label="Phone number">
                {(id) => (
                  <Input
                    id={id}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+233 20 000 0000"
                  />
                )}
              </Field>
              <div className="flex gap-3 pt-1">
                <Button onClick={handleSaveProfile} leftIcon={<IconCheck size={15} />}>
                  Save changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { setEditing(false); setProfileResult(null); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── 2. Verification Status ──────────────────────────────────────────── */}
      {user && 'identity_verified' in user && (
        <Card>
          <CardHeader title="Identity Verification" />
          <CardBody>
            {identityVerified ? (
              <div className="flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3">
                <IconCheckCircle size={18} className="shrink-0 text-success-600" />
                <div>
                  <p className="text-sm font-semibold text-success-800">Identity Verified</p>
                  <p className="text-xs text-success-600">Your identity has been confirmed.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3">
                  <IconAlertTriangle size={18} className="shrink-0 text-warning-600" />
                  <div>
                    <p className="text-sm font-semibold text-warning-800">Verification Required</p>
                    <p className="text-xs text-warning-600">
                      Verify your identity to unlock all platform features.
                    </p>
                  </div>
                </div>
                <ol className="space-y-3">
                  {[
                    { step: 1, label: 'Upload a government-issued ID', done: false },
                    { step: 2, label: 'Take a selfie to confirm your identity', done: false },
                    { step: 3, label: 'Wait for admin review (usually 24–48 hrs)', done: false },
                  ].map(({ step, label, done }) => (
                    <li key={step} className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                          done
                            ? 'bg-success-100 text-success-700'
                            : 'bg-ink-100 text-ink-400',
                        )}
                      >
                        {done ? <IconCheck size={14} /> : step}
                      </div>
                      <span className={cn('text-sm', done ? 'text-ink-400 line-through' : 'text-ink-700')}>
                        {label}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4">
                  <Button variant="secondary" size="sm" disabled>
                    Start Verification (coming soon)
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── 3. Theme Preference ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Appearance" />
        <CardBody>
          <p className="mb-4 text-sm text-ink-500">
            Choose your preferred color theme. Your choice is saved in the browser.
          </p>
          <ThemeToggle variant="segmented" />
        </CardBody>
      </Card>

      {/* ── 4. Notification Preferences ─────────────────────────────────────── */}
      <Card>
        <CardHeader title="Notification Preferences" />
        <CardBody>
          <p className="mb-4 text-sm text-ink-500">
            Choose which updates you want to be notified about. (Preview — preferences stored locally.)
          </p>
          <div className="divide-y divide-ink-100">
            <PrefRow
              label="Rent reminders"
              description="Get notified before rent is due and when a charge is generated."
              checked={prefs.rentReminders}
              onChange={(v) => setPref('rentReminders', v)}
            />
            <PrefRow
              label="Listing updates"
              description="Changes to listing status, approvals, or rejections."
              checked={prefs.listingUpdates}
              onChange={(v) => setPref('listingUpdates', v)}
            />
            <PrefRow
              label="Application updates"
              description="When your application or a contract changes status."
              checked={prefs.applicationUpdates}
              onChange={(v) => setPref('applicationUpdates', v)}
            />
            <PrefRow
              label="Maintenance updates"
              description="Status changes on maintenance requests."
              checked={prefs.maintenanceUpdates}
              onChange={(v) => setPref('maintenanceUpdates', v)}
            />
          </div>
        </CardBody>
      </Card>

      {/* ── 5. Security ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Security" />
        <CardBody>
          <div className="space-y-5">
            {/* Change password */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
                <IconLock size={15} className="text-ink-400" />
                Change Password
              </h4>
              {pwResult && (
                <div className="mb-3">
                  <ResultBanner message={pwResult.message} type={pwResult.type} />
                </div>
              )}
              <div className="space-y-3">
                <Field label="Current password" error={pwErrors.pwCurrent}>
                  {(id, invalid) => (
                    <Input
                      id={id}
                      invalid={invalid}
                      type="password"
                      value={pwCurrent}
                      onChange={(e) => {
                        setPwCurrent(e.target.value);
                        setPwErrors((p) => ({ ...p, pwCurrent: '' }));
                      }}
                      placeholder="Your current password"
                    />
                  )}
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="New password" error={pwErrors.pwNew}>
                    {(id, invalid) => (
                      <Input
                        id={id}
                        invalid={invalid}
                        type="password"
                        value={pwNew}
                        onChange={(e) => {
                          setPwNew(e.target.value);
                          setPwErrors((p) => ({ ...p, pwNew: '' }));
                        }}
                        placeholder="Min. 8 characters"
                      />
                    )}
                  </Field>
                  <Field label="Confirm new password" error={pwErrors.pwConfirm}>
                    {(id, invalid) => (
                      <Input
                        id={id}
                        invalid={invalid}
                        type="password"
                        value={pwConfirm}
                        onChange={(e) => {
                          setPwConfirm(e.target.value);
                          setPwErrors((p) => ({ ...p, pwConfirm: '' }));
                        }}
                        placeholder="Repeat new password"
                      />
                    )}
                  </Field>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleChangePassword}
                  leftIcon={<IconCheck size={15} />}
                >
                  Update Password
                </Button>
              </div>
            </div>

            <hr className="border-ink-100" />

            {/* Sign out of all devices */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink-900">Sign Out</p>
                <p className="text-xs text-ink-500">
                  Sign out of your current session on this device.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSignOutOpen(true)}
                leftIcon={<IconLogout size={15} />}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── 6. Danger Zone ──────────────────────────────────────────────────── */}
      <Card className="border-danger-200">
        <CardHeader title="Danger Zone" />
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-danger-100 bg-danger-50/50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-danger-800">Delete Account</p>
                <p className="text-xs text-danger-600">
                  Permanently remove your account and all associated data. This cannot be undone.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Sign-out modal ────────────────────────────────────────────────── */}
      <Modal
        open={signOutOpen}
        onClose={() => !signingOut && setSignOutOpen(false)}
        title="Sign out?"
        description="You will be signed out of your current session. You can sign back in at any time."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSignOutOpen(false)} disabled={signingOut}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleSignOut}
              loading={signingOut}
              leftIcon={<IconLogout size={15} />}
            >
              Sign Out
            </Button>
          </>
        }
      />

      {/* ── Delete account modal ──────────────────────────────────────────── */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete account"
        description="Account deletion is irreversible. Please contact support to request account deletion."
        footer={
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-warning-600" />
          <span>
            To delete your account, email{' '}
            <a href="mailto:support@nexus.app" className="font-medium underline">
              support@nexus.app
            </a>{' '}
            from your registered email address. We will process your request within 5 business days.
          </span>
        </div>
      </Modal>
    </div>
  );
}
