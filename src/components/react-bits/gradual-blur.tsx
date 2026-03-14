import { cn } from '@/components/ui/utils';

export type GradualBlurDirection = 'top' | 'right' | 'bottom' | 'left';
type GradualBlurCurve = 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out';

export type GradualBlurProps = {
  className?: string;
  direction?: GradualBlurDirection;
  layers?: number;
  blurStrength?: number;
  exponential?: boolean;
  curve?: GradualBlurCurve;
  opacity?: number;
};

const GRADIENT_DIRECTIONS: Record<GradualBlurDirection, string> = {
  top: 'to top',
  right: 'to right',
  bottom: 'to bottom',
  left: 'to left',
};

const CURVE_FUNCTIONS: Record<GradualBlurCurve, (progress: number) => number> = {
  linear: (progress) => progress,
  bezier: (progress) => progress * progress * (3 - 2 * progress),
  'ease-in': (progress) => progress * progress,
  'ease-out': (progress) => 1 - (1 - progress) ** 2,
  'ease-in-out': (progress) => (progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2),
};

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function GradualBlur({
  className,
  direction = 'bottom',
  layers = 5,
  blurStrength = 2,
  exponential = true,
  curve = 'bezier',
  opacity = 1,
}: GradualBlurProps) {
  const safeLayers = Math.max(2, Math.floor(layers));
  const safeStrength = Math.max(0, blurStrength);
  const safeOpacity = Math.max(0, Math.min(1, opacity));
  const increment = 100 / safeLayers;
  const curveFn = CURVE_FUNCTIONS[curve] ?? CURVE_FUNCTIONS.bezier;
  const gradientDirection = GRADIENT_DIRECTIONS[direction] ?? GRADIENT_DIRECTIONS.bottom;

  return (
    <div className={cn('relative isolate pointer-events-none', className)}>
      {Array.from({ length: safeLayers }).map((_, index) => {
        const i = index + 1;
        let progress = i / safeLayers;
        progress = curveFn(progress);

        const blurValueRem = exponential
          ? Math.pow(2, progress * 4) * 0.0625 * safeStrength
          : 0.0625 * (progress * safeLayers + 1) * safeStrength;

        const p1 = roundToOneDecimal(increment * i - increment);
        const p2 = roundToOneDecimal(increment * i);
        const p3 = roundToOneDecimal(increment * i + increment);
        const p4 = roundToOneDecimal(increment * i + increment * 2);

        let maskGradient = `transparent ${p1}%, black ${p2}%`;
        if (p3 <= 100) maskGradient += `, black ${p3}%`;
        if (p4 <= 100) maskGradient += `, transparent ${p4}%`;

        return (
          <div
            key={i}
            className="absolute inset-0 rounded-[inherit]"
            style={{
              maskImage: `linear-gradient(${gradientDirection}, ${maskGradient})`,
              WebkitMaskImage: `linear-gradient(${gradientDirection}, ${maskGradient})`,
              backdropFilter: `blur(${blurValueRem.toFixed(3)}rem)`,
              WebkitBackdropFilter: `blur(${blurValueRem.toFixed(3)}rem)`,
              opacity: safeOpacity,
            }}
          />
        );
      })}
    </div>
  );
}
