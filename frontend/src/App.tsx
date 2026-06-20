import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth, RequireRole, RedirectIfAuthed } from '@/components/routing/guards';

import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { NotFound } from '@/pages/NotFound';
import { DashboardRouter } from '@/pages/DashboardRouter';

/* ---- Lazy page imports --------------------------------------------------- */

// Tenant
const BrowseListings    = lazy(() => import('@/pages/tenant/BrowseListings').then((m) => ({ default: m.BrowseListings })));
const ListingDetail     = lazy(() => import('@/pages/ListingDetail').then((m) => ({ default: m.ListingDetail })));
const SavedListings     = lazy(() => import('@/pages/tenant/SavedListings').then((m) => ({ default: m.SavedListings })));
const ApplicationsPage  = lazy(() => import('@/pages/tenant/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage })));
const PaymentsPage      = lazy(() => import('@/pages/tenant/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const MaintenancePage   = lazy(() => import('@/pages/tenant/MaintenancePage').then((m) => ({ default: m.MaintenancePage })));

// Landlord
const Properties        = lazy(() => import('@/pages/landlord/Properties').then((m) => ({ default: m.Properties })));
const PropertyDetail    = lazy(() => import('@/pages/landlord/PropertyDetail').then((m) => ({ default: m.PropertyDetail })));
const LandlordListings  = lazy(() => import('@/pages/landlord/LandlordListings').then((m) => ({ default: m.LandlordListings })));
const Applicants        = lazy(() => import('@/pages/landlord/Applicants').then((m) => ({ default: m.Applicants })));
const TenantManagement  = lazy(() => import('@/pages/landlord/TenantManagement').then((m) => ({ default: m.TenantManagement })));

// Admin
const Moderation        = lazy(() => import('@/pages/admin/Moderation').then((m) => ({ default: m.Moderation })));
const AuditLogs         = lazy(() => import('@/pages/admin/AuditLogs').then((m) => ({ default: m.AuditLogs })));
const UsersPage         = lazy(() => import('@/pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })));

// Shared
const ContractsPage     = lazy(() => import('@/pages/shared/ContractsPage').then((m) => ({ default: m.ContractsPage })));
const ContractDetail    = lazy(() => import('@/pages/shared/ContractDetail').then((m) => ({ default: m.ContractDetail })));
const LedgerPage        = lazy(() => import('@/pages/shared/LedgerPage').then((m) => ({ default: m.LedgerPage })));
const Notifications     = lazy(() => import('@/pages/shared/Notifications').then((m) => ({ default: m.Notifications })));
const ProfilePage       = lazy(() => import('@/pages/shared/ProfilePage').then((m) => ({ default: m.ProfilePage })));

/* ---- Inline placeholder for routes not yet implemented ------------------- */
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-xl border border-brand-200 bg-brand-50 px-10 py-8 dark:border-brand-800 dark:bg-brand-950">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Coming soon
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink-900 dark:text-ink-50">{label}</h2>
        <p className="mt-2 max-w-xs text-sm text-ink-500 dark:text-ink-400">
          This feature is under development and will be available in a future update.
        </p>
      </div>
    </div>
  );
}

/* ---- Suspense wrapper ---------------------------------------------------- */
function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

/* ---- App ----------------------------------------------------------------- */

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthed>
            <Register />
          </RedirectIfAuthed>
        }
      />

      {/* Authenticated app */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        {/* Dashboard — role-switched inline (no lazy; small, always needed) */}
        <Route index element={<DashboardRouter />} />

        {/* Shared / any authenticated role */}
        <Route
          path="notifications"
          element={<Lazy><Notifications /></Lazy>}
        />
        <Route
          path="listing/:id"
          element={<Lazy><ListingDetail /></Lazy>}
        />
        <Route
          path="contracts"
          element={<Lazy><ContractsPage /></Lazy>}
        />
        <Route
          path="contracts/:id"
          element={<Lazy><ContractDetail /></Lazy>}
        />
        <Route
          path="ledger"
          element={<Lazy><LedgerPage /></Lazy>}
        />
        <Route
          path="profile"
          element={<Lazy><ProfilePage /></Lazy>}
        />

        {/* Tenant-only */}
        <Route
          path="browse"
          element={
            <RequireRole roles={['tenant']}>
              <Lazy><BrowseListings /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="saved"
          element={
            <RequireRole roles={['tenant']}>
              <Lazy><SavedListings /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="applications"
          element={
            <RequireRole roles={['tenant']}>
              <Lazy><ApplicationsPage /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="payments"
          element={
            <RequireRole roles={['tenant']}>
              <Lazy><PaymentsPage /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="maintenance"
          element={
            <RequireRole roles={['tenant', 'landlord']}>
              <Lazy><MaintenancePage /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="compare"
          element={
            <RequireRole roles={['tenant']}>
              <ComingSoon label="Compare Listings" />
            </RequireRole>
          }
        />

        {/* Landlord-only */}
        <Route
          path="properties"
          element={
            <RequireRole roles={['landlord']}>
              <Lazy><Properties /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="properties/:id"
          element={
            <RequireRole roles={['landlord']}>
              <Lazy><PropertyDetail /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="listings"
          element={
            <RequireRole roles={['landlord']}>
              <Lazy><LandlordListings /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="applicants"
          element={
            <RequireRole roles={['landlord']}>
              <Lazy><Applicants /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="tenants"
          element={
            <RequireRole roles={['landlord']}>
              <Lazy><TenantManagement /></Lazy>
            </RequireRole>
          }
        />

        {/* Landlord-or-admin */}
        <Route
          path="analytics"
          element={
            <RequireRole roles={['landlord', 'admin']}>
              <ComingSoon label="Analytics" />
            </RequireRole>
          }
        />

        {/* Admin-only */}
        <Route
          path="moderation"
          element={
            <RequireRole roles={['admin']}>
              <Lazy><Moderation /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="audit"
          element={
            <RequireRole roles={['admin']}>
              <Lazy><AuditLogs /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="users"
          element={
            <RequireRole roles={['admin']}>
              <Lazy><UsersPage /></Lazy>
            </RequireRole>
          }
        />
        <Route
          path="disputes"
          element={
            <RequireRole roles={['admin']}>
              <ComingSoon label="Disputes" />
            </RequireRole>
          }
        />
        <Route
          path="risk"
          element={
            <RequireRole roles={['admin']}>
              <ComingSoon label="Risk Alerts" />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
