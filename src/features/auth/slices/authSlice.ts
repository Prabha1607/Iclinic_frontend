import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState } from '../../../common/DataModels/User';

const COOKIE_NAME = 'app_token';

export function getTokenCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)app_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setTokenCookie(token: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Lax`;
}

function clearTokenCookie() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

function buildInitialState(): AuthState {
  const token = getTokenCookie();
  if (token) {
    const payload = parseJwt(token);
    if (payload) {
      const exp = payload.exp as number | undefined;
      if (!exp || exp * 1000 > Date.now()) {
        return {
          token,
          isAuthenticated: true,
          userId: (payload.id as number) ?? null,
          roleId: (payload.role_id as number) ?? null,
        };
      }
      clearTokenCookie();
    }
  }
  return { token: null, isAuthenticated: false, userId: null, roleId: null };
}

type SetCredentialsPayload = {
  token: string | null;
  user: {
    id: number;
    email: string;
    name: string;
    role_id: number;
    phone_number: string;
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: buildInitialState(),
  reducers: {
    setCredentials(state, action: PayloadAction<SetCredentialsPayload>) {
      const { token, user } = action.payload;
      state.token = token;
      state.isAuthenticated = true;
      state.userId = user?.id ?? null;
      state.roleId = user?.role_id ?? null;
      if (token) setTokenCookie(token);
    },
    clearCredentials(state) {
      state.token = null;
      state.isAuthenticated = false;
      state.userId = null;
      state.roleId = null;
      clearTokenCookie();
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
