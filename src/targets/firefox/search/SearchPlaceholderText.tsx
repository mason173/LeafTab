import type { SearchPlaceholderTextProps } from '@/components/search/SearchPlaceholderText.shared';
import { SearchPlaceholderBannerText } from '@/components/search/SearchPlaceholderBannerText';

export function SearchPlaceholderText({
  text,
  className,
  fontSize,
  lineHeight,
  disableAnimation,
  lightweight,
}: SearchPlaceholderTextProps) {
  return (
    <SearchPlaceholderBannerText
      text={text}
      className={className}
      fontSize={fontSize}
      lineHeight={lineHeight}
      disableAnimation={disableAnimation}
      lightweight={lightweight}
    />
  );
}
