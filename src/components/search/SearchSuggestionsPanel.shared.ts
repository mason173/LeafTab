import type { SearchBarTheme } from '@/components/search/searchBarTheme';
import type { SearchAction } from '@/utils/searchActions';

export type SearchSuggestionsPlacement = 'bottom' | 'top';

export interface SearchSuggestionsPanelProps {
  items: SearchAction[];
  isOpen: boolean;
  onSelect: (value: SearchAction) => void;
  onClear: () => void;
  onHighlight?: (index: number) => void;
  selectedIndex?: number;
  theme: SearchBarTheme;
  statusNotice?: {
    tone?: 'info' | 'loading';
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  showNumberHints?: boolean;
  currentBrowserTabId?: number | null;
  emptyStateLabel?: string;
  lightweight?: boolean;
  placement?: SearchSuggestionsPlacement;
}
