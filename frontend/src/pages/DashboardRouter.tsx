import { useAuth } from '@/context/auth';
import { TenantDashboard } from '@/pages/tenant/TenantDashboard';
import { LandlordDashboard } from '@/pages/landlord/LandlordDashboard';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';

/** Renders the dashboard matching the authenticated user's role. */
export function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;
  switch (user.role) {
    case 'tenant':
      return <TenantDashboard />;
    case 'landlord':
      return <LandlordDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return null;
  }
}
