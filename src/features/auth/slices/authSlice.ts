import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState } from '../../../common/DataModels/User';

// Token is HttpOnly now — JS cannot read it from cookie.
// We keep the token ONLY in Redux memory (populated from login/refresh response body).
// On hard reload, token is gone from Redux but the HttpOnly cookie is still sent by
// the browser. The first protected API call will 401 → doRefresh() → new access_token
// comes back in the response body → Redux is repopulated.

export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

// Kept for backward compat but always returns null now (cookie is HttpOnly)
export function getTokenCookie(): string | null {
  return null;
}

function buildInitialState(): AuthState {
  // Can't read HttpOnly cookie — start unauthenticated.
  // The axios response interceptor will refresh on first 401.
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
      // No cookie write — gateway sets HttpOnly cookies server-side
    },
    clearCredentials(state) {
      state.token = null;
      state.isAuthenticated = false;
      state.userId = null;
      state.roleId = null;
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
