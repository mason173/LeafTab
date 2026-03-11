import React, { useMemo, useState } from 'react';
import { RiEyeFill, RiEyeOffFill } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/components/ui/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from 'react-i18next';
import { normalizeApiBase } from "@/utils";

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
  const [captchaSvg, setCaptchaSvg] = useState<string>("");
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
        setCaptchaSvg(svg);
      }
    } catch (error) {
      console.error('Failed to fetch captcha:', error);
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
    return errorMsg;
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
      
      if (!data?.token || !data?.username) {
        throw new Error(t('auth.errors.loginFailed'));
      }
      
      toast.success(t('auth.toast.loginSuccess', { username }));
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
      
      onLoginSuccess?.(data.username, data.role, data.privacyConsent);
      
      onOpenChange(false);
      setUsername("");
      setPassword("");
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground rounded-[24px]">
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-[16px]">
            <TabsTrigger value="login" className="rounded-xl">{t('auth.tabs.login')}</TabsTrigger>
            <TabsTrigger value="register" className="rounded-xl">{t('auth.tabs.register')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="login-username" className="text-foreground">{t('auth.labels.username')}</Label>
                <input 
                  key="login-username"
                  id="login-username" 
                  name="username"
                  autoComplete="username"
                  placeholder={t('auth.placeholders.usernameInput')} 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={cn(
                    "flex h-9 w-full min-w-0 rounded-xl border border-input px-3 py-1 text-base transition-[color,box-shadow] outline-none",
                    "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    "placeholder:text-muted-foreground",
                    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    "bg-secondary border-border text-foreground rounded-[16px]"
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-foreground">{t('auth.labels.password')}</Label>
                <div className="relative">
                  <input
                    key="login-password"
                    id="login-password"
                    name="password"
                    type={showLoginPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder={t('auth.placeholders.passwordInput')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "flex h-9 w-full min-w-0 rounded-xl border border-input px-3 py-1 pr-10 text-base transition-[color,box-shadow] outline-none",
                      "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
                      "placeholder:text-muted-foreground",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                      "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                      "bg-secondary border-border text-foreground rounded-[16px]"
                    )}
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
            </form>
          </TabsContent>
          
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="register-username" className="text-foreground">{t('auth.labels.username')}</Label>
                <input 
                  key="register-username"
                  id="register-username" 
                  name="username"
                  autoComplete="username"
                  placeholder={t('auth.placeholders.usernameSet')} 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={cn(
                    "flex h-9 w-full min-w-0 rounded-xl border border-input px-3 py-1 text-base transition-[color,box-shadow] outline-none",
                    "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    "placeholder:text-muted-foreground",
                    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    "bg-secondary border-border text-foreground rounded-[16px]"
                  )}
                />
                <p className="text-[12px] text-muted-foreground">{t('auth.tips.username')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-foreground">{t('auth.labels.password')}</Label>
                <div className="relative">
                  <input
                    key="register-password"
                    id="register-password"
                    name="password"
                    type={showRegisterPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t('auth.placeholders.passwordSet')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "flex h-9 w-full min-w-0 rounded-xl border border-input px-3 py-1 pr-10 text-base transition-[color,box-shadow] outline-none",
                      "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
                      "placeholder:text-muted-foreground",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                      "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                      "bg-secondary border-border text-foreground rounded-[16px]"
                    )}
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
                  <input 
                    key="captcha"
                    id="captcha" 
                    name="captcha"
                    autoComplete="off"
                    placeholder={t('auth.placeholders.captchaInput')} 
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                    className={cn(
                      "flex h-9 w-full min-w-0 rounded-xl border border-input px-3 py-1 text-base transition-[color,box-shadow] outline-none",
                      "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
                      "placeholder:text-muted-foreground",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                      "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                      "bg-secondary border-border text-foreground rounded-[16px]"
                    )}
                  />
                  <div 
                    className="cursor-pointer rounded-[8px] overflow-hidden min-w-[120px] h-[40px] bg-white flex items-center justify-center"
                    onClick={fetchCaptcha}
                    dangerouslySetInnerHTML={{ __html: captchaSvg }}
                    title={t('auth.tips.refreshCaptcha')}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-[16px]" disabled={isLoading}>
                {isLoading ? t('auth.buttons.registering') : t('auth.buttons.register')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
