import axios from 'axios';
import { store, type RootState } from '../app/store';
import {
  setCredentials,
  clearCredentials,
  getTokenCookie,
} from '../features/auth/slices/authSlice';

// ── Base URLs ──────────────────────────────────────────────────────────────────
// All traffic goes through the API gateway (single entry point)
const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL ?? '').replace(/\/$/, '');

const _GATEWAY_URL =
  GATEWAY_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:8080'          // local: run gateway locally or use direct service ports
    : 'https://iclinic-api-gateway-717740758627.us-east1.run.app');

// ── Axios instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: _GATEWAY_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach Bearer token ───────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (!config.url) {
      return Promise.reject(
        new Error('[api] Request cancelled: config.url is undefined or empty'),
      );
    }

    const state = store.getState() as RootState;
    const token = state.auth.token ?? getTokenCookie();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Token refresh ──────────────────────────────────────────────────────────────
let refreshPromise: Promise<string> | null = null;

function forceLogout() {
  store.dispatch(clearCredentials());
  setTimeout(() => {
    window.location.href = '/login';
  }, 100);
}

async function doRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post<{ access_token: string }>(
      `${_GATEWAY_URL}/api/v1/auth/refresh`,
      null,
      { withCredentials: true },  // sends refresh_token cookie automatically
    )
    .then((res) => {
      const newToken = res.data.access_token;

      const s = store.getState() as RootState;
      store.dispatch(
        setCredentials({
          token: newToken,
          user: {
            id: s.auth.userId ?? 0,
            email: '',
            name: '',
            role_id: s.auth.roleId ?? 0,
            phone_number: '',
          },
        }),
      );

      return newToken;
    })
    .catch((err) => {
      forceLogout();
      return Promise.reject(err);
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// ── Response interceptor: handle 401 → refresh → retry ────────────────────────
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint = originalRequest?.url?.includes('/api/v1/auth/');
    const alreadyRetried = originalRequest?._retry === true;
    const is401 = error.response?.status === 401;

    if (!is401 || alreadyRetried || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newToken = await doRefresh();
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newToken}`,
      };
      return api(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);

export default api;