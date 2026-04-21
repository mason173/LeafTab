import type { ComponentProps, ReactNode } from 'react';
import { DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { PopoverContent } from '@/components/ui/popover';
import { cn } from '@/components/ui/utils';
import { SettingsFakeBlurBackdrop } from '@/components/settings/SettingsFakeBlurBackdrop';

type SharedFloatingSurfaceProps = {
  children: ReactNode;
  className?: string;
  surfaceRadiusClassName?: string;
  fakeBlurDisabled?: boolean;
};

export type SettingsPopoverContentProps = ComponentProps<typeof PopoverContent> & SharedFloatingSurfaceProps;

export function SettingsPopoverContent({
  children,
  className,
  surfaceRadiusClassName = 'rounded-[20px]',
  fakeBlurDisabled = false,
  ...props
}: SettingsPopoverContentProps) {
  return (
    <PopoverContent
      className={cn(
        "isolate overflow-hidden bg-transparent text-popover-foreground backdrop-blur-none",
        className,
      )}
      surfaceBackdrop={(
        <SettingsFakeBlurBackdrop
          fakeBlurDisabled={fakeBlurDisabled}
          radiusClassName={surfaceRadiusClassName}
          tone="drawer"
          darkCoverStrength="deep"
          sliceOverscanPx={160}
          sliceScale={1.08}
        />
      )}
      {...props}
    >{children}</PopoverContent>
  );
}

export type SettingsDropdownMenuContentProps = ComponentProps<typeof DropdownMenuContent> & SharedFloatingSurfaceProps;

export function SettingsDropdownMenuContent({
  children,
  className,
  surfaceRadiusClassName = 'rounded-[12px]',
  fakeBlurDisabled = false,
  ...props
}: SettingsDropdownMenuContentProps) {
  return (
    <DropdownMenuContent
      className={cn(
        "isolate overflow-hidden bg-transparent text-popover-foreground backdrop-blur-none",
        className,
      )}
      surfaceBackdrop={(
        <SettingsFakeBlurBackdrop
          fakeBlurDisabled={fakeBlurDisabled}
          radiusClassName={surfaceRadiusClassName}
          tone="drawer"
          darkCoverStrength="deep"
          sliceOverscanPx={160}
          sliceScale={1.08}
        />
      )}
      {...props}
    >{children}</DropdownMenuContent>
  );
}
