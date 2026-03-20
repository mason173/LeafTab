import { useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { RiLinkM } from '@/icons/ri-compat';
import { TextScramble } from '@/components/motion-primitives/text-scramble';
import { isSearchCommandShellValue } from '@/utils/searchCommands';
import { isUrl } from '@/utils';
import type { SearchEngine } from '@/types';
import { SearchEngineSwitcher } from '@/components/search/SearchEngineSwitcher';
import type { SearchBarTheme } from '@/components/search/searchBarTheme';

export type SearchFieldValueChangeHandler = (nextValue: string, nativeEvent?: Event) => void;

interface SearchFieldProps {
  value: string;
  onValueChange: SearchFieldValueChangeHandler;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFocusContainer: () => void;
  onOpenHistory: () => void;
  onClear: () => void;
  placeholder?: string;
  inlinePreview?: string;
  disablePlaceholderAnimation?: boolean;
  theme: SearchBarTheme;
  height?: number;
  inputFontSize?: number;
  horizontalPadding?: number;
  searchActionSize?: number;
  surfaceStyle?: React.CSSProperties;
  searchEngine: SearchEngine;
  onEngineSelect: (engine: SearchEngine) => void;
  dropdownOpen: boolean;
  onEngineOpenChange: (open: boolean) => void;
  showEngineSwitcher?: boolean;
}

function SearchFieldInput({
  value,
  onValueChange,
  inputRef,
  onOpenHistory,
  placeholder,
  inlinePreview,
  disablePlaceholderAnimation,
  theme,
  inputFontSize = 18,
}: {
  value: string;
  onValueChange: SearchFieldValueChangeHandler;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onOpenHistory: () => void;
  placeholder?: string;
  inlinePreview?: string;
  disablePlaceholderAnimation?: boolean;
  theme: SearchBarTheme;
  inputFontSize?: number;
}) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const textMeasureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const showLinkIcon = isUrl(value);
  const inputTextInsetPx = showLinkIcon ? 4 : 8;
  const placeholderText = placeholder || t('search.placeholder');
  const inputLineHeight = Math.round(inputFontSize * 1.35);
  const placeholderFontSize = Math.max(14, Math.round(inputFontSize * 0.88));
  const placeholderLineHeight = Math.round(placeholderFontSize * 1.35);
  const inlinePreviewFontSize = Math.max(10, inputFontSize - 4);
  const inlinePreviewLineHeight = Math.round(inlinePreviewFontSize * 1.35);
  const customCaretHeight = Math.max(16, Math.round(inputLineHeight * 0.95));
  const customCaretWidth = 2;

  const typedTextWidth = useMemo(() => {
    if (!inlinePreview || value.length === 0) return 0;
    if (typeof document === 'undefined') return Math.ceil(value.length * inputFontSize * 0.56);
    if (!textMeasureCanvasRef.current) {
      textMeasureCanvasRef.current = document.createElement('canvas');
    }
    const context = textMeasureCanvasRef.current.getContext('2d');
    if (!context) return Math.ceil(value.length * inputFontSize * 0.56);
    context.font = `400 ${inputFontSize}px "PingFang SC", sans-serif`;
    return Math.ceil(context.measureText(value).width);
  }, [inlinePreview, inputFontSize, value]);

  return (
    <div className="content-stretch relative flex flex-1 min-w-0 items-center gap-2">
      {showLinkIcon ? (
        <RiLinkM className={`size-4 shrink-0 ${theme.linkIconClassName}`} />
      ) : null}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value, e.nativeEvent);
        }}
        onFocus={() => {
          setIsFocused(true);
          if (value.length > 0) onOpenHistory();
        }}
        onBlur={() => setIsFocused(false)}
        onKeyDown={(e) => {
          const target = e.currentTarget;
          const selectionStart = target.selectionStart ?? value.length;
          const selectionEnd = target.selectionEnd ?? value.length;
          const hasCollapsedSelection = selectionStart === selectionEnd;
          const caretAtEnd = selectionEnd === value.length;
          if (e.key === 'Backspace' && isSearchCommandShellValue(value) && hasCollapsedSelection && caretAtEnd) {
            e.preventDefault();
            onValueChange('', e.nativeEvent);
          }
        }}
        placeholder=""
        aria-label={placeholderText}
        className={`h-auto w-full appearance-none rounded-none border-none bg-transparent py-0 pl-0 pr-0 font-['PingFang_SC:Regular',sans-serif] font-normal not-italic shadow-none outline-none caret-primary selection:bg-primary selection:text-primary-foreground focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:font-normal ${value.length === 0 ? 'focus:caret-transparent' : ''} ${theme.inputClassName}`}
        style={{
          fontSize: inputFontSize,
          lineHeight: `${inputLineHeight}px`,
          paddingLeft: `${inputTextInsetPx}px`,
        }}
      />
      {value.length > 0 && inlinePreview ? (
        <span
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 select-none whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 font-normal text-primary"
          style={{
            left: `${inputTextInsetPx + Math.ceil(typedTextWidth) + 4}px`,
            fontSize: inlinePreviewFontSize,
            lineHeight: `${inlinePreviewLineHeight}px`,
          }}
        >
          {inlinePreview}
        </span>
      ) : null}
      {value.length === 0 ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap ${theme.placeholderClassName}`}
          style={{
            left: `${inputTextInsetPx}px`,
            fontSize: placeholderFontSize,
            lineHeight: `${placeholderLineHeight}px`,
          }}
        >
          {disablePlaceholderAnimation ? (
            <span key={placeholderText} className="block truncate">
              {placeholderText}
            </span>
          ) : (
            <TextScramble
              key={placeholderText}
              as="span"
              className="block truncate"
              duration={0.52}
              speed={0.02}
            >
              {placeholderText}
            </TextScramble>
          )}
        </span>
      ) : null}
      {isFocused && value.length === 0 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-primary animate-[leaftab-caret-blink_1s_steps(1)_infinite]"
          style={{
            left: `${inputTextInsetPx}px`,
            width: `${customCaretWidth}px`,
            height: `${customCaretHeight}px`,
          }}
        />
      ) : null}
    </div>
  );
}

export function SearchField({
  value,
  onValueChange,
  inputRef,
  onFocusContainer,
  onOpenHistory,
  onClear,
  placeholder,
  inlinePreview,
  disablePlaceholderAnimation,
  theme,
  height = 52,
  inputFontSize = 18,
  horizontalPadding = 24,
  searchActionSize = 42,
  surfaceStyle,
  searchEngine,
  onEngineSelect,
  dropdownOpen,
  onEngineOpenChange,
  showEngineSwitcher = true,
}: SearchFieldProps) {
  const { t } = useTranslation();
  const clearButtonSize = Math.max(28, searchActionSize - 10);
  const leftPadding = showEngineSwitcher ? Math.max(10, horizontalPadding - 14) : horizontalPadding;
  const rightPadding = Math.max(12, horizontalPadding - 10);
  const gap = Math.max(8, Math.round(height * 0.2));

  return (
    <div
      className={`content-stretch group relative flex w-full min-w-0 self-stretch cursor-text items-center rounded-[999px] ${theme.surfaceClassName}`}
      style={{
        height,
        paddingLeft: leftPadding,
        paddingRight: rightPadding,
        gap,
        ...surfaceStyle,
      }}
      onClick={() => {
        onFocusContainer();
        if (value.length > 0) onOpenHistory();
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[999px] transition-colors" />
      {showEngineSwitcher ? (
        <SearchEngineSwitcher
          engine={searchEngine}
          isOpen={dropdownOpen}
          onOpenChange={onEngineOpenChange}
          onSelect={onEngineSelect}
          toneClassName={theme.triggerToneClassName}
          surfaceClassName={theme.engineDropdownSurfaceClassName}
          itemClassName={theme.engineDropdownItemClassName}
          itemSelectedClassName={theme.engineDropdownItemSelectedClassName}
        />
      ) : null}
      <SearchFieldInput
        value={value}
        onValueChange={onValueChange}
        inputRef={inputRef}
        onOpenHistory={onOpenHistory}
        placeholder={placeholder}
        inlinePreview={inlinePreview}
        disablePlaceholderAnimation={disablePlaceholderAnimation}
        theme={theme}
        inputFontSize={inputFontSize}
      />
      {value.length > 0 ? (
        <button
          type="button"
          aria-label={t('common.clear')}
          title={t('common.clear')}
          className={`relative flex shrink-0 items-center justify-center rounded-[999px] transition-colors ${theme.clearButtonClassName}`}
          style={{ width: clearButtonSize, height: clearButtonSize }}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
            inputRef.current?.focus();
          }}
        >
          <span className="leading-none" style={{ fontSize: Math.max(16, inputFontSize) }}>×</span>
        </button>
      ) : null}
    </div>
  );
}
