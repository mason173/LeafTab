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

const FIRST_LOGIN_LOCAL_FIRST_KEY = 'leaftab_force_local_sync_after_first_login_user';
const OFFICIAL_GOOGLE_OAUTH_CLIENT_ID = '352087600211-6cu9ot6j7n16927c9blblpcotnimfel2.apps.googleusercontent.com';
const GOOGLE_OAUTH_SCOPE = 'openid email profile';

const resolveGoogleClientId = () => {
  const fromEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_OAUTH_CLIENT_ID)
    ? String((import.meta as any).env.VITE_GOOGLE_OAUTH_CLIENT_ID).trim()
    : '';
  if (fromEnv) return fromEnv;
  return OFFICIAL_GOOGLE_OAUTH_CLIENT_ID;
};

const getIdentityApi = () => {
  const anyGlobal = globalThis as any;
  return anyGlobal?.chrome?.identity || anyGlobal?.browser?.identity || null;
};

const launchGoogleWebAuthFlow = (clientId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chromeApi = (globalThis as any)?.chrome;
    const identityApi = getIdentityApi();
    if (!identityApi?.launchWebAuthFlow || !identityApi?.getRedirectURL) {
      reject(new Error('Google sign-in is not supported in this browser'));
      return;
    }

    const redirectUri = identityApi.getRedirectURL();
    const nonce = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPE);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('prompt', 'select_account');

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
  apiServer: 'official' | 'custom';
  onApiServerChange: (next: 'official' | 'custom') => void;
  customApiUrl: string;
  customApiName: string;
  defaultApiBase: string;
  allowCustomApiServer?: boolean;
}

export default function AuthModal({
  isOpen,
  onOpenChange,
  onLoginSuccess,
  apiServer,
  onApiServerChange,
  customApiUrl,
  customApiName,
  defaultApiBase,
  allowCustomApiServer = true,
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
  const googleClientId = useMemo(() => resolveGoogleClientId(), []);
  const googleLoginAvailable = useMemo(() => {
    const identityApi = getIdentityApi();
    return Boolean(
      googleClientId
      && identityApi?.launchWebAuthFlow
      && identityApi?.getRedirectURL
    );
  }, [googleClientId]);

  React.useEffect(() => {
    if (!allowCustomApiServer && apiServer !== 'official') {
      onApiServerChange('official');
    }
  }, [allowCustomApiServer, apiServer, onApiServerChange]);

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
    if (errorMsg.includes('Google OAuth error')) return t('auth.errors.googleOAuthFailed');
    if (errorMsg.includes('Unable to parse Google callback URL') || errorMsg.includes('Google ID token is missing')) {
      return t('auth.errors.googleParseFailed');
    }
    return errorMsg;
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
      toast.error(t('auth.errors.googleClientIdMissing'));
      return;
    }

    if (!googleLoginAvailable) {
      toast.error(t('auth.errors.googleUnsupported'));
      return;
    }

    setIsLoading(true);
    try {
      const idToken = await launchGoogleWebAuthFlow(googleClientId);
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            {t('auth.description')}
          </DialogDescription>
        </DialogHeader>
        {allowCustomApiServer ? (
          <div className="space-y-2 pt-2">
            <Label className="text-foreground">{t('auth.server.label')}</Label>
            <Select value={apiServer} onValueChange={(v: string) => onApiServerChange(v as 'official' | 'custom')}>
              <SelectTrigger className="bg-secondary border-none text-foreground rounded-[16px] focus:ring-0 focus:ring-offset-0">
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
        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Tabs.List className="grid h-10 w-full grid-cols-2 rounded-[16px] bg-muted p-1 text-muted-foreground">
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
                className="w-full rounded-[16px]"
                disabled={isLoading}
                onClick={handleGoogleLogin}
              >
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
      </DialogContent>
    </Dialog>
  );
}
