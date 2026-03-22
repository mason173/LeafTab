"use client";

import React from 'react';
import { cn } from '@/components/ui/utils';
import { SlidingNumber } from '@/components/motion-primitives/sliding-number';
import { isDigits, type SlidingClockTimeProps } from '@/components/motion-primitives/slidingClockTime.shared';

export function SlidingClockTime({ time, className }: SlidingClockTimeProps) {
  const segments = time.split(':');

  return (
    <>
      <span className="sr-only">{time}</span>
      <span
        aria-hidden="true"
        className={cn('inline-flex items-center leading-none tabular-nums', className)}
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
