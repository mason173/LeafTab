'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  type SpringOptions,
} from 'motion/react';

const SPRING_CONFIG = { stiffness: 26.7, damping: 4.1, mass: 0.2 };

export type MagneticProps = {
  children: React.ReactNode;
  intensity?: number;
  range?: number;
  actionArea?: 'self' | 'parent' | 'global';
  springOptions?: SpringOptions;
};

export function Magnetic({
  children,
  intensity = 0.6,
  range = 100,
  actionArea = 'self',
  springOptions = SPRING_CONFIG,
}: MagneticProps) {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, springOptions);
  const springY = useSpring(y, springOptions);

  const resetPosition = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const calculateDistance = useCallback((clientX: number, clientY: number) => {
    if (!ref.current || !isHovered) {
      resetPosition();
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = clientX - centerX;
    const distanceY = clientY - centerY;
    const absoluteDistance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

    if (absoluteDistance <= range) {
      const scale = 1 - absoluteDistance / range;
      x.set(distanceX * intensity * scale);
      y.set(distanceY * intensity * scale);
      return;
    }

    resetPosition();
  }, [intensity, isHovered, range, resetPosition, x, y]);

  useEffect(() => {
    if (actionArea === 'parent' && ref.current?.parentElement) {
      const parent = ref.current.parentElement;

      const handleParentEnter = () => setIsHovered(true);
      const handleParentLeave = () => {
        setIsHovered(false);
        resetPosition();
      };
      const handleParentMove = (event: MouseEvent) => {
        calculateDistance(event.clientX, event.clientY);
      };

      parent.addEventListener('mouseenter', handleParentEnter);
      parent.addEventListener('mouseleave', handleParentLeave);
      parent.addEventListener('mousemove', handleParentMove);

      return () => {
        parent.removeEventListener('mouseenter', handleParentEnter);
        parent.removeEventListener('mouseleave', handleParentLeave);
        parent.removeEventListener('mousemove', handleParentMove);
      };
    } else if (actionArea === 'global') {
      setIsHovered(true);
    }
  }, [actionArea, calculateDistance, resetPosition]);

  useEffect(() => {
    if (actionArea !== 'global') return;

    const handleGlobalMove = (event: MouseEvent) => {
      calculateDistance(event.clientX, event.clientY);
    };

    window.addEventListener('mousemove', handleGlobalMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
    };
  }, [actionArea, calculateDistance]);

  const handleMouseEnter = () => {
    if (actionArea === 'self') {
      setIsHovered(true);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (actionArea === 'self') {
      calculateDistance(event.clientX, event.clientY);
    }
  };

  const handleMouseLeave = () => {
    if (actionArea === 'self') {
      setIsHovered(false);
      resetPosition();
    }
  };

  return (
    <motion.div
      ref={ref}
      onMouseEnter={actionArea === 'self' ? handleMouseEnter : undefined}
      onMouseMove={actionArea === 'self' ? handleMouseMove : undefined}
      onMouseLeave={actionArea === 'self' ? handleMouseLeave : undefined}
      style={{
        x: springX,
        y: springY,
      }}
    >
      {children}
    </motion.div>
  );
}
