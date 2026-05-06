import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import { BackToSettingsButton } from '@/components/BackToSettingsButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { parseLeafTabLocalBackupImport, type LeafTabLocalBackupImportData } from '@/sync/leaftab';
import leaftabImportIcon from '@/assets/import-leaftab.png';
import infinityImportIcon from '@/assets/import-infinity.png';
import itabImportIcon from '@/assets/import-itab.png';
import wetabImportIcon from '@/assets/import-wetab.png';

type ImportSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToSettings?: () => void;
  onImportData: (data: LeafTabLocalBackupImportData) => void | Promise<void>;
};

type ImportSourceKey = 'leaftab' | 'infinity' | 'itab' | 'wetab';

type ImportSourceOption = {
  key: ImportSourceKey;
  title: string;
  description: string;
  accept: string;
  badge: string;
  imageSrc: string;
};

export function ImportSourceDialog({
  open,
  onOpenChange,
  onBackToSettings,
  onImportData,
}: ImportSourceDialogProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<ImportSourceKey | null>(null);
  const [busySource, setBusySource] = useState<ImportSourceKey | null>(null);

  const sourceOptions: ImportSourceOption[] = [
    {
      key: 'leaftab',
      title: 'LeafTab',
      description: t('settings.backup.importSource.leaftabDesc', {
        defaultValue: '导入 LeafTab 导出的完整备份文件。',
      }),
      accept: '.leaftab,.json,application/json,text/plain',
      badge: '.leaftab',
      imageSrc: leaftabImportIcon,
    },
    {
      key: 'infinity',
      title: 'Infinity',
      description: t('settings.backup.importSource.infinityDesc', {
        defaultValue: '只导入 Infinity 备份里的快捷方式内容。',
      }),
      accept: '.infinity,.json,application/json,text/plain',
      badge: '.infinity',
      imageSrc: infinityImportIcon,
    },
    {
      key: 'itab',
      title: 'iTab',
      description: t('settings.backup.importSource.itabDesc', {
        defaultValue: '只导入 iTab 导出文件里的快捷方式内容。',
      }),
      accept: '.itabdata,.json,application/json,text/plain',
      badge: '.itabdata',
      imageSrc: itabImportIcon,
    },
    {
      key: 'wetab',
      title: 'WeTab',
      description: t('settings.backup.importSource.wetabDesc', {
        defaultValue: '只导入 WeTab 导出文件里的快捷方式内容。',
      }),
      accept: '.data,.json,application/json,text/plain',
      badge: '.data',
      imageSrc: wetabImportIcon,
    },
  ];

  const resetPickerState = () => {
    setBusySource(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleSelectSource = (option: ImportSourceOption) => {
    const input = inputRef.current;
    if (!input) return;
    sourceRef.current = option.key;
    setBusySource(option.key);
    input.accept = option.accept;
    input.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      resetPickerState();
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      let payload: LeafTabLocalBackupImportData | null = null;
      try {
        const content = loadEvent.target?.result as string;
        const data = JSON.parse(content);
        payload = parseLeafTabLocalBackupImport(data);
        if (!payload) {
          throw new Error(`invalid_import_payload:${sourceRef.current || 'unknown'}`);
        }
      } catch (error) {
        console.error('Import source parsing failed:', error);
        toast.error(t('settings.backup.importError'));
        resetPickerState();
        return;
      }

      onOpenChange(false);
      Promise.resolve(onImportData(payload))
        .catch((error) => {
          console.error('Import source apply failed:', error);
        })
        .finally(() => {
          resetPickerState();
        });
    };
    reader.onerror = () => {
      toast.error(t('settings.backup.importError'));
      resetPickerState();
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] rounded-[32px] border-border bg-background text-foreground">
        <DialogHeader className="gap-3">
          <div className="flex items-center gap-2">
            {onBackToSettings ? <BackToSettingsButton onClick={onBackToSettings} /> : null}
            <DialogTitle className="text-foreground">
              {t('settings.backup.importSource.title', { defaultValue: '选择导入来源' })}
            </DialogTitle>
          </div>
          <DialogDescription className="not-sr-only text-sm leading-6 text-muted-foreground">
            {t('settings.backup.importSource.description', {
              defaultValue: '选择要导入的备份来源。LeafTab 会按来源识别文件格式，并且第三方备份只导入快捷方式。',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          {sourceOptions.map((option, index) => {
            const isBusy = busySource === option.key;
            return (
              <button
                key={option.key}
                type="button"
                className="group flex w-full items-center gap-4 rounded-[20px] border border-border/70 bg-secondary/35 px-4 py-4 text-left transition-colors hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70"
                onClick={() => handleSelectSource(option)}
                disabled={busySource !== null}
              >
                <img
                  src={option.imageSrc}
                  alt={option.title}
                  className="h-12 w-12 shrink-0 object-contain"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {index === 0
                        ? t('settings.backup.importSource.leaftabTitle', { defaultValue: '从 LeafTab 导入' })
                        : t(`settings.backup.importSource.${option.key}Title`, {
                            defaultValue: `从 ${option.title} 导入`,
                          })}
                    </span>
                    <span className="rounded-full border border-border/60 bg-background/75 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {option.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {option.description}
                  </p>
                </div>
                <div className="shrink-0 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors group-hover:bg-background">
                  {isBusy
                    ? t('common.loading', { defaultValue: '处理中' })
                    : t('settings.backup.importSource.chooseFile', { defaultValue: '选择文件' })}
                </div>
              </button>
            );
          })}
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </DialogContent>
    </Dialog>
  );
}
