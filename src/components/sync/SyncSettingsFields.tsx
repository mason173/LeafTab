import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch, SwitchThumb } from '@/components/animate-ui/primitives/radix/switch';

type SyncNameInputFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  inputClassName?: string;
};

export function SyncNameInputField({
  label,
  value,
  placeholder,
  onChange,
  inputClassName = 'bg-secondary/40 border-border',
}: SyncNameInputFieldProps) {
  return (
    <div className="grid gap-2 min-w-0 flex-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </div>
  );
}

type SyncIntervalSliderFieldProps = {
  label: string;
  options: number[];
  value: number;
  valueLabel: string;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export function SyncIntervalSliderField({
  label,
  options,
  value,
  valueLabel,
  onChange,
  disabled = false,
}: SyncIntervalSliderFieldProps) {
  const safeIndex = Math.max(0, options.indexOf(value));
  return (
    <div className={`grid gap-2 ${disabled ? 'opacity-55' : ''}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Slider
        min={0}
        max={options.length - 1}
        step={1}
        value={[safeIndex]}
        onValueChange={(v: number[]) => {
          if (disabled) return;
          onChange(options[v[0]] ?? options[0]);
        }}
        disabled={disabled}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {options.map((item) => (
          <span key={item}>{item}m</span>
        ))}
      </div>
      <div className="text-sm font-medium">{valueLabel}</div>
    </div>
  );
}

type SyncToggleFieldProps = {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function SyncToggleField({
  label,
  description,
  checked,
  onCheckedChange,
}: SyncToggleFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium leading-none">{label}</span>
        {description ? (
          <span className="mt-1 text-xs text-muted-foreground">{description}</span>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
      >
        <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
      </Switch>
    </div>
  );
}

type SyncSettingsActionButtonsProps = {
  cancelLabel: string;
  saveLabel: string;
  onCancel: () => void;
  onSave: () => void;
  cancelDisabled?: boolean;
  saveDisabled?: boolean;
};

export function SyncSettingsActionButtons({
  cancelLabel,
  saveLabel,
  onCancel,
  onSave,
  cancelDisabled = false,
  saveDisabled = false,
}: SyncSettingsActionButtonsProps) {
  return (
    <>
      <Button
        className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80"
        onClick={onCancel}
        disabled={cancelDisabled}
      >
        {cancelLabel}
      </Button>
      <Button className="flex-1" onClick={onSave} disabled={saveDisabled}>
        {saveLabel}
      </Button>
    </>
  );
}
