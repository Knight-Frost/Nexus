import { Link } from 'react-router';
import { useAuth } from '@/context/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Bars, Donut } from '@/components/ui/charts';
import {
  IconBuilding,
  IconPlus,
  IconUsers,
  IconAlertTriangle,
  IconHome,
  IconTrendingUp,
} from '@/components/ui/icons';
import { formatCents, formatCedisDecimal, humanize, listingStatusTone } from '@/lib/format';
import * as MOCK from '@/lib/mockData';
import { cn } from '@/lib/cn';

/* ---- helpers ------------------------------------------------------------ */
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

function priorityTone(p: 'urgent' | 'normal' | 'low') {
  if (p === 'urgent') return 'danger' as const;
  if (p === 'normal') return 'warning' as const;
  return 'neutral' as const;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const letters = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2);
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
      aria-hidden="true"
    >
      {letters.toUpperCase()}
    </span>
  );
}

/* ---- component ---------------------------------------------------------- */

export function LandlordDashboard() {
  const { user } = useAuth();
  const firstName = user && 'first_name' in user ? user.first_name : 'there';
  const d = MOCK.MOCK_LANDLORD_DASHBOARD;

  const overdueDisplay = d.overdue_cents > 0
    ? formatCents(d.overdue_cents) + ' overdue'
    : 'All rent collected';

  const pendingApplicants = MOCK.MOCK_APPLICANTS.filter((a) => a.status === 'pending');

  return (
    <div className="animate-rise space-y-6">
      {/* ---- Hero banner ---- */}
      <div className="rounded-2xl border border-ink-200 bg-brand-50 dark:bg-ink-100 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">
              Portfolio Overview
            </p>
            <h1 className="font-display text-2xl font-semibold text-ink-950">
              Good morning, {firstName}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {d.total_units} units · {' '}
              <span
                className={cn(
                  'font-medium',
                  d.overdue_cents > 0 ? 'text-danger-600' : 'text-success-600',
                )}
              >
                {overdueDisplay}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/app/properties">
              <Button variant="secondary" size="sm" leftIcon={<IconBuilding size={15} />}>
                Add Property
              </Button>
            </Link>
            <Link to="/app/listings">
              <Button size="sm" leftIcon={<IconPlus size={15} />}>
                Create Listing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ---- Stats row ---- */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Rent Collected"
          value={formatCents(d.monthly_revenue_cents - d.overdue_cents)}
          tone="money"
          subtext={`of ${formatCents(d.monthly_revenue_cents)} total`}
          icon={<IconTrendingUp size={17} />}
        />
        <StatCard
          label="Overdue"
          value={formatCents(d.overdue_cents)}
          tone={d.overdue_cents > 0 ? 'danger' : 'success'}
          subtext={d.overdue_cents > 0 ? '1 tenant' : 'No overdue rent'}
          icon={<IconAlertTriangle size={17} />}
        />
        <StatCard
          label="Occupancy"
          value={`${d.occupancy_pct}%`}
          tone="success"
          subtext={`${d.occupied_units} of ${d.total_units} units occupied`}
          icon={<IconHome size={17} />}
          trend={{ value: '+3% vs last month', direction: 'up' }}
        />
        <StatCard
          label="Pending Applicants"
          value={d.pending_applications}
          tone={d.pending_applications > 0 ? 'warning' : 'default'}
          subtext="awaiting review"
          icon={<IconUsers size={17} />}
        />
      </div>

      {/* ---- Main 2-col grid ---- */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Revenue & Occupancy */}
          <Card>
            <CardHeader title="Revenue & Occupancy" />
            <CardBody>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Bar chart */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">
                    Monthly Revenue (GH₵)
                  </p>
                  <Bars
                    data={d.revenue_history.map((v) => v / 100)}
                    height={72}
                  />
                  <div className="mt-2 flex justify-between">
                    {MONTH_LABELS.map((m) => (
                      <span key={m} className="text-[10px] text-ink-400">{m}</span>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-medium text-ink-900">
                    {formatCents(d.revenue_history[5])}{' '}
                    <span className="text-xs font-normal text-success-600">Jun 2026</span>
                  </p>
                </div>

                {/* Donut */}
                <div className="flex flex-col items-center justify-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                    Occupancy Rate
                  </p>
                  <Donut pct={d.occupancy_pct} size={100} label="occupied" />
                  <p className="text-sm text-ink-500">
                    {d.occupied_units} of {d.total_units} units
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Pending Applicants preview */}
          <Card>
            <CardHeader
              title="Pending Applicants"
              action={
                <Link to="/app/applicants">
                  <Button variant="ghost" size="sm">
                    View all
                  </Button>
                </Link>
              }
            />
            <CardBody className="pt-2">
              {pendingApplicants.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-500">
                  No pending applications right now.
                </p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {pendingApplicants.slice(0, 3).map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-3">
                      <Initials name={a.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">{a.name}</p>
                        <p className="truncate text-xs text-ink-500">
                          {a.property} · Unit {a.unit}
                        </p>
                      </div>
                      <Badge tone="warning">Pending</Badge>
                      <Link to="/app/applicants">
                        <Button variant="ghost" size="sm">
                          Review
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Maintenance Queue */}
          <Card>
            <CardHeader
              title="Maintenance Queue"
              action={
                <Link to="/app/maintenance">
                  <Button variant="ghost" size="sm">
                    View all
                  </Button>
                </Link>
              }
            />
            <CardBody className="pt-2">
              {MOCK.MOCK_MAINTENANCE_REQUESTS.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-500">No open requests.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {MOCK.MOCK_MAINTENANCE_REQUESTS.slice(0, 3).map((r) => (
                    <li key={r.id} className="py-3">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium text-ink-900">
                            {r.issue}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            Unit {r.unit} · {r.property}
                          </p>
                        </div>
                        <Badge tone={priorityTone(r.priority)}>
                          {humanize(r.priority)}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Listing Performance */}
          <Card>
            <CardHeader title="Listing Performance" />
            <CardBody className="pt-2">
              <ul className="divide-y divide-ink-100">
                {MOCK.MOCK_LISTINGS.filter((l) => l.status === 'active')
                  .slice(0, 3)
                  .map((l) => (
                    <li key={l.id} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium text-ink-900">
                            {l.title}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            {l.unit?.unit_number ?? '—'} ·{' '}
                            {l.unit?.rent_amount
                              ? formatCedisDecimal(l.unit.rent_amount) + '/mo'
                              : '—'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-ink-900">{l.view_count}</p>
                          <p className="text-xs text-ink-400">views</p>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge tone={listingStatusTone(l.status)}>{humanize(l.status)}</Badge>
                        {l.featured && <Badge tone="brand">Featured</Badge>}
                      </div>
                    </li>
                  ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
