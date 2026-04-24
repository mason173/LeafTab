import React, { useMemo, useState } from 'react';
import { RiEyeFill, RiEyeOffFill } from "@/icons/ri-compat";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from 'react-i18next';
import { normalizeApiBase } from "@/utils";
import googleIcon from '@/assets/google.svg';

const FIRST_LOGIN_LOCAL_FIRST_KEY = 'leaftab_force_local_sync_after_first_login_user';
const OFFICIAL_GOOGLE_OAUTH_CLIENT_ID = '352087600211-6cu9ot6j7n16927c9blblpcotnimfel2.apps.googleusercontent.com';
const OFFICIAL_EXTENSION_RUNTIME_IDS = {
  store: 'lfogogokkkpmolbfbklchcbgdiboccdf',
  community: 'plnjjlkaaonbccmjpfljbbbbaahfklem',
} as const;
const OFFICIAL_GOOGLE_EXTENSION_REDIRECT_URIS_BY_RUNTIME_ID: Record<string, string> = {
  [OFFICIAL_EXTENSION_RUNTIME_IDS.store]: `https://${OFFICIAL_EXTENSION_RUNTIME_IDS.store}.chromiumapp.org/`,
  [OFFICIAL_EXTENSION_RUNTIME_IDS.community]: `https://${OFFICIAL_EXTENSION_RUNTIME_IDS.community}.chromiumapp.org/`,
};
const OFFICIAL_GOOGLE_EXTENSION_REDIRECT_URIS = Object.values(OFFICIAL_GOOGLE_EXTENSION_REDIRECT_URIS_BY_RUNTIME_ID);
const OFFICIAL_GOOGLE_WEB_REDIRECT_URI = 'https://www.leaftab.cc/google-auth-callback.html';
const GOOGLE_WEB_CALLBACK_PATH = '/google-auth-callback.html';
const GOOGLE_OAUTH_SCOPE = 'openid email profile';

const readEnv = (key: string) => {
  if (typeof import.meta === 'undefined') return '';
  const envValue = (import.meta as any).env?.[key];
  return envValue ? String(envValue).trim() : '';
};

const resolveExtensionGoogleClientId = () => {
  const fromEnv = readEnv('VITE_GOOGLE_OAUTH_CLIENT_ID');
  if (fromEnv) return fromEnv;
  return OFFICIAL_GOOGLE_OAUTH_CLIENT_ID;
};

const resolveWebGoogleClientId = () => {
  const webClientId = readEnv('VITE_GOOGLE_WEB_OAUTH_CLIENT_ID');
  if (webClientId) return webClientId;
  return '';
};

