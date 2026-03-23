import axios from 'axios';
import { store, type RootState } from '../app/store';
import { setCredentials, clearCredentials, parseJwt } from '../features/auth/slices/authSlice';

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL ?? '').replace(/\/$/, '');

export const _GATEWAY_URL =
  GATEWAY_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:8080'
    : 'https://iclinic-api-gateway-717740758627.us-east1.run.app');

const api = axios.create({
  baseURL: _GATEWAY_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    if (!config.url) {
      return Promise.reject(new Error('[api] Request cancelled: config.url is undefined'));
    }
    const isSkipped = (config as any)._skipAuth === true;
    if (!isSkipped) {
      const state = store.getState() as RootState;
      const token = state.auth.token;
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let refreshPromise: Promise<string> | null = null;
let lastRefreshTime = 0;
const REFRESH_DEDUPE_MS = 10_000;

export async function doRefresh(): Promise<string> {
  const now = Date.now();
  if (now - lastRefreshTime < REFRESH_DEDUPE_MS) {
    const currentToken = (store.getState() as RootState).auth.token;
    if (currentToken) return currentToken;
  }

  if (refreshPromise) return refreshPromise;

  refreshPromise = api
    .post<{ access_token: string }>('/api/v1/auth/refresh', null, {
      ...({ _skipAuth: true } as any),
    })
    .then((res) => {
      const newToken = res.data.access_token;
      const payload = parseJwt(newToken);
      lastRefreshTime = Date.now();
      store.dispatch(
        setCredentials({
          token: newToken,
          user: {
            id: (payload?.id as number) ?? 0,
            email: (payload?.email as string) ?? '',
            name: (payload?.name as string) ?? '',
            role_id: (payload?.role_id as number) ?? 0,
            phone_number: (payload?.phone_number as string) ?? '',
          },
        }),
      );
      return newToken;
    })
    .finally(() => { refreshPromise = null; });

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const is401 = error.response?.status === 401;
    const alreadyRetried = originalRequest?._retry === true;
    const isAuthEndpoint =
      originalRequest?.url?.includes('/api/v1/auth/login') ||
      originalRequest?.url?.includes('/api/v1/auth/refresh') ||
      originalRequest?.url?.includes('/api/v1/auth/verify');

    if (!is401 || alreadyRetried || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newToken = await doRefresh();
      originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newToken}` };
      return api(originalRequest);
    } catch {
      store.dispatch(clearCredentials());
      setTimeout(() => { window.location.href = '/login'; }, 100);
      return Promise.reject(error);
    }
  },
);

export default api;
