import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/components/ui/utils';
import {
  RiArrowRightSLine,
} from '@/icons/ri-compat';

type StepDot = {
  id: string;
  active: boolean;
  onClick: () => void;
};

type RoleOption = {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
};

type OnboardingRoleStepProps = {
  roleOptions: readonly RoleOption[];
  selectedRole: string | null;
  stepDots: readonly StepDot[];
  onNext: () => void;
  nextLabel: string;
  onRoleSelect: (roleId: string) => void;
};

export function OnboardingRoleStep({
  roleOptions,
  selectedRole,
  stepDots,
  onNext,
  nextLabel,
  onRoleSelect,
}: OnboardingRoleStepProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-0 max-w-[660px] flex-col items-center justify-start gap-4 py-2 text-center sm:min-h-[clamp(450px,60vh,580px)] sm:justify-center sm:gap-5 sm:py-4">
      <div className="space-y-2">
        <h1 className="text-[24px] font-bold tracking-[-0.03em]">
          {t('onboarding.stepRoleTitle')}
        </h1>
        <p className="mx-auto max-w-[560px] text-[12px] text-muted-foreground">
          {t('onboarding.stepRoleDesc')}
        </p>
      </div>

      <section className="grid w-full max-w-[620px] grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {roleOptions.map((role) => {
          const isSelected = selectedRole === role.id;
          const RoleIcon = role.icon;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onRoleSelect(role.id)}
              className={cn(
                'group relative flex aspect-[1/0.8] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[20px] p-2.5 text-center transition-all duration-200 focus:outline-none focus-visible:ring-0',
              )}
            >
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-[14px] transition-all',
                  isSelected
                    ? 'bg-primary/12 text-primary'
                    : 'bg-background/12 text-foreground/68 group-hover:text-foreground/82',
                )}
              >
                <RoleIcon
                  className={cn(
                    'size-4.5',
                  )}
                />
              </div>
              <div
                className={cn(
                  'min-w-0 text-[12px] leading-4 font-medium tracking-[0] transition-colors',
                  isSelected
                    ? 'text-primary'
                    : 'text-foreground/78 group-hover:text-foreground',
                )}
              >
                {role.title}
              </div>
            </button>
          );
        })}
      </section>

      <div className="flex items-center justify-center gap-2">
        {stepDots.map((dot, index) => (
          <button
            key={dot.id}
            type="button"
            onClick={dot.onClick}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              dot.active ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/40',
            )}
            aria-label={`step-${index + 1}`}
          />
        ))}
      </div>

      <div className="flex h-12 items-center justify-center">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-base font-medium text-foreground/70 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:text-foreground/28"
          onClick={onNext}
          disabled={!selectedRole}
        >
          <span>{nextLabel}</span>
          <RiArrowRightSLine className="size-5" />
        </button>
      </div>
    </div>
  );
}
