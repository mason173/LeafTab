import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import leaftabUpdateImage from '@/assets/leaftabupdate.svg?url';

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
  const { t } = useTranslation();
  const resolvedLatestVersion = latestVersion || (debugSample ? '1.3.1' : '');
  const resolvedNotes = useMemo(() => {
    if (notes.length > 0) return notes;
    if (!debugSample) return notes;
    return [
      '统一云同步与 WebDAV 同步设置项交互',
      '新增自动更新提示弹窗，可直达 GitHub Release',
      '优化更新日志弹窗排版层级',
    ];
  }, [debugSample, notes]);

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
          <img
            src={leaftabUpdateImage}
            alt="LeafTab Update"
            className="block w-full h-auto rounded-[20px]"
          />
          {resolvedLatestVersion ? (
            <span className="absolute left-1/2 bottom-5 -translate-x-1/2 inline-flex items-center rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold shadow-md border border-background/70">
              新版本 v{resolvedLatestVersion}
            </span>
          ) : null}
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
            稍后提醒
          </Button>
          <Button className="flex-1" onClick={openReleasePage}>
            前往 GitHub 下载
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
