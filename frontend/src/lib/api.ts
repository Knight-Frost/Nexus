/**
 * HTTP client. A single axios instance with:
 *  - bearer-token injection from storage
 *  - error normalization to a typed ApiError (so UI never inspects raw axios)
 *  - a 401 hook the AuthContext registers, to log the user out on token expiry
 *
 * Per-endpoint functions below encode the (inconsistent) backend response
 * shapes once, so components always receive clean, typed data.
 */
import axios, { AxiosError, type AxiosInstance } from 'axios';
import { getToken } from './storage';
import type { ApiError } from './types';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const http: AxiosInstance = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** AuthContext registers a handler so expired tokens trigger a clean logout. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(normalizeError(error));
  },
);

export function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;
    return {
      status,
      message:
        data?.message ||
        (status === 0
          ? 'Cannot reach the server. Check your connection and try again.'
          : 'Something went wrong. Please try again.'),
      errors: data?.errors,
    };
  }
  return { status: 0, message: 'An unexpected error occurred.' };
}

/** Best-effort flat list of field errors for inline form display. */
export function fieldErrors(error: ApiError): Record<string, string> {
  const flat: Record<string, string> = {};
  if (error.errors) {
    for (const [key, msgs] of Object.entries(error.errors)) {
      if (msgs?.length) flat[key] = msgs[0];
    }
  }
  return flat;
}
