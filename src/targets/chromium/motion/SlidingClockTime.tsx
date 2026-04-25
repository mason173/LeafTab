"use client";

import React, { useRef, type CSSProperties } from 'react';
import { cn } from '@/components/ui/utils';
import { SlidingNumber } from '@/components/motion-primitives/sliding-number';
import { isDigits, type SlidingClockTimeProps } from '@/components/motion-primitives/slidingClockTime.shared';
import { useRenderedTimeDigitMetrics } from '@/components/motion-primitives/useRenderedTimeDigitMetrics';

export function SlidingClockTime({ time, className }: SlidingClockTimeProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const digitMetrics = useRenderedTimeDigitMetrics(rootRef);
  const digitMetricsStyle = {
    '--time-digit-width': `${digitMetrics.digitWidthEm}em`,
    '--time-digit-height': `${digitMetrics.digitHeightEm}em`,
  } as CSSProperties;
  const segments = time.split(':');

  return (
    <>
      <span className="sr-only">{time}</span>
      <span
        ref={rootRef}
        aria-hidden="true"
        className={cn('inline-flex items-center leading-none tabular-nums', className)}
        style={digitMetricsStyle}
      >
        {segments.map((segment, index) => {
          const value = Number.parseInt(segment, 10);

          if (!Number.isFinite(value) || !isDigits(segment)) {
            return (
              <React.Fragment key={`segment-${index}`}>
                {index > 0 ? <span className="mx-[0.06em]">:</span> : null}
                <span>{segment}</span>
              </React.Fragment>
            );
          }

          const shouldPadStart = index === 0 ? segment.length >= 2 : true;

          return (
            <React.Fragment key={`segment-${index}`}>
              {index > 0 ? <span className="mx-[0.06em]">:</span> : null}
              <SlidingNumber value={value} padStart={shouldPadStart} />
            </React.Fragment>
          );
        })}
      </span>
    </>
  );
}
