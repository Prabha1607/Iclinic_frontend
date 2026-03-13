import axios from 'axios'
import { store, type RootState } from '../app/store'
import { setCredentials, clearCredentials, getTokenCookie } from '../features/auth/slices/authSlice'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ── Attach access token to every request ─────────────────────────────────────
api.interceptors.request.use((config) => {
  const state = store.getState() as RootState
  // Prefer in-memory store token; fall back to cookie on first load after refresh
  const token = state.auth.token ?? getTokenCookie()
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// ── Token refresh with queue (prevents duplicate refresh calls) ───────────────
let refreshPromise: Promise<string> | null = null

async function doRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise
  refreshPromise = axios
    .post<{ access_token: string }>(
      `${BASE_URL}/api/v1/auth/refresh`,
      null,
      { withCredentials: true }
    )
    .then((res) => {
      const newToken = res.data.access_token
      const s = store.getState() as RootState
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
        })
      )
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      return newToken
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

// ── Response interceptor — handle 401 with token rotation ────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Don't attempt refresh for auth endpoints or already-retried requests
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/')
    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const newToken = await doRefresh()
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newToken}`,
      }
      return api(originalRequest)
    } catch (refreshError) {
      store.dispatch(clearCredentials())
      window.location.href = '/login'
      return Promise.reject(refreshError)
    }
  }
)

export default api
