import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

type SyncChoice = 'cloud' | 'local' | 'merge' | null;

type SyncPreviewConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmChoice: SyncChoice;
  title: string;
  description: string;
  confirmCloudLabel: string;
  confirmLocalLabel: string;
  confirmMergeLabel?: string;
  onChoiceChange?: (choice: Exclude<SyncChoice, null>) => void;
  enableChoiceSwitch?: boolean;
  cloudCount: number;
  cloudTime: string;
  cloudPayload?: any | null;
  localCount: number;
  localTime: string;
  localPayload?: any | null;
  onConfirm: () => void;
  onCancel: () => void;
  requireDecision?: boolean;
};

type FlatShortcut = {
  rowKey: string;
  title: string;
  url: string;
  modeLabel: string;
};

type CompareRow = {
  key: string;
  local?: FlatShortcut;
  cloud?: FlatShortcut;
};

const getModeLabel = (mode: any): string => {
  const candidate = mode?.name || mode?.title || mode?.label || mode?.id || '';
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : '';
};

const normalizeUrl = (raw: unknown): string => {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return '';
  try {
    const parsed = new URL(value.includes('://') ? value : `https://${value}`);
    return parsed.href.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
};

const getShortcutKey = (modeId: string, item: any, index: number): string => {
  const url = normalizeUrl(item?.url);
  if (url) return `${modeId}::url::${url}`;
  const id = typeof item?.id === 'string' ? item.id.trim() : '';
  if (id) return `${modeId}::id::${id}`;
  const title = typeof item?.title === 'string' ? item.title.trim().toLowerCase() : '';
  if (title) return `${modeId}::title::${title}`;
  return `${modeId}::idx::${index}`;
};

const extractFlatShortcuts = (payload: any): FlatShortcut[] => {
  if (!payload || typeof payload !== 'object') return [];
  const modes = Array.isArray(payload.scenarioModes) ? payload.scenarioModes : [];
  const modeLabelMap = new Map<string, string>();
  modes.forEach((mode: any) => {
    if (typeof mode?.id === 'string' && mode.id) {
      modeLabelMap.set(mode.id, getModeLabel(mode));
    }
  });
  const scenarioShortcuts = payload?.scenarioShortcuts;
  if (!scenarioShortcuts || typeof scenarioShortcuts !== 'object') return [];
  const out: FlatShortcut[] = [];
  Object.entries(scenarioShortcuts).forEach(([modeId, list]) => {
    if (!Array.isArray(list)) return;
    const modeLabel = modeLabelMap.get(modeId) || modeId;
    list.forEach((item: any, index) => {
      const key = getShortcutKey(modeId, item, index);
      const title = (typeof item?.title === 'string' && item.title.trim()) ? item.title.trim() : '(Untitled)';
      const url = typeof item?.url === 'string' ? item.url.trim() : '';
      out.push({
        rowKey: key,
        title,
        url,
        modeLabel,
      });
    });
  });
  return out;
};

const buildCompareRows = (localPayload: any, cloudPayload: any): CompareRow[] => {
  const localItems = extractFlatShortcuts(localPayload);
  const cloudItems = extractFlatShortcuts(cloudPayload);
  const rowMap = new Map<string, CompareRow>();

  localItems.forEach((item) => {
    const prev = rowMap.get(item.rowKey) || { key: item.rowKey };
    prev.local = item;
    rowMap.set(item.rowKey, prev);
  });

  cloudItems.forEach((item) => {
    const prev = rowMap.get(item.rowKey) || { key: item.rowKey };
    prev.cloud = item;
    rowMap.set(item.rowKey, prev);
  });

  return Array.from(rowMap.values()).sort((a, b) => {
    const aMode = a.local?.modeLabel || a.cloud?.modeLabel || '';
    const bMode = b.local?.modeLabel || b.cloud?.modeLabel || '';
    if (aMode !== bMode) return aMode.localeCompare(bMode);
    const aTitle = a.local?.title || a.cloud?.title || '';
    const bTitle = b.local?.title || b.cloud?.title || '';
    return aTitle.localeCompare(bTitle);
  });
};

export function SyncPreviewConfirmDialog({
  open,
  onOpenChange,
  confirmChoice,
  title,
  description,
  confirmCloudLabel,
  confirmLocalLabel,
  confirmMergeLabel,
  onChoiceChange,
  enableChoiceSwitch = false,
  cloudCount,
  cloudTime,
  cloudPayload,
  localCount,
  localTime,
  localPayload,
  onConfirm,
  onCancel,
  requireDecision = false,
}: SyncPreviewConfirmDialogProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const currentChoice = (confirmChoice ?? 'merge') as Exclude<SyncChoice, null>;

  const rows = useMemo(
    () => buildCompareRows(localPayload, cloudPayload),
    [cloudPayload, localPayload],
  );

  const hint = useMemo(() => {
    if (currentChoice === 'local') {
      return isZh ? '右侧划线项将在同步后从云端删除' : 'Strikethrough items on the right will be removed from cloud after sync.';
    }
    if (currentChoice === 'cloud') {
      return isZh ? '左侧划线项将在同步后从本地删除' : 'Strikethrough items on the left will be removed from local after sync.';
    }
    if (currentChoice === 'merge') {
      return isZh ? '合并会保留两侧内容并去重（本地优先）' : 'Merge keeps both sides with deduplication (local-first).';
    }
    return description;
  }, [currentChoice, description, isZh]);

  const shouldStrike = (side: 'local' | 'cloud', row: CompareRow) => {
    if (currentChoice === 'local' && side === 'cloud') return !!row.cloud && !row.local;
    if (currentChoice === 'cloud' && side === 'local') return !!row.local && !row.cloud;
    return false;
  };

  const renderCell = (side: 'local' | 'cloud', row: CompareRow) => {
    const item = side === 'local' ? row.local : row.cloud;
    const deleted = shouldStrike(side, row);
    if (!item) {
      return <span className="text-xs text-muted-foreground/60">—</span>;
    }
    return (
      <>
        <div className={`truncate text-sm font-medium ${deleted ? 'line-through text-muted-foreground/65 decoration-2 decoration-destructive/80' : 'text-foreground'}`}>
          {item.title}
        </div>
        <div className={`mt-0.5 truncate text-xs ${deleted ? 'line-through text-muted-foreground/55 decoration-2 decoration-destructive/70' : 'text-muted-foreground'}`}>
          {item.url || '—'}
        </div>
        <div className={`mt-1 text-[11px] ${deleted ? 'line-through text-muted-foreground/50 decoration-2 decoration-destructive/70' : 'text-muted-foreground/80'}`}>
          {item.modeLabel}
        </div>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[520px] w-[520px] max-w-[calc(100vw-2rem)] max-h-[76vh] bg-background border-border text-foreground rounded-[32px] flex flex-col min-h-0 ${requireDecision ? '[&>button]:hidden' : ''}`}
        onEscapeKeyDown={(event) => {
          if (requireDecision) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (requireDecision) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        {enableChoiceSwitch && onChoiceChange ? (
          <Tabs
            value={currentChoice}
            onValueChange={(value) => onChoiceChange(value as Exclude<SyncChoice, null>)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 rounded-[16px]">
              <TabsTrigger value="merge" className="rounded-xl">{t('syncConflict.merge')}</TabsTrigger>
              <TabsTrigger value="cloud" className="rounded-xl">{t('syncConflict.useCloud')}</TabsTrigger>
              <TabsTrigger value="local" className="rounded-xl">{t('syncConflict.useLocal')}</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-secondary/25 px-3 py-2 text-sm shrink-0">
          <div className="min-w-0">
            <div className="font-medium text-foreground">{t('sync.local')}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{localCount} / {localTime || '—'}</div>
          </div>
          <div className="min-w-0 text-right">
            <div className="font-medium text-foreground">{t('sync.cloud')}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{cloudCount} / {cloudTime || '—'}</div>
          </div>
        </div>
        <div className="no-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2">
          <div className="grid grid-cols-2 gap-x-3">
            {rows.length === 0 ? (
              <div className="col-span-2 rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                {isZh ? '未读取到可对比的快捷方式数据' : 'No comparable shortcuts were found.'}
              </div>
            ) : (
              rows.map((row) => (
                <Fragment key={row.key}>
                  <div className="min-w-0 border-b border-border/45 py-2 pr-1">
                    {renderCell('local', row)}
                  </div>
                  <div className="min-w-0 border-b border-border/45 py-2 pl-1">
                    {renderCell('cloud', row)}
                  </div>
                </Fragment>
              ))
            )}
          </div>
        </div>
        <DialogFooter className="flex w-full gap-3 sm:gap-3 shrink-0">
          {!requireDecision ? (
            <Button
              variant="secondary"
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80"
              onClick={onCancel}
            >
              {t('common.cancel')}
            </Button>
          ) : null}
          <Button
            className={requireDecision ? 'w-full' : 'flex-1'}
            disabled={!confirmChoice}
            onClick={() => {
              if (!confirmChoice) {
                return;
              }
              onConfirm();
            }}
          >
            {currentChoice === 'cloud'
              ? confirmCloudLabel
              : currentChoice === 'merge'
                ? (confirmMergeLabel || confirmCloudLabel)
                : confirmLocalLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
