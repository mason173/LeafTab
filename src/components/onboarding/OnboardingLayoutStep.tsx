import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/components/ui/utils';
import type { DisplayMode } from '@/displayMode/config';
import { RiArrowRightSLine } from '@/icons/ri-compat';

type StepDot = {
  id: string;
  active: boolean;
  onClick: () => void;
};

type OnboardingLayoutStepProps = {
  currentLayout: DisplayMode;
  stepDots: readonly StepDot[];
  onLayoutChange: (mode: DisplayMode) => void;
  onNext: () => void;
  nextLabel: string;
};

function StandardLayoutWireframe() {
  return (
    <div className="relative aspect-[16/10] w-full max-w-[520px] overflow-hidden rounded-[24px] border border-border/70 bg-background/16 px-5 py-5">
      <div className="absolute inset-x-0 top-5 flex flex-col items-center gap-2">
        <div className="h-3.5 w-24 rounded-full border border-foreground/24" />
        <div className="h-2 w-30 rounded-full border border-foreground/16" />
      </div>

      <div className="absolute left-5 top-[4.5rem] grid w-[5.75rem] grid-cols-2 gap-1.5 rounded-[18px] border border-foreground/16 p-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square rounded-[10px] border border-foreground/14 bg-foreground/[0.03]"
          />
        ))}
      </div>

      <div className="absolute right-5 left-[8.1rem] top-[4.8rem] grid grid-cols-4 gap-x-2.5 gap-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-1.5">
            <div className="mx-auto aspect-square w-8 rounded-[10px] border border-foreground/18 bg-foreground/[0.03]" />
            <div className="mx-auto h-1.5 w-6 rounded-full border border-foreground/14" />
          </div>
        ))}
      </div>

      <div className="absolute inset-x-1/2 bottom-5 h-9 w-[11.5rem] -translate-x-1/2 rounded-full border border-foreground/18 bg-foreground/[0.03]" />
    </div>
  );
}

function MinimalistLayoutWireframe() {
  return (
    <div className="relative aspect-[16/10] w-full max-w-[520px] overflow-hidden rounded-[24px] border border-border/70 bg-background/16 px-5 py-5">
      <div className="absolute inset-x-0 top-5 flex flex-col items-center gap-2">
        <div className="h-3.5 w-24 rounded-full border border-foreground/24" />
        <div className="h-2 w-30 rounded-full border border-foreground/16" />
      </div>

      <div className="absolute inset-x-0 top-[5.9rem] flex justify-center">
        <div className="h-24 w-[72%] rounded-[20px] border border-dashed border-foreground/12" />
      </div>

      <div className="absolute inset-x-0 bottom-[4.3rem] flex justify-center">
        <div className="h-4 w-4 rotate-45 border-r-2 border-b-2 border-foreground/22" />
      </div>

      <div className="absolute inset-x-1/2 bottom-5 h-9 w-[11.5rem] -translate-x-1/2 rounded-full border border-foreground/18 bg-foreground/[0.03]" />
    </div>
  );
}

export function OnboardingLayoutStep({
  currentLayout,
  stepDots,
  onLayoutChange,
  onNext,
  nextLabel,
}: OnboardingLayoutStepProps) {
  const { t } = useTranslation();

  return (
    <div className="relative space-y-8 pb-18">
      <div className="space-y-2 text-left">
        <h1 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
          {t('onboarding.stepLayoutTitle')}
        </h1>
        <p className="max-w-[560px] text-base text-muted-foreground">
          {t('onboarding.stepLayoutDesc')}
        </p>
      </div>

      <Tabs
        value={currentLayout}
        onValueChange={(value) => onLayoutChange(value as DisplayMode)}
        className="space-y-6"
      >
        <TabsList aria-label={t('onboarding.stepLayoutTitle')}>
          <TabsTrigger value="fresh">{t('settings.displayMode.rhythm')}</TabsTrigger>
          <TabsTrigger value="minimalist">{t('settings.displayMode.blank')}</TabsTrigger>
        </TabsList>

        <TabsContent value="fresh" className="mt-0">
          <div className="space-y-3">
            <StandardLayoutWireframe />
          </div>
        </TabsContent>

        <TabsContent value="minimalist" className="mt-0">
          <div className="space-y-3">
            <MinimalistLayoutWireframe />
          </div>
        </TabsContent>
      </Tabs>

      <div className="text-left text-sm text-muted-foreground">
        {t('onboarding.layoutTip')}
      </div>

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
          className="inline-flex items-center gap-1.5 text-base font-medium text-foreground/70 transition-colors hover:text-foreground"
          onClick={onNext}
        >
          <span>{nextLabel}</span>
          <RiArrowRightSLine className="size-5" />
        </button>
      </div>
    </div>
  );
}
