import { useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/states';
import {
  IconDoc,
  IconCheckCircle,
  IconClock,
  IconMapPin,
  IconBed,
  IconSearch,
  IconChevronDown,
  IconChevronUp,
} from '@/components/ui/icons';
import { formatDate } from '@/lib/format';
import type { Tone } from '@/components/ui/Badge';

/* ---- Mock application data ----------------------------------------------- */
type AppStatus = 'submitted' | 'under_review' | 'landlord_review' | 'offer_sent' | 'approved' | 'rejected';

interface ApplicationStep {
  key: string;
  label: string;
  description: string;
}

interface MockApplication {
  id: string;
  propertyName: string;
  address: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  rentAmount: string;
  appliedDate: string;
  lastUpdated: string;
  status: AppStatus;
  landlordName: string;
}

const APPLICATION_STEPS: ApplicationStep[] = [
  { key: 'submitted',      label: 'Application submitted', description: 'Your application was received' },
  { key: 'under_review',   label: 'Under review',          description: 'Nexus is verifying your documents' },
  { key: 'landlord_review',label: 'Landlord review',       description: 'The landlord is considering your application' },
  { key: 'offer_sent',     label: 'Lease offer',           description: 'A contract will be sent to you' },
  { key: 'move_in',        label: 'Move in',               description: 'Keys, rent schedule, and ledger go live' },
];

const STATUS_ORDER: AppStatus[] = [
  'submitted', 'under_review', 'landlord_review', 'offer_sent', 'approved',
];

const MOCK_APPLICATIONS: MockApplication[] = [
  {
    id: 'app-001',
    propertyName: 'Cantonments Residence',
    address: '14 Nortei Ababio Loop',
    city: 'Cantonments, Accra',
    bedrooms: 4,
    bathrooms: 3,
    rentAmount: 'GH₵ 12,000',
    appliedDate: '2026-06-01T09:15:00Z',
    lastUpdated: '2026-06-14T11:30:00Z',
    status: 'landlord_review',
    landlordName: 'Kojo Mensah',
  },
  {
    id: 'app-002',
    propertyName: 'East Legon Townhome',
    address: '7 Airport Hills Drive',
    city: 'East Legon, Accra',
    bedrooms: 3,
    bathrooms: 2,
    rentAmount: 'GH₵ 7,500',
    appliedDate: '2026-05-20T14:00:00Z',
    lastUpdated: '2026-05-28T09:45:00Z',
    status: 'approved',
    landlordName: 'Abena Osei',
  },
  {
    id: 'app-003',
    propertyName: 'Osu Luxury Flat',
    address: '3 Oxford Street, Osu',
    city: 'Osu, Accra',
    bedrooms: 2,
    bathrooms: 2,
    rentAmount: 'GH₵ 6,500',
    appliedDate: '2026-06-10T08:30:00Z',
    lastUpdated: '2026-06-10T08:30:00Z',
    status: 'submitted',
    landlordName: 'Yaw Darko',
  },
];

/* ---- Helpers ------------------------------------------------------------- */
function statusTone(status: AppStatus): Tone {
  switch (status) {
    case 'approved':        return 'success';
    case 'offer_sent':      return 'brand';
    case 'landlord_review': return 'warning';
    case 'under_review':    return 'info';
    case 'submitted':       return 'neutral';
    case 'rejected':        return 'danger';
    default:                return 'neutral';
  }
}

function statusLabel(status: AppStatus): string {
  switch (status) {
    case 'submitted':       return 'Submitted';
    case 'under_review':    return 'Under Review';
    case 'landlord_review': return 'Landlord Review';
    case 'offer_sent':      return 'Offer Sent';
    case 'approved':        return 'Approved';
    case 'rejected':        return 'Rejected';
    default:                return status;
  }
}

function stepIndexForStatus(status: AppStatus): number {
  const normalized = status === 'approved' ? 'offer_sent' : status;
  const idx = STATUS_ORDER.indexOf(normalized as AppStatus);
  return idx >= 0 ? idx : 0;
}

/* ---- ApplicationTimeline ------------------------------------------------- */
function ApplicationTimeline({ status }: { status: AppStatus }) {
  const currentIdx = stepIndexForStatus(status);
  const approved = status === 'approved';

  return (
    <ol className="relative mt-4 space-y-0" aria-label="Application progress">
      {APPLICATION_STEPS.map((step, i) => {
        const done = approved ? true : i < currentIdx;
        const current = !approved && i === currentIdx;
        const upcoming = !done && !current;

        return (
          <li key={step.key} className="flex gap-3 pb-5 last:pb-0 relative">
            {/* Connector line */}
            {i < APPLICATION_STEPS.length - 1 && (
              <div
                className="absolute left-[14px] top-7 w-px"
                style={{
                  bottom: 0,
                  backgroundColor: done ? 'var(--color-success-500)' : 'var(--color-ink-200)',
                  opacity: upcoming ? 0.4 : 1,
                }}
                aria-hidden="true"
              />
            )}

            {/* Step dot */}
            <div className="relative z-10 mt-0.5 shrink-0">
              {done ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-50 text-success-600">
                  <IconCheckCircle size={15} />
                </span>
              ) : current ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-2 ring-brand-500/30">
                  <IconClock size={14} />
                </span>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-ink-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
                </span>
              )}
            </div>

            {/* Step content */}
            <div className="min-w-0 flex-1">
              <p
                className={
                  done
                    ? 'text-sm font-medium text-success-600'
                    : current
                    ? 'text-sm font-semibold text-ink-900'
                    : 'text-sm text-ink-400'
                }
              >
                {step.label}
                {current && (
                  <Badge tone="brand" className="ml-2 align-middle">Current</Badge>
                )}
              </p>
              <p className={`text-xs mt-0.5 ${upcoming ? 'text-ink-300' : 'text-ink-500'}`}>
                {step.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---- ApplicationCard ----------------------------------------------------- */
function ApplicationCard({ application }: { application: MockApplication }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Property info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-semibold text-ink-900">
                {application.propertyName}
              </h3>
              <Badge tone={statusTone(application.status)}>
                {statusLabel(application.status)}
              </Badge>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
              <span className="flex items-center gap-1">
                <IconMapPin size={12} />
                {application.address}, {application.city}
              </span>
              <span className="flex items-center gap-1">
                <IconBed size={12} />
                {application.bedrooms} bd · {application.bathrooms} ba
              </span>
              <span
                className="font-medium"
                style={{ color: 'var(--color-money)' }}
              >
                {application.rentAmount}/mo
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-400">
              <span>Applied {formatDate(application.appliedDate)}</span>
              <span>Updated {formatDate(application.lastUpdated)}</span>
              <span>Landlord: {application.landlordName}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {application.status === 'offer_sent' && (
              <Link to="/app/contracts">
                <Button size="sm">View offer</Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse timeline' : 'Expand timeline'}
            >
              {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              {expanded ? 'Hide' : 'Timeline'}
            </Button>
          </div>
        </div>

        {/* Expandable timeline */}
        {expanded && (
          <div className="mt-5 border-t border-ink-200 pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
              Application progress
            </p>
            <ApplicationTimeline status={application.status} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/* ---- Page ---------------------------------------------------------------- */
export function ApplicationsPage() {
  const applications = MOCK_APPLICATIONS;

  const total    = applications.length;
  const approved = applications.filter((a) => a.status === 'approved').length;
  const pending  = applications.filter(
    (a) => a.status === 'submitted' || a.status === 'under_review' || a.status === 'landlord_review',
  ).length;
  const rejected = applications.filter((a) => a.status === 'rejected').length;

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="My Rental"
        title="Applications"
        description="Track your rental applications and see where you stand."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Applications"
          value={total}
          icon={<IconDoc size={18} />}
          subtext="all time"
        />
        <StatCard
          label="Approved"
          value={approved}
          icon={<IconCheckCircle size={18} />}
          tone="success"
          subtext="congratulations!"
        />
        <StatCard
          label="In Progress"
          value={pending}
          icon={<IconClock size={18} />}
          tone="warning"
          subtext="awaiting decision"
        />
        <StatCard
          label="Rejected"
          value={rejected}
          icon={<IconSearch size={18} />}
          tone={rejected > 0 ? 'danger' : 'default'}
          subtext={rejected > 0 ? 'keep looking' : 'none yet'}
        />
      </div>

      {/* Applications list */}
      {applications.length === 0 ? (
        <EmptyState
          icon={<IconDoc size={28} />}
          title="No applications yet"
          description="Once you find a home you love, express interest and your landlord will send a contract."
          action={
            <Link to="/app/browse">
              <Button leftIcon={<IconSearch size={16} />}>Browse Homes</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={`${total} Application${total !== 1 ? 's' : ''}`}
              description="Click the timeline button on any card to see your application progress."
            />
          </Card>

          {applications.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  );
}
