import { useTranslation } from 'react-i18next';
import { SHORTCUT_GUIDE_SECTIONS } from '@/config/shortcutGuide';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BackToSettingsButton } from '@/components/BackToSettingsButton';
import { IS_STORE_BUILD } from '@/config/distribution';
import type { ShortcutGuideItemId } from '@/config/shortcutGuide';

interface ShortcutGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToSettings?: () => void;
}

function ShortcutKeyCaps({ combo }: { combo: readonly string[] }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {combo.map((token, index) => (
        <span key={`${token}-${index}`} className="inline-flex items-center gap-1.5">
          {index > 0 ? <span className="text-muted-foreground">+</span> : null}
          <kbd className="no-pill-radius inline-flex min-h-8 items-center rounded-[10px] border border-border/70 bg-background/75 px-2.5 py-1 text-[12px] font-medium text-foreground shadow-sm">
            {token}
          </kbd>
        </span>
      ))}
    </span>
  );
}

export function ShortcutGuideDialog({ open, onOpenChange, onBackToSettings }: ShortcutGuideDialogProps) {
  const { t } = useTranslation();
  const resolveItemLabel = (itemId: ShortcutGuideItemId) => {
    if (IS_STORE_BUILD && itemId === 'bookmarksMode') {
      return t('settings.shortcutGuide.items.bookmarksModeStore', {
        defaultValue: '进入书签搜索模式，直接搜索浏览器书签',
      });
    }
    if (IS_STORE_BUILD && itemId === 'tabsMode') {
      return t('settings.shortcutGuide.items.tabsModeStore', {
        defaultValue: '进入标签页搜索模式，直接搜索已打开标签页',
      });
    }
    return t(`settings.shortcutGuide.items.${itemId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[740px] max-h-[85vh] overflow-visible bg-background border-border text-foreground rounded-[32px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <BackToSettingsButton onClick={onBackToSettings} />
            <DialogTitle>{t('settings.shortcutGuide.title')}</DialogTitle>
          </div>
          <DialogDescription>{t('settings.shortcutGuide.dialogDescription')}</DialogDescription>
        </DialogHeader>
        <ScrollArea
          className="max-h-[68vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          <div className="flex flex-col gap-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {t('settings.shortcutGuide.helper')}
            </p>

            {SHORTCUT_GUIDE_SECTIONS.map((section, sectionIndex) => (
              <section key={section.id} className="flex flex-col gap-3">
                {sectionIndex > 0 ? <Separator className="bg-border/60" /> : null}
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t(`settings.shortcutGuide.sections.${section.id}`)}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {section.items.length} {t('settings.shortcutGuide.countSuffix')}
                  </span>
                </div>

                <div className="overflow-hidden rounded-[22px] border border-border/60 bg-secondary/20">
                  <table className="w-full table-fixed border-collapse">
                    <thead className="bg-background/65">
                      <tr className="border-b border-border/60">
                        <th className="w-[42%] px-4 py-3 text-left text-[12px] font-medium text-muted-foreground">
                          {t('settings.shortcutGuide.columns.shortcut')}
                        </th>
                        <th className="px-4 py-3 text-left text-[12px] font-medium text-muted-foreground">
                          {t('settings.shortcutGuide.columns.action')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, itemIndex) => (
                        <tr
                          key={item.id}
                          className={itemIndex > 0 ? 'border-t border-border/50' : undefined}
                        >
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                              {item.combos.map((combo, comboIndex) => (
                                <div key={`${item.id}-${comboIndex}`} className="flex items-center gap-2 shrink-0">
                                  {comboIndex > 0 ? (
                                    <span className="text-xs text-muted-foreground">/</span>
                                  ) : null}
                                  <ShortcutKeyCaps combo={combo} />
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm leading-6 text-foreground/85 break-words">
                            {resolveItemLabel(item.id)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}

            <p className="text-xs leading-5 text-muted-foreground">
              {t('settings.shortcutGuide.footer')}
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
