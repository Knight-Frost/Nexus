/**
 * Typed API surface. Each function encodes one endpoint's request + response
 * shape (including the backend's inconsistent wrapping) so components stay clean.
 *
 * Client routing:
 *   http              — unauthenticated (login, register, public listings)
 *   portalHttp.tenant / .landlord / .admin — portal-scoped authenticated requests
 *   activePortalClient() — for cross-role endpoints (notifications) that always
 *                          run in the context of whichever portal is active in
 *                          this tab; resolved at call time via sessionStorage.
 */
import { http, portalHttp } from './api';
import { type Portal, getActivePortal } from './storage';
import type {
  Admin,
  AppNotification,
  AuditLog,
  AuthResponse,
  Contract,
  Feature,
  LedgerEntry,
  Listing,
  Paginated,
  Property,
  Unit,
  User,
  UserType,
  WeatherData,
} from './types';

/** Returns the active portal's axios instance for endpoints usable by any role. */
function activePortalClient() {
  const p = getActivePortal();
  return p ? portalHttp[p] : http;
}

/* ============================ Auth ====================================== */
export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/login', { email, password });
    return data;
  },
  async register(payload: {
    email: string;
    password: string;
    password_confirmation: string;
    first_name: string;
    last_name: string;
    phone?: string;
    user_type: UserType;
  }): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/register', payload);
    return data;
  },
  async me(portal: Portal): Promise<User | Admin> {
    const { data } = await portalHttp[portal].get<{ user: User | Admin }>('/user');
    return data.user;
  },
  async logout(portal: Portal): Promise<void> {
    await portalHttp[portal].post('/logout');
  },
};

/* ======================= Public listings ================================ */
export const publicApi = {
  async listings(params?: {
    city?: string;
    state?: string;
    min_price?: number;
    max_price?: number;
    bedrooms?: number;
    page?: number;
  }): Promise<Paginated<Listing>> {
    const { data } = await http.get<Paginated<Listing>>('/listings', { params });
    return data;
  },
  async featured(): Promise<Listing[]> {
    const { data } = await http.get<Listing[]>('/listings/featured');
    return data;
  },
  async show(id: number): Promise<Listing> {
    const { data } = await http.get<Listing>(`/listings/${id}`);
    return data;
  },
};

/* ============================ Tenant ==================================== */
export const tenantApi = {
  async dashboard(): Promise<Record<string, unknown>> {
    const { data } = await portalHttp.tenant.get('/tenant/dashboard');
    return data;
  },
  async savedListings(): Promise<Listing[]> {
    const { data } = await portalHttp.tenant.get<Listing[]>('/tenant/saved-listings');
    return data;
  },
  async saveListing(listingId: number): Promise<void> {
    await portalHttp.tenant.post(`/tenant/listings/${listingId}/save`);
  },
  async unsaveListing(listingId: number): Promise<void> {
    await portalHttp.tenant.delete(`/tenant/listings/${listingId}/save`);
  },
  async contracts(): Promise<Contract[]> {
    const { data } = await portalHttp.tenant.get<Contract[]>('/tenant/contracts');
    return data;
  },
  async contract(id: string): Promise<Contract> {
    const { data } = await portalHttp.tenant.get<Contract>(`/tenant/contracts/${id}`);
    return data;
  },
  async acceptContract(id: string): Promise<Contract> {
    const { data } = await portalHttp.tenant.post<{ contract: Contract }>(
      `/tenant/contracts/${id}/accept`,
    );
    return data.contract;
  },
  async terminateContract(id: string, reason: string): Promise<void> {
    await portalHttp.tenant.post(`/tenant/contracts/${id}/terminate`, {
      termination_reason: reason,
    });
  },
  async ledger(): Promise<LedgerEntry[]> {
    const { data } = await portalHttp.tenant.get<LedgerEntry[]>('/tenant/ledger');
    return data;
  },
  async balance(): Promise<{ balance_cents: number; balance_dollars: number }> {
    const { data } = await portalHttp.tenant.get('/tenant/payments/balance');
    return data;
  },
  async initiatePayment(
    ledgerEntryId: string,
  ): Promise<{ client_secret: string; payment_intent_id: string }> {
    const { data } = await portalHttp.tenant.post(
      `/tenant/payments/initiate/${ledgerEntryId}`,
    );
    return data;
  },
};

