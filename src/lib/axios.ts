import axios from 'axios';
import { store, type RootState } from '../app/store';
import {
  setCredentials,
  clearCredentials,
  getTokenCookie,
} from '../features/auth/slices/authSlice';

const AUTH_URL = (import.meta.env.VITE_AUTH_URL ?? '').replace(/\/$/, '');
const MAIN_URL = (import.meta.env.VITE_MAIN_URL ?? '').replace(/\/$/, '');

const _AUTH_URL =
  AUTH_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:8001'
    : '');
const _MAIN_URL =
  MAIN_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:8000'
    : '');

const AUTH_PREFIXES = ['/api/v1/auth/', '/api/v1/users/'];

export function resolveBaseURL(path: string): string {
  return AUTH_PREFIXES.some((p) => path.startsWith(p)) ? _AUTH_URL : _MAIN_URL;
}

const api = axios.create({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    if (!config.url) {
      return Promise.reject(
        new Error('[api] Request cancelled: config.url is undefined or empty'),
      );
    }

    config.baseURL = resolveBaseURL(config.url);

    const state = store.getState() as RootState;
    const token = state.auth.token ?? getTokenCookie();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

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
    .post<{ access_token: string }>(`${_AUTH_URL}/api/v1/auth/refresh`, null, {
      withCredentials: true,
    })
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

      if (originalRequest.url) {
        originalRequest.baseURL = resolveBaseURL(originalRequest.url);
      }

      return api(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);

export default api;
