import type { Role } from '@/lib/types';
import {
  IconActivity,
  IconAlertTriangle,
  IconBarChart,
  IconBell,
  IconBuilding,
  IconCompare,
  IconDashboard,
  IconDoc,
  IconFolder,
  IconGrid,
  IconHeart,
  IconHome,
  IconLedger,
  IconMessage,
  IconScale,
  IconSearch,
  IconShield,
  IconUsers,
  IconWallet,
  IconWrench,
} from '@/components/ui/icons';

const ICON = { size: 18 as const };

export interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  badge?: number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/* ---- Grouped nav definitions ------------------------------------------- */

const TENANT_GROUPS: NavGroup[] = [
  {
    title: 'Find a Home',
    items: [
      { to: '/app', label: 'Dashboard', icon: <IconDashboard {...ICON} />, end: true },
      { to: '/app/browse', label: 'Browse Homes', icon: <IconSearch {...ICON} /> },
      { to: '/app/saved', label: 'Saved Homes', icon: <IconHeart {...ICON} /> },
      { to: '/app/compare', label: 'Compare', icon: <IconCompare {...ICON} /> },
    ],
  },
  {
    title: 'My Rental',
    items: [
      { to: '/app/applications', label: 'Applications', icon: <IconDoc {...ICON} /> },
      { to: '/app/contracts', label: 'Lease & Rent', icon: <IconScale {...ICON} /> },
      { to: '/app/payments', label: 'Payments', icon: <IconWallet {...ICON} /> },
      { to: '/app/maintenance', label: 'Maintenance', icon: <IconWrench {...ICON} /> },
    ],
  },
  {
    title: 'Communicate',
    items: [
      { to: '/app/messages', label: 'Messages', icon: <IconMessage {...ICON} /> },
      { to: '/app/documents', label: 'Documents', icon: <IconFolder {...ICON} /> },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/app/notifications', label: 'Notifications', icon: <IconBell {...ICON} /> },
      { to: '/app/profile', label: 'Profile', icon: <IconGrid {...ICON} /> },
    ],
  },
];

const LANDLORD_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { to: '/app', label: 'Dashboard', icon: <IconDashboard {...ICON} />, end: true },
      { to: '/app/properties', label: 'Properties', icon: <IconBuilding {...ICON} /> },
      { to: '/app/listings', label: 'Listings', icon: <IconHome {...ICON} /> },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/app/applicants', label: 'Applicants', icon: <IconUsers {...ICON} /> },
      { to: '/app/tenants', label: 'Tenants', icon: <IconGrid {...ICON} /> },
      { to: '/app/ledger', label: 'Rent', icon: <IconLedger {...ICON} /> },
      { to: '/app/maintenance', label: 'Maintenance', icon: <IconWrench {...ICON} /> },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { to: '/app/analytics', label: 'Analytics', icon: <IconBarChart {...ICON} /> },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/app/notifications', label: 'Notifications', icon: <IconBell {...ICON} /> },
      { to: '/app/profile', label: 'Profile', icon: <IconGrid {...ICON} /> },
    ],
  },
];

const ADMIN_GROUPS: NavGroup[] = [
  {
    title: 'Platform',
    items: [
      { to: '/app', label: 'Overview', icon: <IconDashboard {...ICON} />, end: true },
      { to: '/app/moderation', label: 'Listing Review', icon: <IconShield {...ICON} /> },
      { to: '/app/users', label: 'Users', icon: <IconUsers {...ICON} /> },
    ],
  },
  {
    title: 'Governance',
    items: [
      { to: '/app/disputes', label: 'Disputes', icon: <IconAlertTriangle {...ICON} /> },
      { to: '/app/ledger', label: 'Ledger', icon: <IconLedger {...ICON} /> },
      { to: '/app/risk', label: 'Risk Alerts', icon: <IconAlertTriangle {...ICON} /> },
    ],
  },
  {
    title: 'Insight',
    items: [
      { to: '/app/audit', label: 'Audit Logs', icon: <IconActivity {...ICON} /> },
      { to: '/app/analytics', label: 'Analytics', icon: <IconBarChart {...ICON} /> },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/app/notifications', label: 'Notifications', icon: <IconBell {...ICON} /> },
    ],
  },
];

const NAV_GROUPS: Record<Role, NavGroup[]> = {
  tenant:   TENANT_GROUPS,
  landlord: LANDLORD_GROUPS,
  admin:    ADMIN_GROUPS,
};

/* ---- Exports ------------------------------------------------------------- */

/** Grouped navigation for the sidebar. */
export function navForRole(role: Role): NavGroup[] {
  return NAV_GROUPS[role] ?? [];
}

/** Flat list of all nav items for a role. */
export function navItemsForRole(role: Role): NavItem[] {
  return navForRole(role).flatMap((g) => g.items);
}

/** Up to 5 items for the mobile bottom nav bar. */
export function mobileNavItems(role: Role): NavItem[] {
  const all = navItemsForRole(role);
  // Always include the dashboard first, then key items, finish with notifications
  const notif = all.find((i) => i.to === '/app/notifications');
  const rest = all.filter((i) => i.to !== '/app/notifications').slice(0, 4);
  const items = notif ? [...rest, notif] : rest;
  return items.slice(0, 5);
}

export const roleLabel: Record<Role, string> = {
  tenant:   'Tenant',
  landlord: 'Landlord',
  admin:    'Administrator',
};