const resolveWebGoogleRedirectUri = (isExtensionPage: boolean) => {
  const fromEnv = readEnv('VITE_GOOGLE_WEB_OAUTH_REDIRECT_URI');
  if (fromEnv) return fromEnv;
  if (isExtensionPage) return OFFICIAL_GOOGLE_WEB_REDIRECT_URI;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${GOOGLE_WEB_CALLBACK_PATH}`;
  }
  return OFFICIAL_GOOGLE_WEB_REDIRECT_URI;
};

const getIdentityApi = () => {
  const anyGlobal = globalThis as any;
  return anyGlobal?.chrome?.identity || anyGlobal?.browser?.identity || null;
};

type GoogleAuthDiagnostics = {
  protocol: string;
  runtimeId: string;
  hasChromeIdentity: boolean;
  hasBrowserIdentity: boolean;
  hasLaunchWebAuthFlow: boolean;
  hasGetRedirectURL: boolean;
  isExtensionPage: boolean;
  redirectUri: string;
  usingOfficialClientId: boolean;
  redirectUriMatchesOfficialClientId: boolean;
};

type GoogleWebPopupMessage = {
  source: 'leaf-tab-google-auth';
  type: 'success' | 'error';
  state?: string;
  idToken?: string;
  error?: string;
};

type GoogleAuthMode = 'extension-identity' | 'web-popup' | 'unavailable';
export type AuthModalMode = 'login' | 'link-google';

const getExpectedOfficialGoogleRedirectUris = (runtimeId: string) => {
  const runtimeSpecificUri = OFFICIAL_GOOGLE_EXTENSION_REDIRECT_URIS_BY_RUNTIME_ID[runtimeId];
  if (runtimeSpecificUri) return [runtimeSpecificUri];
  return OFFICIAL_GOOGLE_EXTENSION_REDIRECT_URIS;
};

const getGoogleAuthDiagnostics = (clientId?: string | null): GoogleAuthDiagnostics => {
  const anyGlobal = globalThis as any;
  const chromeIdentity = anyGlobal?.chrome?.identity;
  const browserIdentity = anyGlobal?.browser?.identity;
  const identityApi = chromeIdentity || browserIdentity || null;
  const protocol = typeof location !== 'undefined' ? location.protocol : '';
  const runtimeId = String(anyGlobal?.chrome?.runtime?.id || anyGlobal?.browser?.runtime?.id || '').trim();
  const isExtensionPage = protocol === 'chrome-extension:' || protocol === 'moz-extension:' || protocol === 'edge-extension:';

  let redirectUri = '';
  if (identityApi?.getRedirectURL) {
    try {
      redirectUri = String(identityApi.getRedirectURL() || '').trim();
    } catch (error) {
      console.warn('[LeafTab] Failed to resolve Google auth redirect URI', error);
    }
  }

  const usingOfficialClientId = String(clientId || '').trim() === OFFICIAL_GOOGLE_OAUTH_CLIENT_ID;
  const expectedOfficialRedirectUris = getExpectedOfficialGoogleRedirectUris(runtimeId);
  const redirectUriMatchesOfficialClientId = (
    !usingOfficialClientId
    || !redirectUri
    || expectedOfficialRedirectUris.includes(redirectUri)
  );

  return {
    protocol,
    runtimeId,
    hasChromeIdentity: Boolean(chromeIdentity),
    hasBrowserIdentity: Boolean(browserIdentity),
    hasLaunchWebAuthFlow: Boolean(identityApi?.launchWebAuthFlow),
    hasGetRedirectURL: Boolean(identityApi?.getRedirectURL),
    isExtensionPage,
    redirectUri,
    usingOfficialClientId,
    redirectUriMatchesOfficialClientId,
  };
};

const resolveGoogleAuthMode = ({
  diagnostics,
  webClientId,
}: {
  diagnostics: GoogleAuthDiagnostics;
  webClientId: string;
}): GoogleAuthMode => {
  if (diagnostics.isExtensionPage && diagnostics.hasLaunchWebAuthFlow && diagnostics.hasGetRedirectURL) {
    return 'extension-identity';
  }
  if (webClientId && typeof window !== 'undefined' && typeof window.open === 'function') {
    return 'web-popup';
  }
  return 'unavailable';
};

const getGoogleUnsupportedReason = ({
  diagnostics,
  authMode,
  webClientIdConfigured,
}: {
  diagnostics: GoogleAuthDiagnostics;
  authMode: GoogleAuthMode;
  webClientIdConfigured: boolean;
}) => {
  if (authMode !== 'unavailable') {
    return 'Google auth mode is available';
  }
  if (!diagnostics.isExtensionPage) {
    if (typeof window === 'undefined' || typeof window.open !== 'function') {
      return 'window.open is unavailable in the current browser environment';
    }
    return webClientIdConfigured
      ? `web Google OAuth is unavailable for this page (${diagnostics.protocol || 'unknown protocol'})`
      : `web Google OAuth client ID is missing for this page (${diagnostics.protocol || 'unknown protocol'})`;
  }
  if (!diagnostics.hasChromeIdentity && !diagnostics.hasBrowserIdentity) {
    return webClientIdConfigured
      ? 'identity API is missing, will require web popup fallback'
      : 'identity API is missing and no web Google client ID is configured';
  }
  if (!diagnostics.hasLaunchWebAuthFlow) {
    return 'identity.launchWebAuthFlow is missing';
  }
  if (!diagnostics.hasGetRedirectURL) {
    return 'identity.getRedirectURL is missing';
  }
  return 'required browser identity APIs are unavailable';
};

const getGoogleRedirectMismatchReason = (diagnostics: GoogleAuthDiagnostics) => {
  if (!diagnostics.usingOfficialClientId || diagnostics.redirectUriMatchesOfficialClientId || !diagnostics.redirectUri) {
    return '';
  }
  const expected = getExpectedOfficialGoogleRedirectUris(diagnostics.runtimeId).join(' or ');
  return `redirect URI mismatch: expected ${expected}, got ${diagnostics.redirectUri}`;
};

const createGoogleOAuthUrl = ({
  clientId,
  redirectUri,
  nonce,
  state,
}: {
  clientId: string;
  redirectUri: string;
  nonce: string;
  state: string;
}) => {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'id_token');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPE);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');
  return authUrl;
};

const encodeGooglePopupState = ({
  csrfToken,
  openerOrigin,
}: {
  csrfToken: string;
  openerOrigin: string;
}) => {
  const payload = JSON.stringify({ csrfToken, openerOrigin });
  return btoa(unescape(encodeURIComponent(payload)));
};

const launchGooglePopupAuthFlow = ({
  clientId,
  redirectUri,
  callbackOrigin,
}: {
  clientId: string;
  redirectUri: string;
  callbackOrigin: string;
}): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google popup login is unavailable outside the browser window'));
      return;
    }

    const nonce = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const csrfToken = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const openerOrigin = window.location.origin;
    const state = encodeGooglePopupState({ csrfToken, openerOrigin });
    const authUrl = createGoogleOAuthUrl({ clientId, redirectUri, nonce, state });
    const popupWidth = 520;
    const popupHeight = 640;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - popupWidth) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - popupHeight) / 2));
    const popupFeatures = [
      'popup=yes',
      `width=${popupWidth}`,
      `height=${popupHeight}`,
      `left=${left}`,
      `top=${top}`,
      'resizable=yes',
      'scrollbars=yes',
    ].join(',');
    const popup = window.open(authUrl.toString(), 'leafTabGoogleLogin', popupFeatures);
    if (!popup) {
      reject(new Error('Google login popup was blocked'));
      return;
    }

    let resolved = false;
    let timeoutId = 0;

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      if (timeoutId) window.clearTimeout(timeoutId);
    };

    const finish = (fn: () => void) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      fn();
    };

    const handleMessage = (event: MessageEvent<GoogleWebPopupMessage>) => {
      if (event.origin !== callbackOrigin) return;
      if (event.source !== popup) return;
      if (!event.data || event.data.source !== 'leaf-tab-google-auth') return;
      if (event.data.state !== state) {
        finish(() => reject(new Error('Google login state mismatch')));
        return;
      }
      if (event.data.type === 'error') {
        finish(() => reject(new Error(event.data.error ? `Google OAuth error: ${event.data.error}` : 'Google OAuth error')));
        return;
      }
      if (!event.data.idToken) {
        finish(() => reject(new Error('Google ID token is missing')));
        return;
      }
      finish(() => resolve(event.data.idToken as string));
    };

    window.addEventListener('message', handleMessage);
    timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error('Google login timed out')));
    }, 2 * 60 * 1000);
  });
};

const launchGoogleIdentityAuthFlow = (clientId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chromeApi = (globalThis as any)?.chrome;
    const identityApi = getIdentityApi();
    if (!identityApi?.launchWebAuthFlow || !identityApi?.getRedirectURL) {
      reject(new Error('Google sign-in is not supported in this browser'));
      return;
    }

    const redirectUri = identityApi.getRedirectURL();
    const nonce = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const authUrl = createGoogleOAuthUrl({
      clientId,
      redirectUri,
      nonce,
      state: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    });

    identityApi.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (callbackUrl?: string) => {
        const lastError = chromeApi?.runtime?.lastError;
        if (lastError) {
          reject(new Error(lastError.message || 'Google login canceled'));
          return;
        }
        if (!callbackUrl) {
          reject(new Error('Google login canceled'));
          return;
        }
        try {
          const callback = new URL(callbackUrl);
          const fragment = callback.hash.startsWith('#') ? callback.hash.slice(1) : callback.hash;
          const params = new URLSearchParams(fragment);
          const googleError = params.get('error');
          if (googleError) {
            reject(new Error(`Google OAuth error: ${googleError}`));
            return;
          }
          const idToken = params.get('id_token');
          if (!idToken) {
            reject(new Error('Google ID token is missing'));
            return;
          }
          resolve(idToken);
        } catch {
          reject(new Error('Unable to parse Google callback URL'));
        }
      }
    );
  });
};

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: (username: string, role?: string | null, privacyConsent?: boolean | null) => void;
  onGoogleLinkSuccess?: () => void;
  apiServer: 'official' | 'custom';
  onApiServerChange: (next: 'official' | 'custom') => void;
  customApiUrl: string;
  customApiName: string;
  defaultApiBase: string;
  allowCustomApiServer?: boolean;
  mode?: AuthModalMode;
  linkedUsername?: string | null;
}

export default function AuthModal({
  isOpen,
  onOpenChange,
  onLoginSuccess,
  onGoogleLinkSuccess,
  apiServer,
  onApiServerChange,
  customApiUrl,
  customApiName,
  defaultApiBase,
  allowCustomApiServer = true,
  mode = 'login',
  linkedUsername = null,
}: AuthModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaImageSrc, setCaptchaImageSrc] = useState<string>("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const customApiBase = useMemo(() => normalizeApiBase(customApiUrl), [customApiUrl]);
  const customServerLabel = useMemo(() => {
    const name = (customApiName || '').trim();
    if (name) return name;
    if (customApiBase) return customApiBase;
    return t('auth.server.custom');
  }, [customApiName, customApiBase, t]);
  const API_URL = useMemo(() => {
    if (allowCustomApiServer && apiServer === 'custom' && customApiBase) return customApiBase;
    return defaultApiBase;
  }, [allowCustomApiServer, apiServer, customApiBase, defaultApiBase]);
  const extensionGoogleClientId = useMemo(() => resolveExtensionGoogleClientId(), []);
  const webGoogleClientId = useMemo(() => resolveWebGoogleClientId(), []);
  const googleAuthDiagnostics = useMemo(() => getGoogleAuthDiagnostics(extensionGoogleClientId), [extensionGoogleClientId]);
  const webGoogleRedirectUri = useMemo(
    () => resolveWebGoogleRedirectUri(googleAuthDiagnostics.isExtensionPage),
    [googleAuthDiagnostics.isExtensionPage]
  );
  const webGoogleRedirectOrigin = useMemo(() => {
    try {
      return new URL(webGoogleRedirectUri).origin;
    } catch {
      return '';
    }
  }, [webGoogleRedirectUri]);
  const googleAuthMode = useMemo(() => resolveGoogleAuthMode({
    diagnostics: googleAuthDiagnostics,
    webClientId: webGoogleClientId,
  }), [googleAuthDiagnostics, webGoogleClientId]);
  const googleClientId = useMemo(() => {
    if (googleAuthMode === 'extension-identity') return extensionGoogleClientId;
    if (googleAuthMode === 'web-popup') return webGoogleClientId;
    return '';
  }, [extensionGoogleClientId, googleAuthMode, webGoogleClientId]);
  const googleLoginAvailable = useMemo(() => {
    if (!googleClientId) return false;
    return googleAuthMode === 'extension-identity' || googleAuthMode === 'web-popup';
  }, [googleClientId, googleAuthMode]);
  const isGoogleLinkMode = mode === 'link-google';

  React.useEffect(() => {
    if (!allowCustomApiServer && apiServer !== 'official') {
      onApiServerChange('official');
    }
  }, [allowCustomApiServer, apiServer, onApiServerChange]);

  React.useEffect(() => {
    if (!isOpen || !isGoogleLinkMode) return;
    setActiveTab('login');
  }, [isGoogleLinkMode, isOpen]);

  const fetchCaptcha = async () => {
    try {
      const response = await fetch(`${API_URL}/captcha`, {
        credentials: 'include',
      });
      if (response.ok) {
        const svg = await response.text();
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        setCaptchaImageSrc(dataUrl);
      }
    } catch (error) {
      console.error('Failed to fetch captcha:', error);
      setCaptchaImageSrc("");
    }
  };

  React.useEffect(() => {
    if (isOpen && activeTab === 'register') {
      fetchCaptcha();
    }
  }, [isOpen, activeTab]);

  const parseResponseJson = async (response: Response) => {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const getTranslatedError = (errorMsg: string) => {
    // Always try to translate common errors first
    if (errorMsg.includes('Username already exists')) return t('auth.errors.userExists');
    if (errorMsg.includes('User not found')) return t('auth.errors.userNotFound');
    if (errorMsg.includes('Invalid username or password')) return t('auth.errors.invalidCredentials');
    if (errorMsg.includes('Invalid password')) return t('auth.errors.invalidPassword');
    if (errorMsg.includes('Invalid captcha')) return t('auth.errors.invalidCaptcha');
    if (errorMsg.includes('Invalid username format')) return t('auth.errors.invalidUsernameFormatBackend');
    if (errorMsg.includes('Password must be at least')) return t('auth.errors.passwordTooShort');
    if (errorMsg.includes('Username and password are required')) return t('auth.errors.credentialsRequired');
    if (errorMsg.includes('Captcha is required')) return t('auth.errors.captchaRequired');
    if (errorMsg.includes('Internal server error')) return t('auth.errors.internalError');
    if (errorMsg.includes('Too many attempts') || errorMsg.includes('Too many requests')) return t('auth.errors.tooManyRequests');
    if (errorMsg.includes('Google login is not enabled')) return t('auth.errors.googleNotEnabled');
    if (errorMsg.includes('Invalid Google ID token')) return t('auth.errors.invalidGoogleToken');
    if (errorMsg.includes('Google ID token is required')) return t('auth.errors.googleTokenMissing');
    if (errorMsg.includes('Google sign-in is missing a stable user id')) return t('auth.errors.googleUserIdMissing');
    if (errorMsg.includes('Google sign-in is not supported in this browser')) return t('auth.errors.googleUnsupported');
    if (errorMsg.includes('Google login canceled')) return t('auth.errors.googleCanceled');
    if (errorMsg.includes('Google login timed out')) return t('auth.errors.googleTimedOut');
    if (errorMsg.includes('Google login popup was blocked')) return t('auth.errors.googlePopupBlocked');
    if (errorMsg.includes('Google login state mismatch')) return t('auth.errors.googleStateMismatch');
    if (errorMsg.includes('Google OAuth error')) return t('auth.errors.googleOAuthFailed');
    if (errorMsg.includes('Google account is already linked to another user')) {
      return t('auth.errors.googleAlreadyLinked', {
        defaultValue: '这个 Google 账号已经绑定到另一个 LeafTab 账号',
      });
    }
    if (errorMsg.includes('Unable to parse Google callback URL') || errorMsg.includes('Google ID token is missing')) {
      return t('auth.errors.googleParseFailed');
    }
    return errorMsg;
  };

  const getGoogleUnsupportedMessage = () => {
    if (!webGoogleClientId) {
      return t('auth.errors.googleWebClientIdMissing', {
        defaultValue: 'Google sign-in is not configured for web mode. Missing VITE_GOOGLE_WEB_OAUTH_CLIENT_ID.',
      });
    }
    const reason = getGoogleUnsupportedReason({
      diagnostics: googleAuthDiagnostics,
      authMode: googleAuthMode,
      webClientIdConfigured: Boolean(webGoogleClientId),
    });
    return t('auth.errors.googleUnsupportedDetailed', {
      reason,
      defaultValue: `Google sign-in is not supported in this browser: ${reason}`,
    });
  };

  const handleLoginSuccessPayload = (data: any) => {
    if (!data?.token || !data?.username) {
      throw new Error(t('auth.errors.loginFailed'));
    }

    toast.success(t('auth.toast.loginSuccess', { username: data.username }));
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    if (data.role) {
      localStorage.setItem('role', data.role);
    }
    if (typeof data.privacyConsent !== 'undefined') {
      try { localStorage.setItem('privacy_consent', JSON.stringify(!!data.privacyConsent)); } catch {}
    }
    if (data.createdAt) {
      localStorage.setItem('user_created_at', data.createdAt);
    }
    if (data.isNewUser) {
      try {
        localStorage.setItem(FIRST_LOGIN_LOCAL_FIRST_KEY, data.username);
      } catch {}
    }

    onLoginSuccess?.(data.username, data.role, data.privacyConsent);
    onOpenChange(false);
    setUsername("");
    setPassword("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error(t('auth.errors.usernamePasswordRequired'));
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      
      const data = await parseResponseJson(response);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(t('auth.errors.tooManyRequests'));
        }
        throw new Error((data as any)?.error || t('auth.errors.loginFailed'));
      }
      handleLoginSuccessPayload(data);
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(getTranslatedError(error.message) || t('auth.errors.loginRequestFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error(t('auth.errors.usernamePasswordRequired'));
      return;
    }

    if (!captcha) {
      toast.error(t('auth.errors.captchaRequired'));
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, captcha }),
      });
      
      const data = await parseResponseJson(response);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(t('auth.errors.tooManyRequests'));
        }
        throw new Error((data as any)?.error || t('auth.errors.registerFailed'));
      }
      
      toast.success(t('auth.toast.registerSuccess', { username }));
      try {
        localStorage.setItem(FIRST_LOGIN_LOCAL_FIRST_KEY, username);
      } catch {}
      setActiveTab("login");
      // Don't clear username so they can just type password
      setPassword("");
      setCaptcha("");
    } catch (error: any) {
      console.error('Register error:', error);
      toast.error(getTranslatedError(error.message) || t('auth.errors.registerRequestFailed'));
      fetchCaptcha(); // Refresh captcha on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!googleClientId) {
      toast.error(
        googleAuthMode === 'extension-identity'
          ? t('auth.errors.googleClientIdMissing', {
              defaultValue: 'Google sign-in is not configured for extension mode. Missing VITE_GOOGLE_OAUTH_CLIENT_ID.',
            })
          : t('auth.errors.googleWebClientIdMissing', {
              defaultValue: 'Google sign-in is not configured for web mode. Missing VITE_GOOGLE_WEB_OAUTH_CLIENT_ID.',
            })
      );
      return;
    }

    const redirectMismatchReason = getGoogleRedirectMismatchReason(googleAuthDiagnostics);
    if (googleAuthMode === 'extension-identity' && redirectMismatchReason) {
      toast.error(t('auth.errors.googleRedirectMismatch', {
        redirectUri: googleAuthDiagnostics.redirectUri || '(unknown)',
      }));
      console.warn('[LeafTab] Google auth redirect mismatch', {
        ...googleAuthDiagnostics,
        redirectMismatchReason,
      });
      return;
    }

    console.info('[LeafTab] Google auth diagnostics', {
      ...googleAuthDiagnostics,
      authMode: googleAuthMode,
      activeClientId: googleClientId,
      webGoogleClientIdConfigured: Boolean(webGoogleClientId),
      webGoogleRedirectUri,
      redirectMismatchReason,
    });

    if (!googleLoginAvailable) {
      toast.error(getGoogleUnsupportedMessage());
      return;
    }

    setIsLoading(true);
    try {
      const idToken = googleAuthMode === 'extension-identity'
        ? await launchGoogleIdentityAuthFlow(googleClientId)
        : await launchGooglePopupAuthFlow({
            clientId: googleClientId,
            redirectUri: webGoogleRedirectUri,
            callbackOrigin: webGoogleRedirectOrigin,
          });
      const token = localStorage.getItem('token') || '';
      const response = await fetch(
        `${API_URL}${isGoogleLinkMode ? '/auth/google/link' : '/auth/google'}`,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isGoogleLinkMode && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ idToken, clientId: googleClientId }),
      });
      const data = await parseResponseJson(response);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(t('auth.errors.tooManyRequests'));
        }
        throw new Error((data as any)?.error || t('auth.errors.googleLoginFailed'));
      }

      if (isGoogleLinkMode) {
        toast.success(t('auth.toast.googleLinked', {
          defaultValue: 'Google 登录已绑定到当前账号',
        }));
        onGoogleLinkSuccess?.();
        onOpenChange(false);
        return;
      }

      handleLoginSuccessPayload(data);
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(getTranslatedError(error.message) || t('auth.errors.googleLoginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground rounded-[32px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">LeafTab</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isGoogleLinkMode
              ? t('auth.linkGoogle.description', {
                  username: linkedUsername || '',
                  defaultValue: linkedUsername
                    ? `把 Google 登录绑定到当前账号 ${linkedUsername}`
                    : '把 Google 登录绑定到当前 LeafTab 账号',
                })
              : t('auth.description')}
          </DialogDescription>
        </DialogHeader>
        {allowCustomApiServer ? (
          <div className="space-y-2 pt-2">
            <Label className="text-foreground">{t('auth.server.label')}</Label>
            <Select value={apiServer} onValueChange={(v: string) => onApiServerChange(v as 'official' | 'custom')}>
              <SelectTrigger className="border-none text-foreground rounded-[16px] focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder={t('auth.server.label')} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="official" className="focus:bg-accent focus:text-accent-foreground">{t('auth.server.official')}</SelectItem>
                <SelectItem value="custom" disabled={!customApiBase} className="focus:bg-accent focus:text-accent-foreground">
                  {customServerLabel}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {isGoogleLinkMode ? (
          <div className="space-y-4 py-2">
            <div className="rounded-[18px] border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
              {t('auth.linkGoogle.hint', {
                defaultValue: '绑定完成后，以后直接使用这个 Google 账号登录，就会进入当前这份 LeafTab 云数据。',
              })}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 rounded-[16px]"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <img
                src={googleIcon}
                alt=""
                className="h-4 w-4"
              />
              {isLoading
                ? t('auth.buttons.loggingIn')
                : t('auth.linkGoogle.action', { defaultValue: '绑定 Google 登录' })}
            </Button>
          </div>
        ) : (
        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Tabs.List className="frosted-control-surface grid h-10 w-full grid-cols-2 rounded-[16px] p-1 text-muted-foreground">
            <Tabs.Trigger
              value="login"
              className="inline-flex items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              {t('auth.tabs.login')}
            </Tabs.Trigger>
            <Tabs.Trigger
              value="register"
              className="inline-flex items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              {t('auth.tabs.register')}
            </Tabs.Trigger>
          </Tabs.List>
          
          <Tabs.Content value="login" className="outline-none">
            <form onSubmit={handleLogin} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="login-username" className="text-foreground">{t('auth.labels.username')}</Label>
                <Input
                  variant="auth"
                  key="login-username"
                  id="login-username" 
                  name="username"
                  autoComplete="username"
                  placeholder={t('auth.placeholders.usernameInput')} 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-foreground">{t('auth.labels.password')}</Label>
                <div className="relative">
                  <Input
                    variant="auth"
                    key="login-password"
                    id="login-password"
                    name="password"
                    type={showLoginPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder={t('auth.placeholders.passwordInput')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                  >
                    {showLoginPassword ? <RiEyeOffFill className="size-4" /> : <RiEyeFill className="size-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-[16px]" disabled={isLoading}>
                {isLoading ? t('auth.buttons.loggingIn') : t('auth.buttons.login')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-[16px] gap-2 border-transparent hover:border-transparent"
                disabled={isLoading}
                onClick={handleGoogleLogin}
              >
                <img
                  src={googleIcon}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0"
                />
                {isLoading ? t('auth.buttons.loggingIn') : t('auth.buttons.googleLogin')}
              </Button>
            </form>
          </Tabs.Content>
          
          <Tabs.Content value="register" className="outline-none">
            <form onSubmit={handleRegister} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="register-username" className="text-foreground">{t('auth.labels.username')}</Label>
                <Input
                  variant="auth"
                  key="register-username"
                  id="register-username" 
                  name="username"
                  autoComplete="username"
                  placeholder={t('auth.placeholders.usernameSet')} 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <p className="text-[12px] text-muted-foreground">{t('auth.tips.username')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-foreground">{t('auth.labels.password')}</Label>
                <div className="relative">
                  <Input
                    variant="auth"
                    key="register-password"
                    id="register-password"
                    name="password"
                    type={showRegisterPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t('auth.placeholders.passwordSet')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    onClick={() => setShowRegisterPassword((prev) => !prev)}
                  >
                    {showRegisterPassword ? <RiEyeOffFill className="size-4" /> : <RiEyeFill className="size-4" />}
                  </button>
                </div>
                <p className="text-[12px] text-muted-foreground">{t('auth.tips.password')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="captcha" className="text-foreground">{t('auth.labels.captcha')}</Label>
                <div className="flex gap-2">
                  <Input
                    variant="auth"
                    key="captcha"
                    id="captcha" 
                    name="captcha"
                    autoComplete="off"
                    placeholder={t('auth.placeholders.captchaInput')} 
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                  />
                  <button
                    type="button"
                    className="cursor-pointer rounded-[8px] overflow-hidden min-w-[120px] h-[40px] bg-white flex items-center justify-center"
                    onClick={fetchCaptcha}
                    title={t('auth.tips.refreshCaptcha')}
                    aria-label={t('auth.tips.refreshCaptcha')}
                  >
                    {captchaImageSrc ? (
                      <img
                        src={captchaImageSrc}
                        alt={t('auth.labels.captcha')}
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <span className="px-2 text-xs text-muted-foreground">{t('auth.tips.refreshCaptcha')}</span>
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-[16px]" disabled={isLoading}>
                {isLoading ? t('auth.buttons.registering') : t('auth.buttons.register')}
              </Button>
            </form>
          </Tabs.Content>
        </Tabs.Root>
        )}
      </DialogContent>
    </Dialog>
  );
}
