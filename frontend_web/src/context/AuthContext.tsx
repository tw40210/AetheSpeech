import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AppConstants } from '../core/constants';
import { apiClient } from '../services/apiClient';
import type { TokenResponse } from '../core/types';

interface AuthContextValue {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(AppConstants.tokenKey),
  );
  const [email, setEmail] = useState<string | null>(
    () => localStorage.getItem(AppConstants.userEmailKey),
  );
  const [loading, setLoading] = useState(false);

  // Keep apiClient in sync whenever the token changes
  useEffect(() => {
    apiClient.setToken(token);
  }, [token]);

  const persist = useCallback((newToken: string | null, newEmail: string | null) => {
    setToken(newToken);
    setEmail(newEmail);
    if (newToken) {
      localStorage.setItem(AppConstants.tokenKey, newToken);
      localStorage.setItem(AppConstants.userEmailKey, newEmail ?? '');
    } else {
      localStorage.removeItem(AppConstants.tokenKey);
      localStorage.removeItem(AppConstants.userEmailKey);
    }
    apiClient.setToken(newToken);
  }, []);

  const login = useCallback(
    async (emailVal: string, password: string) => {
      setLoading(true);
      try {
        const data = await apiClient.post<TokenResponse>('/auth/login', {
          email: emailVal,
          password,
        });
        persist(data.access_token, emailVal);
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  const register = useCallback(
    async (emailVal: string, password: string) => {
      setLoading(true);
      try {
        const data = await apiClient.post<TokenResponse>('/auth/register', {
          email: emailVal,
          password,
        });
        persist(data.access_token, emailVal);
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  return (
    <AuthContext.Provider
      value={{ token, email, isAuthenticated: !!token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
