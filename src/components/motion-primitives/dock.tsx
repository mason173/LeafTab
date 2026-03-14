'use client';

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
} from 'motion/react';
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/components/ui/utils';

const DOCK_HEIGHT = 156;
const DEFAULT_BASE_SIZE = 64;
const DEFAULT_MAGNIFICATION = 96;
const DEFAULT_DISTANCE = 150;
const DEFAULT_PANEL_HEIGHT = 76;

export type DockProps = {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  panelHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
  disabled?: boolean;
};

export type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
};

export type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
};

export type DockIconProps = {
  className?: string;
  children: React.ReactNode;
};

type DockContextValue = {
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  magnification: number;
  distance: number;
};

const DockContext = createContext<DockContextValue | undefined>(undefined);

function DockProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: DockContextValue;
}) {
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within a DockProvider');
  }
  return context;
}

function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_HEIGHT,
  disabled = false,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(() => {
    return Math.max(DOCK_HEIGHT, magnification + magnification / 2 + 4);
  }, [magnification]);

  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  useEffect(() => {
    if (!disabled) return;
    isHovered.set(0);
    mouseX.set(Infinity);
  }, [disabled, isHovered, mouseX]);

  return (
    <motion.div
      style={{
        height,
        scrollbarWidth: 'none',
      }}
      className="mx-2 flex max-w-full items-end overflow-x-auto"
    >
      <motion.div
        onMouseMove={({ pageX }) => {
          if (disabled) return;
          isHovered.set(1);
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className={cn(
          'mx-auto flex w-fit gap-1 rounded-[32px] bg-foreground/86 px-2',
          className,
        )}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
        aria-disabled={disabled}
      >
        <DockProvider value={{ mouseX, spring, distance, magnification }}>
          {children}
        </DockProvider>
      </motion.div>
    </motion.div>
  );
}

const DockItem = forwardRef<HTMLDivElement, DockItemProps>(function DockItem(
  { children, className, onClick },
  forwardedRef,
) {
  const localRef = useRef<HTMLDivElement>(null);
  const { distance, magnification, mouseX, spring } = useDock();
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = localRef.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return value - rect.x - rect.width / 2;
  });

  const widthTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [DEFAULT_BASE_SIZE, magnification, DEFAULT_BASE_SIZE],
  );
  const width = useSpring(widthTransform, spring);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.key === 'Enter' || event.key === ' ') && onClick) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <motion.div
      ref={(node) => {
        localRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      }}
      style={{ width }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onKeyDown={handleKeyDown}
      className={cn('relative inline-flex items-center justify-center', className)}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
      onClick={onClick}
    >
      {Children.map(children, (child) =>
        cloneElement(child as React.ReactElement<any>, { width, isHovered }),
      )}
    </motion.div>
  );
});

function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const props = rest as Record<string, MotionValue<number>>;
  const isHovered = props.isHovered;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute -top-6 left-1/2 w-fit whitespace-pre rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-neutral-700 dark:border-neutral-900 dark:bg-neutral-800 dark:text-white',
            className,
          )}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DockIcon({ children, className, ...rest }: DockIconProps) {
  const props = rest as Record<string, MotionValue<number>>;
  const width = props.width;
  const widthTransform = useTransform(width, (value) => Math.max(40, value - 16));

  return (
    <motion.div
      style={{ width: widthTransform, height: widthTransform }}
      className={cn('flex items-center justify-center', className)}
    >
      {children}
    </motion.div>
  );
}

export { Dock, DockIcon, DockItem, DockLabel };
