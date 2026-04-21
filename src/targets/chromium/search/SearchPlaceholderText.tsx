import { useEffect, useRef, useState } from 'react';
import type { SearchPlaceholderTextProps } from '@/components/search/SearchPlaceholderText.shared';

const PLACEHOLDER_FADE_TRANSITION_MS = 320;
const PLACEHOLDER_FADE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const PLACEHOLDER_FADE_BLUR_PX = 2;

function FadePlaceholderText({
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
    }, PLACEHOLDER_FADE_TRANSITION_MS);

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
            filter: `blur(${isAnimating ? PLACEHOLDER_FADE_BLUR_PX : 0}px)`,
            transition: `opacity ${PLACEHOLDER_FADE_TRANSITION_MS}ms ${PLACEHOLDER_FADE_EASING}, filter ${PLACEHOLDER_FADE_TRANSITION_MS}ms ${PLACEHOLDER_FADE_EASING}`,
            willChange: 'opacity, filter',
          }}
        >
          {previousText}
        </span>
      ) : null}
      <span
        className="block truncate"
        style={{
          opacity: previousText === null ? 1 : (isAnimating ? 1 : 0),
          filter: previousText === null
            ? 'blur(0px)'
            : `blur(${isAnimating ? 0 : PLACEHOLDER_FADE_BLUR_PX}px)`,
          transition: previousText === null
            ? 'none'
            : `opacity ${PLACEHOLDER_FADE_TRANSITION_MS}ms ${PLACEHOLDER_FADE_EASING}, filter ${PLACEHOLDER_FADE_TRANSITION_MS}ms ${PLACEHOLDER_FADE_EASING}`,
          willChange: previousText === null ? undefined : 'opacity, filter',
        }}
      >
        {currentText}
      </span>
    </span>
  );
}

export function SearchPlaceholderText({
  text,
  className,
  fontSize,
  lineHeight,
  disableAnimation,
}: SearchPlaceholderTextProps) {
  return (
    <FadePlaceholderText
      text={text}
      className={className}
      fontSize={fontSize}
      lineHeight={lineHeight}
      disableAnimation={disableAnimation}
    />
  );
}
