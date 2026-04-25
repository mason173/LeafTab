"use client";

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/ui/utils';
import { isDigits, type SlidingClockTimeProps } from '@/components/motion-primitives/slidingClockTime.shared';
import {
  useRenderedTimeDigitMetrics,
} from '@/components/motion-primitives/useRenderedTimeDigitMetrics';
import type { RenderedTimeDigitMetrics } from '@/utils/timeFontMetrics';

const DIGIT_TRANSITION_MS = 220;
const DIGIT_TRANSITION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function resolveDigitDirection(previousDigit: string, nextDigit: string): 1 | -1 {
  const previous = Number.parseInt(previousDigit, 10);
  const next = Number.parseInt(nextDigit, 10);
  if (!Number.isFinite(previous) || !Number.isFinite(next) || previous === next) return 1;

  const forwardDistance = (next - previous + 10) % 10;
  return forwardDistance === 0 || forwardDistance <= 5 ? 1 : -1;
}

function SlidingDigit({
  digit,
  metrics,
}: {
  digit: string;
  metrics: RenderedTimeDigitMetrics;
}) {
  const [previousDigit, setPreviousDigit] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const latestDigitRef = useRef(digit);
  const animationFrameRef = useRef<number | null>(null);
  const clearPreviousTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (latestDigitRef.current === digit) return;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (clearPreviousTimerRef.current !== null) {
      window.clearTimeout(clearPreviousTimerRef.current);
      clearPreviousTimerRef.current = null;
    }

    setDirection(resolveDigitDirection(latestDigitRef.current, digit));
    setPreviousDigit(latestDigitRef.current);
    setIsAnimating(false);
    latestDigitRef.current = digit;

    animationFrameRef.current = window.requestAnimationFrame(() => {
      setIsAnimating(true);
      animationFrameRef.current = null;
    });
    clearPreviousTimerRef.current = window.setTimeout(() => {
      setPreviousDigit(null);
      setIsAnimating(false);
      clearPreviousTimerRef.current = null;
    }, DIGIT_TRANSITION_MS);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (clearPreviousTimerRef.current !== null) {
        window.clearTimeout(clearPreviousTimerRef.current);
        clearPreviousTimerRef.current = null;
      }
    };
  }, [digit]);

  return (
    <span
      aria-hidden="true"
      className="relative inline-flex w-[1ch] overflow-hidden align-baseline leading-none tabular-nums"
      style={{ width: `${metrics.digitWidthEm}em`, height: `${metrics.digitHeightEm}em` }}
    >
      {previousDigit !== null ? (
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{
            opacity: isAnimating ? 0 : 1,
            transform: `translateY(${isAnimating ? -direction * metrics.digitTranslateEm : 0}em)`,
            transition: `transform ${DIGIT_TRANSITION_MS}ms ${DIGIT_TRANSITION_EASING}, opacity ${DIGIT_TRANSITION_MS}ms linear`,
          }}
        >
          {previousDigit}
        </span>
      ) : null}
      <span
        className="flex items-center justify-center"
        style={{
          opacity: previousDigit === null ? 1 : (isAnimating ? 1 : 0),
          transform: `translateY(${previousDigit === null ? 0 : (isAnimating ? 0 : direction * metrics.digitTranslateEm)}em)`,
          transition: previousDigit === null
            ? 'none'
            : `transform ${DIGIT_TRANSITION_MS}ms ${DIGIT_TRANSITION_EASING}, opacity ${DIGIT_TRANSITION_MS}ms linear`,
        }}
      >
        {digit}
      </span>
    </span>
  );
}

export function SlidingClockTime({ time, className }: SlidingClockTimeProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const digitMetrics = useRenderedTimeDigitMetrics(rootRef);

  return (
    <>
      <span className="sr-only">{time}</span>
      <span
        ref={rootRef}
        aria-hidden="true"
        className={cn('inline-flex items-center leading-none tabular-nums', className)}
      >
        {Array.from(time).map((character, index) => {
          if (isDigits(character)) {
            return <SlidingDigit key={`digit-${index}`} digit={character} metrics={digitMetrics} />;
          }
          return (
            <span key={`separator-${index}`} className="mx-[0.06em]">
              {character}
            </span>
          );
        })}
      </span>
    </>
  );
}
