import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster, toast } from '@/components/ui/sonner';
import type { ShortcutDraft } from '@/types';
import type { ScenarioMode } from '@/scenario/scenario';
import { queryCurrentTabPrefill } from '@/popup/activeTab';
import { PopupShortcutComposer } from '@/popup/PopupShortcutComposer';
import { persistShortcutCustomIcon } from '@/utils/shortcutCustomIcons';
import { readShortcutScenarioContext, saveShortcutToLocalProfile } from '@/utils/shortcutPersistence';

type PrefillState = {
  title: string;
  url: string;
  icon: string;
};

const EMPTY_PREFILL: PrefillState = {
  title: '',
  url: '',
  icon: '',
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
    icon: prefill.icon,
  }), [prefill.icon, prefill.title, prefill.url]);

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
    <main className="w-full overflow-x-hidden bg-background px-2 py-2 text-foreground">
      <div className="mx-auto w-[392px] max-w-full">
        <PopupShortcutComposer
          initialShortcut={initialShortcut}
          title={t('popupShortcut.title', {
            defaultValue: '添加当前页面',
          })}
          description={description}
          scenarioModes={scenarioModes}
          selectedScenarioId={selectedScenarioId}
          onScenarioChange={setSelectedScenarioId}
          onCancel={() => {
            try {
              window.close();
            } catch {}
          }}
          onSave={handleSave}
        />
      </div>
      <Toaster />
    </main>
  );
}
