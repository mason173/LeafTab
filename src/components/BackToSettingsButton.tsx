import { useTranslation } from 'react-i18next';
import { RiHomeFill } from '@/icons/ri-compat';
import { Button } from '@/components/ui/button';

type BackToSettingsButtonProps = {
  onClick?: () => void;
  className?: string;
  label?: string;
};

export function BackToSettingsButton({ onClick, className = '', label }: BackToSettingsButtonProps) {
  const { t } = useTranslation();

  if (!onClick) {
    return null;
  }

  const backLabel = label || t('settings.backToMain', { defaultValue: '返回主设置' });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground ${className}`.trim()}
      onClick={onClick}
      aria-label={backLabel}
      title={backLabel}
    >
      <RiHomeFill className="size-4" />
    </Button>
  );
}
