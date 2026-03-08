import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/ui/sonner';

type LogoutOptions = {
  message?: string;
  clearLocal?: boolean;
};

export function useAuth() {
  const { t } = useTranslation();
  const [user, setUser] = useState<string | null>(null);
  const [loginBannerVisible, setLoginBannerVisible] = useState(() => {
    return !sessionStorage.getItem('loginBannerDismissed');
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) {
      setUser(username);
    }
  }, []);

  const handleLoginSuccess = useCallback((username: string) => {
    setUser(username);
  }, []);

  const handleLogout = useCallback((input?: string | LogoutOptions | React.MouseEvent | React.TouchEvent) => {
    const options = typeof input === 'string' ? { message: input } : (input as LogoutOptions | undefined);
    if (typeof input !== 'string') {
        const isOffline = !navigator.onLine;
        const hasPendingSync = localStorage.getItem('leaf_tab_sync_pending');
        if (isOffline || hasPendingSync) {
             if (!window.confirm(t('user.logoutOfflineWarning'))) return;
        }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('leaf_tab_sync_pending');
    localStorage.removeItem('leaf_tab_shortcuts_cache');
    localStorage.removeItem('cloud_shortcuts_fetched_at');
    if (options?.clearLocal) {
      localStorage.removeItem('local_shortcuts_v3');
      localStorage.removeItem('local_shortcuts');
      localStorage.removeItem('local_shortcuts_updated_at');
      localStorage.removeItem('scenario_modes_v1');
      localStorage.removeItem('scenario_selected_v1');
    }
    
    setUser(null);
    const logoutMsg = options?.message || (typeof input === 'string' ? input : t('user.loggedOut'));
    toast.success(logoutMsg);
  }, [t]);

  return {
    user,
    setUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginBannerVisible,
    setLoginBannerVisible,
    handleLoginSuccess,
    handleLogout,
  };
}
