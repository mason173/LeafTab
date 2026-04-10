import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import aboutIcon from '@/assets/abouticon.svg';

type UpdateAvailableDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latestVersion: string;
  releaseUrl: string;
  notes: string[];
  onLater: () => void;
  debugSample?: boolean;
};

export function UpdateAvailableDialog({
  open,
  onOpenChange,
  latestVersion,
  releaseUrl,
  notes,
  onLater,
  debugSample = false,
}: UpdateAvailableDialogProps) {
  const { t, i18n } = useTranslation();
  const resolvedLatestVersion = latestVersion || (debugSample ? '1.3.1' : '');
  const resolvedNotes = useMemo(() => {
    if (notes.length > 0) return notes;
    if (!debugSample) return notes;
    return [
      t('updateNotice.sampleNote1', { defaultValue: '统一云同步与 WebDAV 同步设置项交互' }),
      t('updateNotice.sampleNote2', { defaultValue: '新增自动更新提示弹窗，可直达 GitHub Release' }),
      t('updateNotice.sampleNote3', { defaultValue: '优化更新日志弹窗排版层级' }),
    ];
  }, [debugSample, notes, t]);
  const isChinese = useMemo(() => {
    const raw = String(i18n?.language || '').trim().toLowerCase();
    return raw.startsWith('zh');
  }, [i18n?.language]);
  const heroCopy = useMemo(() => {
    return {
      title: isChinese ? 'LeafTab 新标签页' : 'LeafTab New Tab',
      subtitle: 'Minimal by Design. Powerful in Use.',
      badges: isChinese
        ? ['开源', '端到端加密', 'WebDAV 同步']
        : ['Open Source', 'End-to-End Encryption', 'WebDAV Sync'],
    };
  }, [isChinese]);

  const openReleasePage = () => {
    const targetUrl = releaseUrl || (debugSample ? 'https://github.com/mason173/LeafTab/releases' : '');
    if (!targetUrl) return;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[500px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-hidden bg-background border-border text-foreground rounded-[32px] p-0 flex flex-col">
        <div className="relative px-3 pt-3 shrink-0">
          <div className="relative flex h-[190px] flex-col items-center justify-center overflow-hidden rounded-[20px] border border-border/60 bg-secondary/20 px-5 text-center">
            {resolvedLatestVersion ? (
              <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-primary px-3 py-1 text-[14px] font-normal text-primary-foreground">
                {t('updateNotice.badge', { defaultValue: '新版本 v{{version}}', version: resolvedLatestVersion })}
              </span>
            ) : null}
            <div className="relative flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-background ring-1 ring-border/60">
              <img
                src={aboutIcon}
                alt=""
                aria-hidden="true"
                className="h-9 w-9"
                draggable={false}
              />
            </div>
            <div className="relative mt-3 flex w-full max-w-[440px] flex-col items-center gap-1">
              <div className="max-w-full text-[22px] font-medium leading-none tracking-[-0.05em] text-foreground">
                {heroCopy.title}
              </div>
              <div className="max-w-[260px] text-[12px] font-normal leading-[1.35] text-foreground/78">
                {heroCopy.subtitle}
              </div>
            </div>
            <div className="relative mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {heroCopy.badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex min-h-8 items-center justify-center rounded-full border border-border/70 bg-secondary/35 px-4 py-1.5 text-[12px] font-normal text-foreground/70 sm:min-w-[96px]"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>

        <DialogHeader className="px-6 pt-4 pb-0 shrink-0">
          <DialogTitle>{t('updateNotice.changelogTitle')}</DialogTitle>
          <DialogDescription>{t('updateNotice.description')}</DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-3 flex-1 min-h-0">
          <ScrollArea className="h-full pr-1" scrollBarClassName="hidden">
            {resolvedNotes.length > 0 ? (
              <ul className="space-y-2 pb-1">
                {resolvedNotes.map((note, index) => (
                  <li key={`${index}-${note}`} className="text-sm text-foreground/95 leading-6">
                    {index + 1}. {note}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('updateNotice.noChangelog')}</p>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 flex w-full gap-3 sm:gap-3 shrink-0">
          <Button variant="secondary" className="flex-1" onClick={onLater}>
            {t('updateNotice.later', { defaultValue: '稍后提醒' })}
          </Button>
          <Button className="flex-1" onClick={openReleasePage}>
            {t('updateNotice.openRelease', { defaultValue: '前往 GitHub 下载' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
