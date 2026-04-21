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

export function resolveSearchBarTheme(args: {
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
  resolvedTheme?: string;
}): SearchBarTheme {
  const { blankMode, forceWhiteTheme, subtleDarkTone, resolvedTheme } = args;
  const defaultTheme: SearchBarTheme = {
    surfaceClassName: 'text-foreground',
    triggerToneClassName: 'text-foreground/70',
    clearButtonClassName: 'text-muted-foreground hover:text-foreground',
    inputClassName: 'bg-transparent dark:bg-transparent text-foreground placeholder:text-muted-foreground',
    placeholderClassName: 'text-muted-foreground',
    linkIconClassName: 'text-muted-foreground',
    dropdownSurfaceClassName: 'bg-popover text-popover-foreground border-border',
    dropdownRowClassName: 'text-foreground hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground',
    dropdownRowSelectedClassName: 'bg-accent text-foreground',
    dropdownSecondaryTextClassName: 'text-muted-foreground',
    engineDropdownSurfaceClassName: 'border-border bg-transparent text-foreground shadow-lg backdrop-blur-none',
    engineDropdownItemClassName: 'text-foreground hover:bg-accent hover:text-foreground',
    engineDropdownItemSelectedClassName: 'bg-accent text-foreground',
    dropdownStatusLoadingContainerClassName: 'bg-primary/10',
    dropdownStatusInfoContainerClassName: 'bg-primary/10',
    dropdownStatusDotClassName: 'bg-primary',
    dropdownStatusTextClassName: 'text-primary',
    dropdownStatusButtonClassName: 'bg-primary/15 text-primary hover:bg-primary/25',
    dropdownClearButtonClassName: 'text-muted-foreground hover:text-foreground',
    dropdownEmptyStateClassName: 'text-muted-foreground',
    dropdownFooterClassName: 'border-border text-muted-foreground',
  };
  const darkTheme: SearchBarTheme = {
    ...defaultTheme,
    surfaceClassName: 'text-foreground',
    engineDropdownSurfaceClassName: 'border-border bg-transparent text-popover-foreground shadow-lg backdrop-blur-none',
  };

  if (resolvedTheme === 'dark') {
    return darkTheme;
  }

  if (forceWhiteTheme) {
    return {
      surfaceClassName: 'text-black/85',
      triggerToneClassName: subtleDarkTone ? 'text-black/35' : 'text-black/55',
      clearButtonClassName: 'text-black/45 hover:text-black/80',
      inputClassName: subtleDarkTone
        ? 'bg-transparent dark:bg-transparent text-black/85 placeholder:text-black/30'
        : 'bg-transparent dark:bg-transparent text-black/85 placeholder:text-black/40',
      placeholderClassName: subtleDarkTone ? 'text-black/30' : 'text-black/40',
      linkIconClassName: subtleDarkTone ? 'text-black/20' : 'text-black/45',
      dropdownSurfaceClassName: 'bg-white text-black/85 border-black/10 shadow-lg',
      dropdownRowClassName: 'text-black/85 hover:bg-black/5 hover:text-black focus:bg-black/5 focus:text-black',
      dropdownRowSelectedClassName: 'bg-black/8 text-black',
      dropdownSecondaryTextClassName: 'text-black/40',
      engineDropdownSurfaceClassName: 'border-black/10 bg-transparent text-black/85 shadow-lg backdrop-blur-none',
      engineDropdownItemClassName: 'text-black/85 hover:bg-black/5 hover:text-black',
      engineDropdownItemSelectedClassName: 'bg-black/8 text-black',
      dropdownStatusLoadingContainerClassName: 'bg-black/6',
      dropdownStatusInfoContainerClassName: 'bg-black/5',
      dropdownStatusDotClassName: 'bg-black/45',
      dropdownStatusTextClassName: 'text-black/65',
      dropdownStatusButtonClassName: 'bg-black/10 text-black/75 hover:bg-black/15',
      dropdownClearButtonClassName: 'text-black/45 hover:text-black/80',
      dropdownEmptyStateClassName: 'text-black/45',
      dropdownFooterClassName: 'border-black/10 text-black/45',
    };
  }

  if (blankMode) {
    return {
      surfaceClassName: 'text-white/56',
      triggerToneClassName: 'text-white/60',
      clearButtonClassName: 'text-white/40 hover:text-white/80',
      inputClassName: 'bg-transparent dark:bg-transparent text-white/80 placeholder:text-white/40',
      placeholderClassName: 'text-white/40',
      linkIconClassName: 'text-white/40',
      dropdownSurfaceClassName: 'bg-background/15 backdrop-blur-xl border-white/10 text-white/80',
      dropdownRowClassName: 'text-white/80 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white',
      dropdownRowSelectedClassName: 'bg-white/10 text-white',
      dropdownSecondaryTextClassName: 'text-white/50',
      engineDropdownSurfaceClassName: 'border-white/10 bg-transparent text-white/80 shadow-lg backdrop-blur-none',
      engineDropdownItemClassName: 'text-white/80 hover:bg-white/10 hover:text-white',
      engineDropdownItemSelectedClassName: 'bg-white/10 text-white',
      dropdownStatusLoadingContainerClassName: 'bg-white/12',
      dropdownStatusInfoContainerClassName: 'bg-white/10',
      dropdownStatusDotClassName: 'bg-white/65',
      dropdownStatusTextClassName: 'text-white/80',
      dropdownStatusButtonClassName: 'bg-white/15 text-white hover:bg-white/20',
      dropdownClearButtonClassName: 'text-white/60 hover:text-white/90',
      dropdownEmptyStateClassName: 'text-white/60',
      dropdownFooterClassName: 'border-white/10 text-white/60',
    };
  }

  return defaultTheme;
}
