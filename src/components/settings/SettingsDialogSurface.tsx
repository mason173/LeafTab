import type { ComponentProps, ReactNode } from 'react';
import { AlertDialogContent } from '@/components/ui/alert-dialog';
import { DialogContent } from '@/components/ui/dialog';
import { cn } from '@/components/ui/utils';
import { SettingsFakeBlurBackdrop } from '@/components/settings/SettingsFakeBlurBackdrop';

type SharedSettingsSurfaceProps = {
  children: ReactNode;
  className?: string;
  surfaceRadiusClassName?: string;
  fakeBlurDisabled?: boolean;
};

export type SettingsDialogContentProps = ComponentProps<typeof DialogContent> & SharedSettingsSurfaceProps;

export function SettingsDialogContent({
  children,
  className,
  surfaceRadiusClassName = 'rounded-[32px]',
  fakeBlurDisabled = false,
  ...props
}: SettingsDialogContentProps) {
  return (
    <DialogContent
      className={cn(
        "isolate overflow-hidden bg-transparent border-border text-foreground backdrop-blur-none",
        className,
      )}
      surfaceBackdrop={<SettingsFakeBlurBackdrop fakeBlurDisabled={fakeBlurDisabled} radiusClassName={surfaceRadiusClassName} />}
      {...props}
    >{children}</DialogContent>
  );
}

export type SettingsAlertDialogContentProps = ComponentProps<typeof AlertDialogContent> & SharedSettingsSurfaceProps;

export function SettingsAlertDialogContent({
  children,
  className,
  surfaceRadiusClassName = 'rounded-[32px]',
  fakeBlurDisabled = false,
  ...props
}: SettingsAlertDialogContentProps) {
  return (
    <AlertDialogContent
      className={cn(
        "isolate overflow-hidden bg-transparent border-border text-foreground backdrop-blur-none",
        className,
      )}
      surfaceBackdrop={<SettingsFakeBlurBackdrop fakeBlurDisabled={fakeBlurDisabled} radiusClassName={surfaceRadiusClassName} />}
      {...props}
    >{children}</AlertDialogContent>
  );
}
