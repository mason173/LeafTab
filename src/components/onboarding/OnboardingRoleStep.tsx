import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/components/ui/utils';
import {
  RiArrowRightSLine,
  RiCheckFill,
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
    <div className="relative space-y-8 pb-18">
      <div className="space-y-2 text-left">
        <h1 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
          {t('onboarding.stepRoleTitle')}
        </h1>
        <p className="max-w-[560px] text-base text-muted-foreground">
          {t('onboarding.stepRoleDesc')}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-x-10 border-t border-border/65 md:grid-cols-2">
        {roleOptions.map((role) => {
          const isSelected = selectedRole === role.id;
          const RoleIcon = role.icon;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onRoleSelect(role.id)}
              className="group flex w-full items-center gap-3 border-b border-border/65 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-0"
            >
              <div className="flex size-8 shrink-0 items-center justify-center">
                <RoleIcon
                  className={cn(
                    'size-4.5',
                    isSelected ? 'text-primary' : 'text-foreground/62',
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    'text-[14px] leading-5 font-medium tracking-[0] transition-colors',
                    isSelected
                      ? 'text-foreground'
                      : 'text-foreground/72 group-hover:text-foreground',
                  )}
                >
                  {role.title}
                </div>
              </div>
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/80 bg-transparent text-transparent',
                )}
                aria-hidden="true"
              >
                <RiCheckFill className="size-2.5" />
              </div>
            </button>
          );
        })}
      </section>

      <div className="flex items-center justify-start gap-2">
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

      <div className="absolute right-0 bottom-0 flex h-12 items-center justify-end">
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
