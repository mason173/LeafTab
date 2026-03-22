import { useEffect, useRef, useState } from 'react';
import type { SearchPlaceholderTextProps } from '@/components/search/SearchPlaceholderText.shared';

const PLACEHOLDER_SWAP_TRANSITION_MS = 180;

export function SearchPlaceholderText({
  text,
  className,
  fontSize,
  lineHeight,
  disableAnimation,
}: SearchPlaceholderTextProps) {
  const [currentText, setCurrentText] = useState(text);
  const [previousText, setPreviousText] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const currentTextRef = useRef(currentText);
  const animationFrameRef = useRef<number | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (disableAnimation) {
      currentTextRef.current = text;
      setCurrentText(text);
      setPreviousText(null);
      setIsAnimating(false);
    }
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
    }, PLACEHOLDER_SWAP_TRANSITION_MS);

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
  }, [disableAnimation, text]);

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

  return (
    <span
      className={`${className} relative block`}
      style={{ fontSize, lineHeight: `${lineHeight}px` }}
    >
      {previousText !== null ? (
        <span
          className="absolute inset-0 block truncate"
          style={{
            opacity: isAnimating ? 0 : 1,
            transform: `translateY(${isAnimating ? '-0.28em' : '0'})`,
            transition: `transform ${PLACEHOLDER_SWAP_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${PLACEHOLDER_SWAP_TRANSITION_MS}ms linear`,
          }}
        >
          {previousText}
        </span>
      ) : null}
      <span
        className="block truncate"
        style={{
          opacity: previousText === null ? 1 : (isAnimating ? 1 : 0),
          transform: `translateY(${previousText === null ? '0' : (isAnimating ? '0' : '0.28em')})`,
          transition: previousText === null
            ? 'none'
            : `transform ${PLACEHOLDER_SWAP_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${PLACEHOLDER_SWAP_TRANSITION_MS}ms linear`,
        }}
      >
        {currentText}
      </span>
    </span>
  );
}
