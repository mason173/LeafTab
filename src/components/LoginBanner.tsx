import { RiCloseFill } from '@remixicon/react';
import { useTranslation } from 'react-i18next';

interface LoginBannerProps {
  onLogin: () => void;
  onClose: () => void;
}

export function LoginBanner({ onLogin, onClose }: LoginBannerProps) {
  const { t } = useTranslation();
  return (
    <div className="w-full max-w-full bg-background/80 text-muted-foreground px-4 py-2 flex items-center justify-between relative backdrop-blur-sm z-60 transition-all rounded-full border border-border mb-2">
       <div className="flex items-center gap-2 text-xs">
          <span>{t('banner.syncPrompt')}</span>
          <button 
            onClick={onLogin}
            className="underline hover:text-foreground font-medium cursor-pointer transition-colors"
          >
            {t('banner.loginNow')}
          </button>
       </div>
       <button 
         onClick={onClose}
         className="p-1 hover:bg-muted rounded-full transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
       >
         <RiCloseFill className="w-3 h-3" />
       </button>
    </div>
  );
}
