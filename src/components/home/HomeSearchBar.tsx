import { SearchExperience, type SearchExperienceProps } from '@/components/search/SearchExperience';

type HomeSearchBarProps = {
  searchExperienceProps: SearchExperienceProps;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
  searchSurfaceTone?: 'default' | 'drawer';
  searchSurfaceStyle?: React.CSSProperties;
  suggestionsPlacement?: 'bottom' | 'top';
  className?: string;
};

export function HomeSearchBar({
  searchExperienceProps,
  blankMode,
  forceWhiteTheme,
  subtleDarkTone,
  searchSurfaceTone = 'default',
  searchSurfaceStyle,
  suggestionsPlacement = 'bottom',
  className,
}: HomeSearchBarProps) {
  return (
    <div className={className}>
      <SearchExperience
        {...searchExperienceProps}
        blankMode={blankMode}
        forceWhiteTheme={forceWhiteTheme}
        subtleDarkTone={subtleDarkTone}
        searchSurfaceTone={searchSurfaceTone}
        searchSurfaceStyle={searchSurfaceStyle}
        suggestionsPlacement={suggestionsPlacement}
      />
    </div>
  );
}
