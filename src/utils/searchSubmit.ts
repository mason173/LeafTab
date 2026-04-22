import type { SearchAction } from '@/utils/searchActions';
import type { SearchSessionModel } from '@/utils/searchSessionModel';

export type SearchSubmitDecision =
  | { kind: 'activate-action'; action: SearchAction }
  | { kind: 'copy-calculator'; resultText: string }
  | { kind: 'submit-session' }
  | { kind: 'noop' };

type ResolveSearchSubmitDecisionArgs = {
  session: SearchSessionModel;
  selectedAction: SearchAction | null;
};

export function resolveSearchSubmitDecision({
  session,
  selectedAction,
}: ResolveSearchSubmitDecisionArgs): SearchSubmitDecision {
  if (session.mode === 'tabs') {
    if (!selectedAction || selectedAction.item.type !== 'tab') return { kind: 'noop' };
    return { kind: 'activate-action', action: selectedAction };
  }

  if (session.mode === 'bookmarks') {
    if (!selectedAction || selectedAction.item.type !== 'bookmark') return { kind: 'noop' };
    return { kind: 'activate-action', action: selectedAction };
  }

  if (session.mode === 'history') {
    if (!selectedAction || selectedAction.item.type !== 'history') return { kind: 'noop' };
    return { kind: 'activate-action', action: selectedAction };
  }

  if (selectedAction) {
    return { kind: 'activate-action', action: selectedAction };
  }

  const resultText = String(session.calculatorPreview?.resultText ?? '').trim();
  if (resultText) {
    return { kind: 'copy-calculator', resultText };
  }

  return { kind: 'submit-session' };
}
