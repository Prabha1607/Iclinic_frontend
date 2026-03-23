import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks/hooks';
import { setCredentials, parseJwt } from '../features/auth/slices/authSlice';
import api, { doRefresh } from '../lib/axios';

const REFRESH_BUFFER_MS = 60_000;

function useProactiveRefresh(token: string | null) {
  useEffect(() => {
    if (!token) return;
    let exp: number | null = null;
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(b64));
      exp = typeof payload.exp === 'number' ? payload.exp : null;
    } catch { return; }
    if (!exp) return;
    const msUntilRefresh = exp * 1000 - Date.now() - REFRESH_BUFFER_MS;
    if (msUntilRefresh <= 0) { doRefresh().catch(() => {}); return; }
    const timer = setTimeout(() => { doRefresh().catch(() => {}); }, msUntilRefresh);
    return () => clearTimeout(timer);
  }, [token]);
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const token = useAppSelector((state) => state.auth.token);
  const attempted = useRef(false);
  const [authResult, setAuthResult] = useState<boolean | null>(
    isAuthenticated ? true : null
  );

  useProactiveRefresh(token);

  useEffect(() => {
    if (isAuthenticated) {
      setAuthResult(true);
      return;
    }

    if (attempted.current) return;
    attempted.current = true;

    api
      .get<{
        access_token: string;
        user: { id: number; email: string; name: string; role_id: number; phone_number: string };
      }>('/api/v1/auth/verify')
      .then((res) => {
        const t = res.data.access_token;
        const u = res.data.user;
        const jwt = parseJwt(t);
        dispatch(setCredentials({
          token: t,
          user: {
            id: u?.id ?? (jwt?.id as number) ?? 0,
            email: u?.email ?? (jwt?.email as string) ?? '',
            name: u?.name ?? (jwt?.name as string) ?? '',
            role_id: u?.role_id ?? (jwt?.role_id as number) ?? 0,
            phone_number: u?.phone_number ?? (jwt?.phone_number as string) ?? '',
          },
        }));
        setAuthResult(true);
      })
      .catch(() => {
        doRefresh()
          .then(() => setAuthResult(true))
          .catch(() => setAuthResult(false));
      });
  }, [isAuthenticated, dispatch]);

  if (authResult === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faff]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Restoring session...</p>
        </div>
      </div>
    );
  }

  if (!authResult) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
