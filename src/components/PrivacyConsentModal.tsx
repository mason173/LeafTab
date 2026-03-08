import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiShieldCheckFill, RiShieldCrossFill } from '@remixicon/react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

interface PrivacyConsentModalProps {
  isOpen: boolean;
  onConsent: (agreed: boolean) => void;
}

export function PrivacyConsentModal({ isOpen, onConsent }: PrivacyConsentModalProps) {
  const { t } = useTranslation();
  const [confirmMode, setConfirmMode] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground [&>button]:hidden" onPointerDownOutside={(e: any) => e.preventDefault()} onEscapeKeyDown={(e: any) => e.preventDefault()}>
        {!confirmMode ? (
          <>
            <DialogHeader>
              <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
                <RiShieldCheckFill className="w-10 h-10 text-primary" />
              </div>
              <DialogTitle className="text-center text-xl font-semibold">
                {t('settings.iconAssistant.modalTitle')}
              </DialogTitle>
              <DialogDescription className="text-center pt-2">
                {t('settings.iconAssistant.modalDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-6 items-center">
              <Button 
                className="w-full py-6 rounded-xl font-medium" 
                onClick={() => onConsent(true)}
              >
                {t('settings.iconAssistant.agree')}
              </Button>
              <span 
                className="text-sm text-muted-foreground cursor-pointer hover:underline px-4 py-2"
                onClick={() => setConfirmMode(true)}
              >
                {t('settings.iconAssistant.disagree')}
              </span>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto bg-destructive/10 p-4 rounded-full mb-4">
                <RiShieldCrossFill className="w-10 h-10 text-destructive" />
              </div>
              <DialogTitle className="text-center text-xl font-semibold">
                {t('settings.iconAssistant.modalTitle')}
              </DialogTitle>
              <DialogDescription className="text-center pt-2">
                {t('settings.iconAssistant.confirmClose')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-6 items-center">
              <Button 
                className="w-full py-6 rounded-xl font-medium" 
                onClick={() => onConsent(true)}
              >
                {t('settings.iconAssistant.agree')}
              </Button>
              <span 
                className="text-sm text-muted-foreground cursor-pointer hover:underline px-4 py-2"
                onClick={() => onConsent(false)}
              >
                {t('settings.iconAssistant.disagree')}
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
