import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCurrentUser, logout as apiLogout, type CurrentUser } from './api/languageTools';
import { accountUrl } from './config';

// Who is signed in. Login itself happens on the main site, which sets the API's auth cookies for
// the whole domain; this app only reads the current user and sends people there and back.
interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  // Admins and dictionary writers manage the language tools. Pages still decide per item from the
  // API's links, which also cover ownership of meaning dictionaries.
  canManage: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  canManage: false,
  login: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(setUser).finally(() => setLoading(false));
  }, []);

  const login = useCallback(() => { window.location.href = accountUrl('/account/login'); }, []);

  const logout = useCallback(async () => {
    try { await apiLogout(); } catch { /* cookies may already be gone */ }
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    canManage: !!user && (user.isSuperAdmin || user.isDictionaryWriter),
    login,
    logout,
  }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
