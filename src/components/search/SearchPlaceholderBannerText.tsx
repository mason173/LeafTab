import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchPlaceholderTextProps } from '@/components/search/SearchPlaceholderText.shared';

const PLACEHOLDER_SLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function SearchPlaceholderBannerText({
  text,
  className,
  fontSize,
  lineHeight,
  disableAnimation,
  lightweight = false,
}: SearchPlaceholderTextProps) {
  const [currentText, setCurrentText] = useState(text);
  const [previousText, setPreviousText] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const currentTextRef = useRef(currentText);
  const animationFrameRef = useRef<number | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);
  const transitionMs = useMemo(() => (lightweight ? 220 : 280), [lightweight]);

  useEffect(() => {
    if (!disableAnimation) return;
    currentTextRef.current = text;
    setCurrentText(text);
    setPreviousText(null);
    setIsAnimating(false);
  }, [disableAnimation, text]);

  useEffect(() => {
    if (disableAnimation || currentTextRef.current === text) return;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (cleanupTimerRef.current !== null) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    setPreviousText(currentTextRef.current);
    setCurrentText(text);
    setIsAnimating(false);
    currentTextRef.current = text;

    animationFrameRef.current = window.requestAnimationFrame(() => {
      setIsAnimating(true);
      animationFrameRef.current = null;
    });
    cleanupTimerRef.current = window.setTimeout(() => {
      setPreviousText(null);
      setIsAnimating(false);
      cleanupTimerRef.current = null;
    }, transitionMs);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (cleanupTimerRef.current !== null) {
        window.clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }
    };
  }, [disableAnimation, text, transitionMs]);

  if (disableAnimation) {
    return (
      <span
        className={className}
        style={{ fontSize, lineHeight: `${lineHeight}px` }}
      >
        {text}
      </span>
    );
  }

  const transition = `transform ${transitionMs}ms ${PLACEHOLDER_SLIDE_EASING}, opacity ${transitionMs}ms ${PLACEHOLDER_SLIDE_EASING}`;
  const previousTranslateY = isAnimating ? -lineHeight : 0;
  const currentTranslateY = previousText === null ? 0 : (isAnimating ? 0 : lineHeight);

  return (
    <span
      className={`${className} relative block overflow-hidden`}
      style={{
        fontSize,
        lineHeight: `${lineHeight}px`,
        height: lineHeight,
      }}
    >
      {previousText !== null ? (
        <span
          className="absolute inset-x-0 top-0 block truncate whitespace-nowrap"
          style={{
            transform: `translate3d(0, ${previousTranslateY}px, 0)`,
            opacity: isAnimating ? 0 : 1,
            transition,
            willChange: 'transform, opacity',
          }}
        >
          {previousText}
        </span>
      ) : null}
      <span
        className={`${previousText === null ? 'block' : 'absolute inset-x-0 top-0 block'} truncate whitespace-nowrap`}
        style={{
          transform: `translate3d(0, ${currentTranslateY}px, 0)`,
          opacity: previousText === null ? 1 : (isAnimating ? 1 : 0),
          transition: previousText === null ? 'none' : transition,
          willChange: previousText === null ? undefined : 'transform, opacity',
        }}
      >
        {currentText}
      </span>
    </span>
  );
}
