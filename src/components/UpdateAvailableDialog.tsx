import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

type UpdateAvailableDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVersion: string;
  latestVersion: string;
  publishedAt: string;
  releaseUrl: string;
  notes: string[];
  onIgnoreCurrentVersion: () => void;
  onLater: () => void;
  debugSample?: boolean;
};

export function UpdateAvailableDialog({
  open,
  onOpenChange,
  currentVersion,
  latestVersion,
  publishedAt,
  releaseUrl,
  notes,
  onIgnoreCurrentVersion,
  onLater,
  debugSample = false,
}: UpdateAvailableDialogProps) {
  const { t, i18n } = useTranslation();

  const resolvedLatestVersion = latestVersion || (debugSample ? '1.2.5' : '');
  const resolvedPublishedAt = publishedAt || (debugSample ? new Date().toISOString() : '');
  const resolvedNotes = useMemo(() => {
    if (notes.length > 0) return notes;
    if (!debugSample) return notes;
    return [
      '统一云同步与 WebDAV 同步设置项交互',
      '新增自动更新提示弹窗，可直达 GitHub Release',
      '优化更新日志弹窗排版层级',
    ];
  }, [debugSample, notes]);

  const publishedLabel = useMemo(() => {
    if (!resolvedPublishedAt) return '';
    const d = new Date(resolvedPublishedAt);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(i18n.language || 'zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    } catch {
      return d.toISOString().slice(0, 10);
    }
  }, [i18n.language, resolvedPublishedAt]);

  const openReleasePage = () => {
    if (!releaseUrl) return;
    window.open(releaseUrl, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-hidden bg-background border-border text-foreground rounded-[32px]">
        <DialogHeader>
          <DialogTitle>{t('updateNotice.title', { version: resolvedLatestVersion ? `v${resolvedLatestVersion}` : '' })}</DialogTitle>
          <DialogDescription>{t('updateNotice.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('updateNotice.currentVersion')}</span>
            <span className="font-medium">v{currentVersion || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('updateNotice.latestVersion')}</span>
            <span className="font-semibold">v{resolvedLatestVersion || '—'}</span>
          </div>
          {publishedLabel ? (
            <div className="text-xs text-muted-foreground">
              {t('updateNotice.publishedAt', { date: publishedLabel })}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">{t('updateNotice.changelogTitle')}</div>
          <ScrollArea className="max-h-[36vh] pr-1">
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

        <DialogFooter className="flex w-full items-center gap-2 sm:gap-2">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={onIgnoreCurrentVersion}
          >
            {t('updateNotice.ignoreThisVersion')}
          </button>
          <Button variant="secondary" onClick={onLater}>
            {t('updateNotice.later')}
          </Button>
          <Button onClick={openReleasePage}>{t('updateNotice.downloadFromGithub')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
