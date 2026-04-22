export type SearchBarTheme = {
  surfaceClassName: string;
  triggerToneClassName: string;
  clearButtonClassName: string;
  inputClassName: string;
  placeholderClassName: string;
  linkIconClassName: string;
  dropdownSurfaceClassName: string;
  dropdownRowClassName: string;
  dropdownRowSelectedClassName: string;
  dropdownSecondaryTextClassName: string;
  engineDropdownSurfaceClassName: string;
  engineDropdownItemClassName: string;
  engineDropdownItemSelectedClassName: string;
  dropdownStatusLoadingContainerClassName: string;
  dropdownStatusInfoContainerClassName: string;
  dropdownStatusDotClassName: string;
  dropdownStatusTextClassName: string;
  dropdownStatusButtonClassName: string;
  dropdownClearButtonClassName: string;
  dropdownEmptyStateClassName: string;
  dropdownFooterClassName: string;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function resolveContrastRatio(args: {
  lighterLuminance: number;
  darkerLuminance: number;
}) {
  return (args.lighterLuminance + 0.05) / (args.darkerLuminance + 0.05);
}

function resolveWhiteForegroundContrast(backgroundLuminance: number) {
  return resolveContrastRatio({
    lighterLuminance: 1,
    darkerLuminance: clamp01(backgroundLuminance),
  });
}

function resolveBlackForegroundContrast(backgroundLuminance: number) {
  return resolveContrastRatio({
    lighterLuminance: clamp01(backgroundLuminance),
    darkerLuminance: 0,
  });
}

export function resolveSearchBarTheme(args: {
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
  resolvedTheme?: string;
  backgroundLuminance?: number | null;
  backgroundLuminanceRange?: {
    darkest: number;
    brightest: number;
  } | null;
}): SearchBarTheme {
  void args.blankMode;
  void args.subtleDarkTone;
  const regionalAverageCandidate = args.backgroundLuminance;
  const regionalRangeCandidate = args.backgroundLuminanceRange;
  const hasRegionalLuminance = typeof regionalAverageCandidate === 'number'
    && Number.isFinite(regionalAverageCandidate);
  const normalizedAverageLuminance = hasRegionalLuminance ? clamp01(regionalAverageCandidate) : null;
  const hasRegionalRange = regionalRangeCandidate !== null
    && regionalRangeCandidate !== undefined
    && typeof regionalRangeCandidate.darkest === 'number'
    && Number.isFinite(regionalRangeCandidate.darkest)
    && typeof regionalRangeCandidate.brightest === 'number'
    && Number.isFinite(regionalRangeCandidate.brightest);
  const normalizedDarkestLuminance = hasRegionalRange
    ? clamp01(Math.min(regionalRangeCandidate.darkest, regionalRangeCandidate.brightest))
    : null;
  const normalizedBrightestLuminance = hasRegionalRange
    ? clamp01(Math.max(regionalRangeCandidate.darkest, regionalRangeCandidate.brightest))
    : null;

  const prefersDarkForeground = (() => {
    if (args.resolvedTheme === 'light') {
      return true;
    }

    if (args.resolvedTheme === 'dark') {
      return false;
    }

    if (normalizedDarkestLuminance !== null && normalizedBrightestLuminance !== null) {
      const sampledAverage = normalizedAverageLuminance ?? (
        (normalizedDarkestLuminance + normalizedBrightestLuminance) / 2
      );

      const whiteWorstContrast = resolveWhiteForegroundContrast(normalizedBrightestLuminance);
      const blackWorstContrast = resolveBlackForegroundContrast(normalizedDarkestLuminance);
      const whiteAverageContrast = resolveWhiteForegroundContrast(sampledAverage);
      const blackAverageContrast = resolveBlackForegroundContrast(sampledAverage);

      const blackClearlyDominant = (
        blackWorstContrast >= 6.1
        && blackAverageContrast >= 9.2
        && (blackWorstContrast - whiteWorstContrast) >= 2.3
        && (blackAverageContrast - whiteAverageContrast) >= 3.4
        && sampledAverage >= 0.6
        && normalizedDarkestLuminance >= 0.46
      );

      if (blackClearlyDominant) {
        return true;
      }

      return false;
    }

    if (normalizedAverageLuminance !== null) {
      return normalizedAverageLuminance >= 0.8;
    }

    if (args.forceWhiteTheme) {
      return false;
    }

    return args.resolvedTheme !== 'dark';
  })();

  if (prefersDarkForeground) {
    return {
      surfaceClassName: 'overflow-hidden bg-transparent text-black/72 shadow-none',
      triggerToneClassName: 'text-black/50 transition-colors hover:text-black/72',
      clearButtonClassName: 'text-black/40 hover:bg-black/6 hover:text-black/70',
      inputClassName: 'bg-transparent dark:bg-transparent text-black/74 placeholder:text-black/34',
      placeholderClassName: 'text-black/34',
      linkIconClassName: 'text-black/46',
      dropdownSurfaceClassName: 'overflow-hidden bg-transparent text-black/72 shadow-none',
      dropdownRowClassName: 'text-black/76 hover:bg-black/5 hover:text-black/88 focus:bg-black/5 focus:text-black/88',
      dropdownRowSelectedClassName: 'bg-black/8 text-black/86',
      dropdownSecondaryTextClassName: 'text-black/44',
      engineDropdownSurfaceClassName: 'overflow-hidden bg-transparent text-black/78 shadow-none',
      engineDropdownItemClassName: 'text-black/76 hover:bg-black/5 hover:text-black/88 focus:bg-black/5 focus:text-black/88',
      engineDropdownItemSelectedClassName: 'bg-black/8 text-black/86',
      dropdownStatusLoadingContainerClassName: 'bg-black/6',
      dropdownStatusInfoContainerClassName: 'bg-black/6',
      dropdownStatusDotClassName: 'bg-black/45',
      dropdownStatusTextClassName: 'text-black/66',
      dropdownStatusButtonClassName: 'bg-black/10 text-black/72 hover:bg-black/16',
      dropdownClearButtonClassName: 'text-black/46 hover:text-black/72',
      dropdownEmptyStateClassName: 'text-black/46',
      dropdownFooterClassName: 'border-black/10 text-black/44',
    };
  }

  return {
    surfaceClassName: 'overflow-hidden bg-transparent text-white/92 shadow-none',
    triggerToneClassName: 'text-white/72 transition-colors hover:text-white/92',
    clearButtonClassName: 'text-white/58 hover:bg-white/8 hover:text-white/94',
    inputClassName: 'bg-transparent dark:bg-transparent text-white/92 placeholder:text-white/42',
    placeholderClassName: 'text-white/42',
    linkIconClassName: 'text-white/54',
    dropdownSurfaceClassName: 'overflow-hidden bg-transparent text-white/92 shadow-none',
    dropdownRowClassName: 'text-white/88 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white',
    dropdownRowSelectedClassName: 'bg-white/12 text-white',
    dropdownSecondaryTextClassName: 'text-white/52',
    engineDropdownSurfaceClassName: 'overflow-hidden bg-transparent text-white/92 shadow-none',
    engineDropdownItemClassName: 'text-white/88 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white',
    engineDropdownItemSelectedClassName: 'bg-white/12 text-white',
    dropdownStatusLoadingContainerClassName: 'bg-white/10',
    dropdownStatusInfoContainerClassName: 'bg-white/10',
    dropdownStatusDotClassName: 'bg-white/72',
    dropdownStatusTextClassName: 'text-white/82',
    dropdownStatusButtonClassName: 'bg-white/14 text-white/88 hover:bg-white/20',
    dropdownClearButtonClassName: 'text-white/58 hover:text-white/92',
    dropdownEmptyStateClassName: 'text-white/58',
    dropdownFooterClassName: 'border-white/12 text-white/52',
  };
}
