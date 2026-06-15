import type { Role } from '@/lib/types';
import {
  IconBell,
  IconBuilding,
  IconDashboard,
  IconDoc,
  IconHeart,
  IconHome,
  IconLedger,
  IconSearch,
  IconShield,
  IconUsers,
} from '@/components/ui/icons';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const ICON = { className: 'h-[18px] w-[18px]' };

const NAV: Record<Role, NavItem[]> = {
  tenant: [
    { to: '/app', label: 'Dashboard', icon: <IconDashboard {...ICON} />, end: true },
    { to: '/app/browse', label: 'Browse', icon: <IconSearch {...ICON} /> },
    { to: '/app/saved', label: 'Saved', icon: <IconHeart {...ICON} /> },
    { to: '/app/contracts', label: 'Contracts', icon: <IconDoc {...ICON} /> },
    { to: '/app/ledger', label: 'Payments', icon: <IconLedger {...ICON} /> },
    { to: '/app/notifications', label: 'Notifications', icon: <IconBell {...ICON} /> },
  ],
  landlord: [
    { to: '/app', label: 'Dashboard', icon: <IconDashboard {...ICON} />, end: true },
    { to: '/app/properties', label: 'Properties', icon: <IconBuilding {...ICON} /> },
    { to: '/app/listings', label: 'Listings', icon: <IconHome {...ICON} /> },
    { to: '/app/contracts', label: 'Contracts', icon: <IconDoc {...ICON} /> },
    { to: '/app/ledger', label: 'Ledger', icon: <IconLedger {...ICON} /> },
    { to: '/app/notifications', label: 'Notifications', icon: <IconBell {...ICON} /> },
  ],
  admin: [
    { to: '/app', label: 'Dashboard', icon: <IconDashboard {...ICON} />, end: true },
    { to: '/app/moderation', label: 'Moderation', icon: <IconShield {...ICON} /> },
    { to: '/app/contracts', label: 'Contracts', icon: <IconDoc {...ICON} /> },
    { to: '/app/ledger', label: 'Ledger', icon: <IconLedger {...ICON} /> },
    { to: '/app/audit', label: 'Audit Logs', icon: <IconUsers {...ICON} /> },
  ],
};

export function navForRole(role: Role): NavItem[] {
  return NAV[role] ?? [];
}

export const roleLabel: Record<Role, string> = {
  tenant: 'Tenant',
  landlord: 'Landlord',
  admin: 'Administrator',
};
