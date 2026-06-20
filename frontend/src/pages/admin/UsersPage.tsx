import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/states';
import { IconUsers, IconCheck, IconLock, IconEye } from '@/components/ui/icons';

/* ---- Mock data ---------------------------------------------------------- */

interface MockUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_type: 'tenant' | 'landlord';
  is_active: boolean;
  identity_verified: boolean;
  created_at: string;
}

const MOCK_USERS: MockUser[] = [
  {
    id: 1,
    first_name: 'Kofi',
    last_name: 'Mensah',
    email: 'kofi.mensah@mail.com',
    user_type: 'landlord',
    is_active: true,
    identity_verified: true,
    created_at: '2026-01-15T09:00:00Z',
  },
  {
    id: 2,
    first_name: 'Ama',
    last_name: 'Owusu',
    email: 'ama.owusu@mail.com',
    user_type: 'tenant',
    is_active: true,
    identity_verified: true,
    created_at: '2026-02-03T11:30:00Z',
  },
  {
    id: 3,
    first_name: 'Kwame',
    last_name: 'Boateng',
    email: 'kwame.boateng@mail.com',
    user_type: 'landlord',
    is_active: true,
    identity_verified: false,
    created_at: '2026-03-10T14:00:00Z',
  },
  {
    id: 4,
    first_name: 'Abena',
    last_name: 'Asante',
    email: 'abena.asante@mail.com',
    user_type: 'tenant',
    is_active: false,
    identity_verified: true,
    created_at: '2026-03-22T08:45:00Z',
  },
  {
    id: 5,
    first_name: 'Yaw',
    last_name: 'Darkwa',
    email: 'yaw.darkwa@mail.com',
    user_type: 'tenant',
    is_active: true,
    identity_verified: false,
    created_at: '2026-04-05T16:00:00Z',
  },
  {
    id: 6,
    first_name: 'Efua',
    last_name: 'Hammond',
    email: 'efua.hammond@mail.com',
    user_type: 'landlord',
    is_active: true,
    identity_verified: true,
    created_at: '2026-05-18T10:15:00Z',
  },
];

/* ---- Filter tabs --------------------------------------------------------- */

type FilterKey = 'all' | 'tenants' | 'landlords' | 'unverified' | 'suspended';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'tenants', label: 'Tenants' },
  { key: 'landlords', label: 'Landlords' },
  { key: 'unverified', label: 'Unverified' },
  { key: 'suspended', label: 'Suspended' },
];

function filterUsers(users: MockUser[], filter: FilterKey): MockUser[] {
  switch (filter) {
    case 'tenants': return users.filter((u) => u.user_type === 'tenant');
    case 'landlords': return users.filter((u) => u.user_type === 'landlord');
    case 'unverified': return users.filter((u) => !u.identity_verified);
    case 'suspended': return users.filter((u) => !u.is_active);
    default: return users;
  }
}

function formatJoined(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ---- Main page ----------------------------------------------------------- */

const ICON = { size: 18 as const };

export function UsersPage() {
  const [filter, setFilter] = useState<FilterKey>('all');
  // Track local overrides for demo actions
  const [suspended, setSuspended] = useState<Set<number>>(new Set());
  const [verified, setVerified] = useState<Set<number>>(new Set());

  const users = MOCK_USERS.map((u) => ({
    ...u,
    is_active: suspended.has(u.id) ? false : u.is_active,
    identity_verified: verified.has(u.id) ? true : u.identity_verified,
  }));

  const visible = filterUsers(users, filter);

  // Stats
  const total = users.length;
  const tenants = users.filter((u) => u.user_type === 'tenant').length;
  const landlords = users.filter((u) => u.user_type === 'landlord').length;
  const unverified = users.filter((u) => !u.identity_verified).length;

  function handleSuspend(id: number) {
    setSuspended((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleVerify(id: number) {
    setVerified((prev) => new Set(prev).add(id));
  }

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Users"
        description="Manage tenants, landlords, and identity verification across the platform."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={total}
          subtext="registered accounts"
          tone="default"
          icon={<IconUsers {...ICON} />}
        />
        <StatCard
          label="Tenants"
          value={tenants}
          subtext="active renters"
          tone="info"
          icon={<IconUsers {...ICON} />}
        />
        <StatCard
          label="Landlords"
          value={landlords}
          subtext="property owners"
          tone="success"
          icon={<IconUsers {...ICON} />}
        />
        <StatCard
          label="Unverified"
          value={unverified}
          subtext={unverified > 0 ? 'awaiting identity check' : 'all verified'}
          tone={unverified > 0 ? 'warning' : 'success'}
          icon={<IconLock {...ICON} />}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 border-b border-ink-200">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={[
              'inline-flex items-center gap-2 mr-6 py-2.5 px-1 text-sm font-medium border-b-2 -mb-px transition-colors',
              filter === tab.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-500 hover:text-ink-800',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<IconUsers />}
          title="No users"
          description="No users match this filter."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Email</TH>
                  <TH>Role</TH>
                  <TH>Verified</TH>
                  <TH>Status</TH>
                  <TH>Joined</TH>
                  <TH>{/* actions */}</TH>
                </TR>
              </THead>
              <TBody>
                {visible.map((user) => (
                  <TR key={user.id}>
                    <TD first>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">
                          {user.first_name[0]}{user.last_name[0]}
                        </span>
                        <span>
                          {user.first_name} {user.last_name}
                        </span>
                      </div>
                    </TD>
                    <TD className="text-ink-500 text-xs">{user.email}</TD>
                    <TD>
                      <Badge tone={user.user_type === 'landlord' ? 'brand' : 'info'} dot={false}>
                        {user.user_type === 'landlord' ? 'Landlord' : 'Tenant'}
                      </Badge>
                    </TD>
                    <TD>
                      {user.identity_verified ? (
                        <Badge tone="success">Verified</Badge>
                      ) : (
                        <Badge tone="warning">Pending</Badge>
                      )}
                    </TD>
                    <TD>
                      {user.is_active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="danger">Suspended</Badge>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-ink-500 text-xs">
                      {formatJoined(user.created_at)}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<IconEye size={14} />}
                        >
                          View
                        </Button>
                        {!user.identity_verified && (
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<IconCheck size={14} />}
                            onClick={() => handleVerify(user.id)}
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          variant={user.is_active ? 'danger' : 'secondary'}
                          size="sm"
                          leftIcon={<IconLock size={14} />}
                          onClick={() => handleSuspend(user.id)}
                        >
                          {user.is_active ? 'Suspend' : 'Reinstate'}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
