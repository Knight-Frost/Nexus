import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Field';
import {
  IconUsers,
  IconCheck,
  IconX,
  IconCheckCircle,
  IconXCircle,
  IconShield,
  IconAlertCircle,
} from '@/components/ui/icons';
import { formatDate } from '@/lib/format';
import * as MOCK from '@/lib/mockData';
import { cn } from '@/lib/cn';

type ApplicantStatus = 'pending' | 'approved' | 'rejected';
type FilterTab = 'all' | ApplicantStatus;

interface Applicant {
  id: string;
  name: string;
  email: string;
  property: string;
  unit: string;
  applied_at: string;
  status: ApplicantStatus;
  verified: boolean;
}

function statusTone(s: ApplicantStatus) {
  if (s === 'approved') return 'success' as const;
  if (s === 'rejected') return 'danger' as const;
  return 'warning' as const;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const letters =
    parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
      aria-hidden="true"
    >
      {letters.toUpperCase()}
    </span>
  );
}

export function Applicants() {
  const [applicants, setApplicants] = useState<Applicant[]>(MOCK.MOCK_APPLICANTS);
  const [tab, setTab] = useState<FilterTab>('all');

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<Applicant | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const filtered =
    tab === 'all' ? applicants : applicants.filter((a) => a.status === tab);

  const counts = applicants.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'pending',  label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  function handleApprove(id: string) {
    setApplicants((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' as const } : a)),
    );
  }

  function openReject(a: Applicant) {
    setRejectTarget(a);
    setRejectReason('');
    setReasonError('');
  }

  function handleRejectConfirm() {
    if (!rejectReason.trim()) {
      setReasonError('Please provide a reason for rejection.');
      return;
    }
    setApplicants((prev) =>
      prev.map((a) =>
        a.id === rejectTarget!.id ? { ...a, status: 'rejected' as const } : a,
      ),
    );
    setRejectTarget(null);
  }

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Applicants"
        description="Review and action rental applications for your listings."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total"
          value={applicants.length}
          icon={<IconUsers size={17} />}
        />
        <StatCard
          label="Pending Review"
          value={counts['pending'] ?? 0}
          tone={(counts['pending'] ?? 0) > 0 ? 'warning' : 'default'}
          icon={<IconAlertCircle size={17} />}
        />
        <StatCard
          label="Approved"
          value={counts['approved'] ?? 0}
          tone="success"
          icon={<IconCheckCircle size={17} />}
        />
        <StatCard
          label="Rejected"
          value={counts['rejected'] ?? 0}
          tone="danger"
          icon={<IconXCircle size={17} />}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-ink-200 pb-0">
        {TABS.map((t) => {
          const count = t.key === 'all' ? applicants.length : (counts[t.key] ?? 0);
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-ink-500 hover:text-ink-800',
              )}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={cn(
                    'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                    tab === t.key
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-ink-100 text-ink-500',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Applicant list */}
      <Card>
        <CardHeader title={`${filtered.length} applicant${filtered.length !== 1 ? 's' : ''}`} />
        <CardBody className="pt-2">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-500">
              No applicants in this category yet.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {filtered.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-4 py-4">
                  {/* Avatar */}
                  <Initials name={a.name} />

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink-900">{a.name}</p>
                      <Badge tone={statusTone(a.status)}>{a.status.charAt(0).toUpperCase() + a.status.slice(1)}</Badge>
                      {a.verified ? (
                        <Badge tone="success">
                          <IconShield size={11} className="mr-0.5 inline" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge tone="warning">Unverified</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-500">{a.email}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {a.property} · Unit {a.unit} · Applied {formatDate(a.applied_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-2">
                    {a.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          leftIcon={<IconCheck size={13} />}
                          onClick={() => handleApprove(a.id)}
                          className="bg-success-600 text-white hover:bg-success-500"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<IconX size={13} />}
                          onClick={() => openReject(a)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {a.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 text-sm text-success-600 font-medium">
                        <IconCheckCircle size={15} />
                        Approved
                      </span>
                    )}
                    {a.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-sm text-danger-600 font-medium">
                        <IconXCircle size={15} />
                        Rejected
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Reject reason modal */}
      <Modal
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Reject Application"
        description={
          rejectTarget
            ? `Rejecting application from ${rejectTarget.name} for ${rejectTarget.property} · Unit ${rejectTarget.unit}.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRejectConfirm}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <Field label="Reason for rejection" error={reasonError} required>
          {(id, invalid) => (
            <Input
              id={id}
              invalid={invalid}
              placeholder="e.g. Income requirements not met"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (e.target.value.trim()) setReasonError('');
              }}
            />
          )}
        </Field>
      </Modal>
    </div>
  );
}
