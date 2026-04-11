import { useRef } from 'react';

type ShortcutColorSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  background: string;
  thumbColor: string;
  disabled?: boolean;
  compact?: boolean;
  testId?: string;
  onChange: (value: number) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function ShortcutColorSlider({
  label,
  value,
  min,
  max,
  background,
  thumbColor,
  disabled = false,
  compact = false,
  testId,
  onChange,
}: ShortcutColorSliderProps) {
  const normalizedValue = clamp(value, min, max);
  const ratio = max === min ? 0 : (normalizedValue - min) / (max - min);
  const thumbSize = compact ? 28 : 30;
  const thumbRadius = thumbSize / 2;
  const thumbLeft = `calc(${ratio * 100}% + ${thumbRadius * (1 - 2 * ratio)}px)`;
  const trackRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const resolveValueFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return normalizedValue;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return normalizedValue;
    const nextRatio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return Math.round(min + nextRatio * (max - min));
  };

  const commitPointerValue = (clientX: number) => {
    const nextValue = resolveValueFromClientX(clientX);
    if (nextValue !== normalizedValue) onChange(nextValue);
  };

  const handleStep = (direction: 1 | -1) => {
    const nextValue = clamp(normalizedValue + direction, min, max);
    if (nextValue !== normalizedValue) onChange(nextValue);
  };

  return (
    <div
      className={`relative overflow-visible touch-none ${disabled ? 'opacity-45' : ''} ${compact ? 'h-7' : 'h-[30px]'}`}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={normalizedValue}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          handleStep(-1);
        }
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          handleStep(1);
        }
      }}
      onPointerDown={(event) => {
        if (disabled) return;
        activePointerIdRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        commitPointerValue(event.clientX);
      }}
      onPointerMove={(event) => {
        if (disabled) return;
        if (activePointerIdRef.current !== event.pointerId) return;
        commitPointerValue(event.clientX);
      }}
      onPointerUp={(event) => {
        if (activePointerIdRef.current !== event.pointerId) return;
        activePointerIdRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={(event) => {
        if (activePointerIdRef.current !== event.pointerId) return;
        activePointerIdRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
    >
      <div ref={trackRef} className="pointer-events-none absolute inset-0">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/18 ${
            compact ? 'h-[30px]' : 'h-8'
          }`}
          style={{ background }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_45%,rgba(0,0,0,0.08))]" />
        </div>

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white ${
            compact ? 'h-7 w-7' : 'h-[30px] w-[30px]'
          }`}
          style={{ left: thumbLeft }}
        >
          <div
            className="absolute inset-[4px] rounded-full border border-black/10"
            style={{ backgroundColor: thumbColor }}
          />
        </div>
      </div>

      <div data-testid={testId} className="absolute inset-0 z-10 cursor-pointer" />
    </div>
  );
}
