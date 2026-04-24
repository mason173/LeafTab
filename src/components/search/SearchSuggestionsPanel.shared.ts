import type { SearchBarTheme } from '@/components/search/searchBarTheme';
import type { SearchAction, SearchSecondaryAction } from '@/utils/searchActions';

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
  surfaceTone?: 'default' | 'drawer';
  actionModeActive?: boolean;
  selectedSecondaryActionIndex?: number;
  pendingConfirmationActionKey?: string | null;
  onSecondaryActionSelect?: (action: SearchAction, secondaryAction: SearchSecondaryAction, index: number) => void;
}
