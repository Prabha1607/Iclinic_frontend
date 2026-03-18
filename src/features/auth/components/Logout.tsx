import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../../hooks/hooks';
import { clearCredentials } from '../slices/authSlice';
import api from '../../../lib/axios';

export default function Logout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleOnClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);

    dispatch(clearCredentials());

    try {
      await api.get('/api/v1/auth/logout', { validateStatus: () => true });
    } catch {
    } finally {
      setIsLoading(false);
      navigate('/login');
    }
  };

  return (
    <button
      onClick={handleOnClick}
      disabled={isLoading}
      className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-red-500 border border-blue-200 hover:border-red-300 bg-white hover:bg-red-50 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
    >
      {isLoading ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      )}
      {isLoading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
