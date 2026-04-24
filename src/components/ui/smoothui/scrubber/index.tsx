"use client";

import { cn } from "@/components/ui/utils";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ScrubberProps {
  label?: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  ticks?: number;
  className?: string;
  disabled?: boolean;
  showLabel?: boolean;
  showValue?: boolean;
  valueText?: string;
  trackHeight?: number;
}

const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max);

const roundToStep = (val: number, step: number, min: number) =>
  Math.round((val - min) / step) * step + min;

const Scrubber = ({
  label = "Value",
  value: controlledValue,
  defaultValue = 0,
  onValueChange,
  onDragStart,
  onDragEnd,
  min = 0,
  max = 1,
  step = 0.01,
  decimals = 2,
  ticks = 9,
  className,
  disabled = false,
  showLabel = true,
  showValue = true,
  valueText,
  trackHeight = 52,
}: ScrubberProps) => {
  const shouldReduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const wasDraggingRef = useRef(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isHoverDevice, setIsHoverDevice] = useState(false);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const range = max - min;
  const percentage = range > 0 ? ((value - min) / range) * 100 : 0;
  const isActive = !disabled && (isDragging || (isHoverDevice && isHovering));

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setIsHoverDevice(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsHoverDevice(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setValue = useCallback(
    (newValue: number) => {
      if (disabled) return;
      const clamped = clamp(roundToStep(newValue, step, min), min, max);
      if (!isControlled) setInternalValue(clamped);
      onValueChange?.(clamped);
    },
    [disabled, step, min, max, isControlled, onValueChange]
  );

  const getValueFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect = track.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return min + ratio * range;
    },
    [min, range, value]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      trackRef.current?.setPointerCapture(e.pointerId);
      setIsDragging(true);
      setValue(getValueFromPointer(e.clientX));
    },
    [disabled, getValueFromPointer, setValue]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || disabled) return;
      setValue(getValueFromPointer(e.clientX));
    },
    [isDragging, disabled, getValueFromPointer, setValue]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePointerCancel = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleLostPointerCapture = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging && !wasDraggingRef.current) {
      onDragStart?.();
    }
    if (!isDragging && wasDraggingRef.current) {
      onDragEnd?.();
    }
    wasDraggingRef.current = isDragging;
  }, [isDragging, onDragEnd, onDragStart]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      let next: number | undefined;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          next = value + step;
          break;
        case "ArrowLeft":
        case "ArrowDown":
          next = value - step;
          break;
        case "Home":
          next = min;
          break;
        case "End":
          next = max;
          break;
        default:
          return;
      }
      e.preventDefault();
      setValue(next);
    },
    [disabled, value, step, min, max, setValue]
  );

  const springConfig = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.25, bounce: 0.1 };
  const displayValueText =
    valueText ?? (decimals > 0 ? value.toFixed(decimals) : String(Math.round(value)));

  return (
    <div className={cn("relative w-full select-none", className)}>
      <div
        aria-disabled={disabled}
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={Number(value.toFixed(decimals))}
        data-slot="scrubber-track"
        className={cn(
          "relative overflow-hidden rounded-[999px] bg-muted outline-offset-2",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        )}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        ref={trackRef}
        role="slider"
        style={{
          height: trackHeight,
          touchAction: "none",
        }}
        tabIndex={disabled ? -1 : 0}
      >
        <div
          data-slot="scrubber-fill"
          className="pointer-events-none absolute inset-y-0 left-0 bg-primary"
          style={{
            borderRadius: 999,
            width: `${percentage}%`,
            transition: isDragging
              ? "none"
              : "width 150ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />

        {ticks > 0 && (
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: ticks }, (_, i) => {
              const pos = ((i + 1) / (ticks + 1)) * 100;
              return (
                <div
                  data-slot="scrubber-tick"
                  className={cn(
                    "absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 rounded-full",
                    "bg-white/70"
                  )}
                  key={pos}
                  style={{ left: `${pos}%` }}
                />
              );
            })}
          </div>
        )}

        <div
          className="pointer-events-none absolute top-1/2 z-[3]"
          style={{
            left: `${percentage}%`,
            transform: "translateX(-50%) translateY(-50%)",
            transition: isDragging
              ? "none"
              : "left 150ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          <motion.div
            data-slot="scrubber-thumb"
            animate={{
              opacity: isActive ? 0.95 : 0.45,
              scaleX: isActive ? 1 : 0.7,
              scaleY: isActive ? 1 : 0.7,
            }}
            className="h-[22px] w-[4px] rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--background))]"
            transition={springConfig}
          />
        </div>

        {showLabel ? (
          <div
            data-slot="scrubber-label"
            className="pointer-events-none absolute top-1/2 left-4 z-[4] -translate-y-1/2 whitespace-nowrap text-sm text-white"
          >
            {label}
          </div>
        ) : null}

        {showValue ? (
          <div
            data-slot="scrubber-value"
            className="pointer-events-none absolute top-1/2 right-3 z-[4] -translate-y-1/2 text-sm font-medium text-white"
            style={{
              fontFamily: "ui-monospace, monospace",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {displayValueText}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Scrubber;
