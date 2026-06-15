import { Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth, RequireRole, RedirectIfAuthed } from '@/components/routing/guards';

import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { NotFound } from '@/pages/NotFound';

import { DashboardRouter } from '@/pages/DashboardRouter';
import { BrowseListings } from '@/pages/tenant/BrowseListings';
import { ListingDetail } from '@/pages/ListingDetail';
import { SavedListings } from '@/pages/tenant/SavedListings';
import { Properties } from '@/pages/landlord/Properties';
import { PropertyDetail } from '@/pages/landlord/PropertyDetail';
import { LandlordListings } from '@/pages/landlord/LandlordListings';
import { Moderation } from '@/pages/admin/Moderation';
import { AuditLogs } from '@/pages/admin/AuditLogs';
import { ContractsPage } from '@/pages/shared/ContractsPage';
import { ContractDetail } from '@/pages/shared/ContractDetail';
import { LedgerPage } from '@/pages/shared/LedgerPage';
import { Notifications } from '@/pages/shared/Notifications';

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
        <Route index element={<DashboardRouter />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="listing/:id" element={<ListingDetail />} />

        {/* Tenant */}
        <Route
          path="browse"
          element={
            <RequireRole roles={['tenant']}>
              <BrowseListings />
            </RequireRole>
          }
        />
        <Route
          path="saved"
          element={
            <RequireRole roles={['tenant']}>
              <SavedListings />
            </RequireRole>
          }
        />

        {/* Landlord */}
        <Route
          path="properties"
          element={
            <RequireRole roles={['landlord']}>
              <Properties />
            </RequireRole>
          }
        />
        <Route
          path="properties/:id"
          element={
            <RequireRole roles={['landlord']}>
              <PropertyDetail />
            </RequireRole>
          }
        />
        <Route
          path="listings"
          element={
            <RequireRole roles={['landlord']}>
              <LandlordListings />
            </RequireRole>
          }
        />

        {/* Admin */}
        <Route
          path="moderation"
          element={
            <RequireRole roles={['admin']}>
              <Moderation />
            </RequireRole>
          }
        />
        <Route
          path="audit"
          element={
            <RequireRole roles={['admin']}>
              <AuditLogs />
            </RequireRole>
          }
        />

        {/* Shared (role-branching inside) */}
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="contracts/:id" element={<ContractDetail />} />
        <Route path="ledger" element={<LedgerPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
