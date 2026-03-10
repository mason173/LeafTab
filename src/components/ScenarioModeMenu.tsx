import { forwardRef, useState, type ButtonHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { RiDeleteBin6Fill, RiPencilFill } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getScenarioIconByKey, type ScenarioMode } from "@/scenario/scenario";

function ScenarioModeChevronDown({ open }: { open: boolean }) {
  return (
    <svg className={`block size-full transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

const ScenarioModeButton = forwardRef<
  HTMLButtonElement,
  { mode: ScenarioMode; open: boolean } & ButtonHTMLAttributes<HTMLButtonElement>
>(function ScenarioModeButton({ mode, open, ...buttonProps }, ref) {
  const { t } = useTranslation();
  const Icon = getScenarioIconByKey(mode.icon);
  const displayName = mode.name;
  return (
    <button
      ref={ref}
      type="button"
      {...buttonProps}
      className="content-stretch flex gap-[6px] items-center justify-center p-[3px] relative rounded-[999px] shrink-0 cursor-pointer hover:bg-white/10 backdrop-blur-md transition-colors text-white/90 transform-gpu"
      data-name="ScenarioMode"
    >
      <div aria-hidden="true" className="absolute border border-white/10 border-solid inset-0 pointer-events-none rounded-[999px]" />
      <div className="relative shrink-0 size-[24px]">
        <div
          className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 rounded-[999px] size-[24px] flex items-center justify-center text-white"
          style={{ backgroundColor: mode.color }}
        >
          <Icon className="size-[14px]" />
        </div>
      </div>
      <div className="content-stretch flex gap-[4px] items-center justify-center pr-[6px] relative shrink-0">
        <p className="font-['PingFang_SC:Regular',sans-serif] leading-none not-italic relative shrink-0 text-inherit text-[13px]">
          {displayName}
        </p>
        <div className="relative shrink-0 size-[10px] text-white/60">
          <ScenarioModeChevronDown open={open} />
        </div>
      </div>
    </button>
  );
});

function ScenarioModeMenu({
  scenarioModes,
  selectedScenarioId,
  open,
  onOpenChange,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: {
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const selectedMode = scenarioModes.find((m) => m.id === selectedScenarioId) ?? scenarioModes[0];
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScenarioMode | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!selectedMode) return null;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <ScenarioModeButton mode={selectedMode} open={open} />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} className="w-[320px] p-[8px] bg-popover border-border text-foreground rounded-[24px] shadow-[0px_8px_24px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col gap-[6px]">
          <div className="px-[10px] pt-[8px] pb-[6px]">
            <p className="text-[12px] text-muted-foreground leading-none">{t('scenario.title')}</p>
          </div>
          <ScrollArea className="max-h-[260px]">
            <div className="flex flex-col gap-[4px] px-[4px]">
              {scenarioModes.map((mode) => {
                const Icon = getScenarioIconByKey(mode.icon);
                const selected = mode.id === selectedScenarioId;
                const hovered = hoveredId === mode.id;
                const canDelete = mode.id !== "default" && scenarioModes.length > 1;
                const actionsVisible = hovered;
                const displayName = mode.name;
                return (
                  <div
                    key={mode.id}
                    role="button"
                    tabIndex={0}
                    className={`w-full h-[44px] px-[10px] rounded-xl flex items-center justify-between transition-colors ${selected || hovered ? "bg-accent" : ""}`}
                    onMouseEnter={() => setHoveredId(mode.id)}
                    onMouseLeave={() => setHoveredId((prev) => (prev === mode.id ? null : prev))}
                    onFocus={() => setHoveredId(mode.id)}
                    onBlur={() => setHoveredId((prev) => (prev === mode.id ? null : prev))}
                    onClick={() => {
                      onSelect(mode.id);
                      onOpenChange(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      onSelect(mode.id);
                      onOpenChange(false);
                    }}
                  >
                    <div className="flex items-center gap-[10px] min-w-0">
                      <div className="size-[28px] rounded-[999px] shrink-0 flex items-center justify-center text-white" style={{ backgroundColor: mode.color }}>
                        <Icon className="size-[14px]" />
                      </div>
                      <p className="text-[14px] text-foreground leading-none truncate">{displayName}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-[8px]">
                      <div
                        className={`flex items-center gap-[6px] transition-opacity ${
                          actionsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                        }`}
                        aria-hidden={!actionsVisible}
                      >
                        <button
                          type="button"
                          className="size-[28px] rounded-[10px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/70 transition-colors"
                          aria-label={t('scenario.actionEdit')}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenChange(false);
                            onEdit(mode.id);
                          }}
                        >
                          <RiPencilFill className="size-[14px]" />
                        </button>
                        <button
                          type="button"
                          disabled={!canDelete}
                          className={`size-[28px] rounded-[10px] flex items-center justify-center transition-colors ${
                            canDelete
                              ? "text-muted-foreground hover:text-destructive hover:bg-destructive/15"
                              : "opacity-30 cursor-not-allowed text-muted-foreground"
                          }`}
                          aria-label={t('scenario.actionDelete')}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canDelete) return;
                            setDeleteTarget(mode);
                            setDeleteOpen(true);
                          }}
                        >
                          <RiDeleteBin6Fill className="size-[14px]" />
                        </button>
                      </div>
                      <div className="shrink-0 size-[18px] flex items-center justify-center">
                        <div className={`size-[6px] rounded-[999px] ${selected ? "bg-primary" : "bg-transparent"}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="px-[4px] pt-[6px]">
            <Button
              className="w-full h-[40px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80"
              onClick={() => {
                onOpenChange(false);
                onCreate();
              }}
            >
              {t('scenario.createButton')}
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(nextOpen) => {
            setDeleteOpen(nextOpen);
            if (!nextOpen) setDeleteTarget(null);
          }}
          title={t('scenario.deleteTitle')}
          description={deleteTarget ? t('scenario.deleteConfirmWithTarget', { name: deleteTarget.name }) : t('scenario.deleteConfirm')}
          confirmText={t('scenario.deleteButton')}
          onConfirm={() => {
            if (!deleteTarget) return;
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
            setDeleteOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export default ScenarioModeMenu;