/* =========================== Landlord =================================== */
export const landlordApi = {
  async onboarding(): Promise<Record<string, unknown>> {
    const { data } = await portalHttp.landlord.get('/landlord/onboarding');
    return data;
  },
  async properties(): Promise<Property[]> {
    const { data } = await portalHttp.landlord.get<Property[]>('/landlord/properties');
    return data;
  },
  async property(id: number): Promise<Property> {
    const { data } = await portalHttp.landlord.get<Property>(`/landlord/properties/${id}`);
    return data;
  },
  async createProperty(payload: Partial<Property>): Promise<Property> {
    const { data } = await portalHttp.landlord.post<{ property: Property }>(
      '/landlord/properties',
      payload,
    );
    return data.property ?? (data as unknown as Property);
  },
  async updateProperty(id: number, payload: Partial<Property>): Promise<Property> {
    const { data } = await portalHttp.landlord.put<{ property: Property }>(
      `/landlord/properties/${id}`,
      payload,
    );
    return data.property ?? (data as unknown as Property);
  },
  async deleteProperty(id: number): Promise<void> {
    await portalHttp.landlord.delete(`/landlord/properties/${id}`);
  },
  async units(): Promise<Unit[]> {
    const { data } = await portalHttp.landlord.get<Unit[]>('/landlord/units');
    return data;
  },
  async createUnit(propertyId: number, payload: Partial<Unit>): Promise<Unit> {
    const { data } = await portalHttp.landlord.post<{ unit: Unit }>(
      `/landlord/properties/${propertyId}/units`,
      payload,
    );
    return data.unit ?? (data as unknown as Unit);
  },
  async updateUnit(id: number, payload: Partial<Unit>): Promise<Unit> {
    const { data } = await portalHttp.landlord.put<{ unit: Unit }>(
      `/landlord/units/${id}`,
      payload,
    );
    return data.unit ?? (data as unknown as Unit);
  },
  async deleteUnit(id: number): Promise<void> {
    await portalHttp.landlord.delete(`/landlord/units/${id}`);
  },
  async listings(): Promise<Listing[]> {
    const { data } = await portalHttp.landlord.get<Listing[]>('/landlord/listings');
    return data;
  },
  async createListing(unitId: number, payload: Partial<Listing>): Promise<Listing> {
    const { data } = await portalHttp.landlord.post<{ listing: Listing }>(
      `/landlord/units/${unitId}/listings`,
      payload,
    );
    return data.listing ?? (data as unknown as Listing);
  },
  async updateListing(id: number, payload: Partial<Listing>): Promise<Listing> {
    const { data } = await portalHttp.landlord.put<{ listing: Listing }>(
      `/landlord/listings/${id}`,
      payload,
    );
    return data.listing ?? (data as unknown as Listing);
  },
  async submitListing(id: number): Promise<void> {
    await portalHttp.landlord.post(`/landlord/listings/${id}/submit`);
  },
  async deleteListing(id: number): Promise<void> {
    await portalHttp.landlord.delete(`/landlord/listings/${id}`);
  },
  async contracts(): Promise<Contract[]> {
    const { data } = await portalHttp.landlord.get<Contract[]>('/landlord/contracts');
    return data;
  },
  async createContract(payload: {
    listing_id: number;
    tenant_id: number;
    rent_amount: number;
    payment_day: number;
    start_date: string;
    end_date: string;
  }): Promise<Contract> {
    const { data } = await portalHttp.landlord.post<{ contract: Contract }>(
      '/landlord/contracts',
      payload,
    );
    return data.contract ?? (data as unknown as Contract);
  },
  async sendContract(id: string): Promise<void> {
    await portalHttp.landlord.post(`/landlord/contracts/${id}/send`);
  },
  async terminateContract(id: string, reason: string): Promise<void> {
    await portalHttp.landlord.post(`/landlord/contracts/${id}/terminate`, {
      termination_reason: reason,
    });
  },
  async ledger(): Promise<LedgerEntry[]> {
    const { data } = await portalHttp.landlord.get<LedgerEntry[]>('/landlord/ledger');
    return data;
  },
};

/* ============================= Admin ==================================== */
export const adminApi = {
  async dashboard(): Promise<Record<string, unknown>> {
    const { data } = await portalHttp.admin.get('/admin/dashboard');
    return data;
  },
  async pendingListings(): Promise<Listing[]> {
    const { data } = await portalHttp.admin.get<Listing[]>('/admin/listings/pending');
    return data;
  },
  async approveListing(id: number): Promise<void> {
    await portalHttp.admin.post(`/admin/listings/${id}/approve`);
  },
  async rejectListing(id: number, reason: string): Promise<void> {
    await portalHttp.admin.post(`/admin/listings/${id}/reject`, { rejection_reason: reason });
  },
  async auditLogs(params?: { page?: number }): Promise<Paginated<AuditLog>> {
    const { data } = await portalHttp.admin.get<Paginated<AuditLog>>('/admin/audit-logs', {
      params,
    });
    return data;
  },
  async contracts(params?: { page?: number }): Promise<Paginated<Contract>> {
    const { data } = await portalHttp.admin.get<Paginated<Contract>>('/admin/contracts', {
      params,
    });
    return data;
  },
  async ledger(params?: { page?: number }): Promise<Paginated<LedgerEntry>> {
    const { data } = await portalHttp.admin.get<Paginated<LedgerEntry>>('/admin/ledger', {
      params,
    });
    return data;
  },
  async landlordFeatures(landlordId: number): Promise<Feature[]> {
    const { data } = await portalHttp.admin.get<Feature[]>(
      `/admin/landlords/${landlordId}/features`,
    );
    return data;
  },
};

/* ========================= Weather ====================================== */
export const weatherApi = {
  /** Public endpoint — no auth required. Returns a WeatherData payload. */
  async current(city = 'Accra'): Promise<WeatherData> {
    const { data } = await http.get<WeatherData>('/weather', { params: { city } });
    return data;
  },
};

/* ========================= Notifications ================================ */
export const notificationApi = {
  async list(params?: { page?: number }): Promise<Paginated<AppNotification>> {
    const { data } = await activePortalClient().get<Paginated<AppNotification>>('/notifications', {
      params,
    });
    return data;
  },
  async unread(): Promise<AppNotification[]> {
    const { data } = await activePortalClient().get<AppNotification[]>('/notifications/unread');
    return data;
  },
  async unreadCount(): Promise<number> {
    const { data } = await activePortalClient().get<{ count: number }>(
      '/notifications/unread-count',
    );
    return data.count ?? 0;
  },
  async markRead(id: string): Promise<void> {
    await activePortalClient().patch(`/notifications/${id}/read`);
  },
  async markAllRead(): Promise<void> {
    await activePortalClient().post('/notifications/mark-all-read');
  },
};
