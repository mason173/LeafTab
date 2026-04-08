import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster, toast } from '@/components/ui/sonner';
import { ShortcutEditorPanel } from '@/components/ShortcutEditorPanel';
import type { ShortcutDraft } from '@/types';
import type { ScenarioMode } from '@/scenario/scenario';
import { queryCurrentTabPrefill } from '@/popup/activeTab';
import { persistShortcutCustomIcon } from '@/utils/shortcutCustomIcons';
import { readShortcutScenarioContext, saveShortcutToLocalProfile } from '@/utils/shortcutPersistence';

type PrefillState = {
  title: string;
  url: string;
};

const EMPTY_PREFILL: PrefillState = {
  title: '',
  url: '',
};

export function PopupApp() {
  const { t } = useTranslation();
  const [prefill, setPrefill] = useState<PrefillState>(EMPTY_PREFILL);
  const [loading, setLoading] = useState(true);
  const [scenarioModes, setScenarioModes] = useState<ScenarioMode[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');

  useEffect(() => {
    const { snapshot, selectedScenario } = readShortcutScenarioContext();
    setScenarioModes(snapshot.scenarioModes);
    setSelectedScenarioId(selectedScenario?.id || snapshot.selectedScenarioId || '');

    let cancelled = false;
    void queryCurrentTabPrefill().then((nextPrefill) => {
      if (cancelled) return;
      setPrefill(nextPrefill);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedScenarioName = useMemo(
    () => scenarioModes.find((mode) => mode.id === selectedScenarioId)?.name || '',
    [scenarioModes, selectedScenarioId],
  );

  const description = useMemo(() => {
    if (loading) {
      return t('popupShortcut.loading', {
        defaultValue: '正在读取当前标签页信息…',
      });
    }

    if (selectedScenarioName) {
      return t('popupShortcut.targetScenario', {
        defaultValue: '将保存到「{{name}}」场景',
        name: selectedScenarioName,
      });
    }

    return t('popupShortcut.ready', {
      defaultValue: '已自动填入当前标签页标题和网址。',
    });
  }, [loading, selectedScenarioName, t]);

  const initialShortcut = useMemo(() => ({
    title: prefill.title,
    url: prefill.url,
  }), [prefill.title, prefill.url]);

  const handleSave = (
    draft: ShortcutDraft,
    localOnly?: {
      useCustomIcon?: boolean;
      customIconDataUrl?: string | null;
    },
  ) => {
    const result = saveShortcutToLocalProfile(draft, {
      scenarioId: selectedScenarioId || undefined,
    });
    if (!result.ok) {
      toast.error(t('shortcutModal.errors.duplicateUrl'), {
        description: t('shortcutModal.errors.duplicateUrlDesc'),
      });
      return;
    }

    if (localOnly?.useCustomIcon && localOnly.customIconDataUrl) {
      persistShortcutCustomIcon(result.savedShortcut.id, localOnly.customIconDataUrl);
    }

    toast.success(t('popupShortcut.saved', {
      defaultValue: '快捷方式已保存',
    }));

    window.setTimeout(() => {
      try {
        window.close();
      } catch {}
    }, 180);
  };

  return (
    <main className="w-full bg-background px-2 py-2 text-foreground">
      <div className="mx-auto w-[388px] max-w-full bg-background px-2 py-2">
        <ShortcutEditorPanel
          mode="add"
          open
          initialShortcut={initialShortcut}
          title={t('popupShortcut.title', {
            defaultValue: '添加当前页面',
          })}
          description={description}
          afterUrlField={(
            <div className="space-y-2">
              <div className="px-1 text-left text-xs font-medium text-muted-foreground">
                {t('popupShortcut.scenarioLabel', {
                  defaultValue: '保存到情景模式',
                })}
              </div>
              <select
                data-testid="popup-scenario-select"
                value={selectedScenarioId}
                onChange={(event) => setSelectedScenarioId(event.target.value)}
                className="h-9 w-full rounded-[14px] border border-border bg-secondary/30 px-3.5 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
              >
                {scenarioModes.length === 0 ? (
                  <option value="">
                    {t('popupShortcut.scenarioPlaceholder', {
                      defaultValue: '选择情景模式',
                    })}
                  </option>
                ) : null}
                {scenarioModes.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          onCancel={() => {
            try {
              window.close();
            } catch {}
          }}
          onSave={handleSave}
          compact
          containerClassName="flex flex-col"
          bodyClassName="mt-3 flex flex-col gap-4"
          footerClassName="mt-3 flex w-full gap-2.5"
          previewSize={56}
        />
      </div>
      <Toaster />
    </main>
  );
}
