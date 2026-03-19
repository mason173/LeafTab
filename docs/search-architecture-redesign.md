# Search Architecture Redesign

## Background

LeafTab's search box currently mixes three concerns into one path:

- Input rendering behavior
- Query parsing and command recognition
- Suggestion sourcing, ranking, keyboard navigation, and submission

This makes the feature powerful, but it also creates repeated regressions:

- Plain text search sometimes fails to surface shortcuts first
- Prefix command behavior depends on multiple layers agreeing on the same interpretation
- Keyboard shortcuts can break when input-shell behavior changes
- Visual input features affect real input value handling

The current implementation is spread across:

- `src/components/search/SearchExperience.tsx`
- `src/components/SearchBar.tsx`
- `src/components/search/SearchField.tsx`
- `src/hooks/useSearch.ts`
- `src/hooks/useSearchInteractionController.ts`
- `src/hooks/useSearchSuggestions.ts`
- `src/hooks/useSearchSuggestionSources.ts`
- `src/utils/searchQueryModel.ts`
- `src/utils/searchSuggestionEngine.ts`
- `src/utils/searchSuggestionSources.ts`
- `src/utils/searchCommands.ts`

By comparison, Omni keeps the core behavior much simpler:

- One native input
- One string-based parser
- One main search branch
- One keyboard controller

We should borrow that simplicity without giving up React, ranking quality, IME safety, or extensibility.

## Diagnosis

### Why regressions keep coming back

The current architecture has several coupled decision points:

1. `SearchField` visually splits the command token from the editable text.
2. `useSearch` mutates raw input for command autocomplete.
3. `searchQueryModel` parses command and engine/site intent again.
4. `useSearchSuggestionSources` decides which sources are enabled.
5. `searchSuggestionEngine` decides merge order and deduping.
6. `useSearchInteractionController` owns key handling for navigation and selection.
7. `SearchExperience` adds permission warmup, submit branching, and status-notice logic.

Each layer is reasonable in isolation, but together they create hidden contracts.

Example failure pattern:

- Input starts with `/`
- One layer treats it as a prefix command draft
- Another layer treats it as a normal string
- Another layer suppresses browser history or changes display mode
- The final merged list no longer matches the user's mental model

This is why the feature can be "fixed" and later break again after unrelated UI or keyboard work.

### Root architectural issue

The system has more than one source of truth for query meaning.

Today, "what the user typed" is interpreted separately by:

- input UI
- command parser
- suggestion display mode
- submit handler
- permission warmup logic

That should happen exactly once.

## Goals

- Make plain text search deterministic: shortcuts first, then history, then other fallback suggestions.
- Make command-prefix behavior deterministic: one parser, one meaning, one submission path.
- Keep the input field close to native browser behavior.
- Keep IME composition safe.
- Keep keyboard navigation and submission logic centralized.
- Make it easy to add or remove a command without touching multiple unrelated files.
- Make ranking and command behavior testable without rendering the whole UI.

## Non-goals

- Rebuilding the entire search UI visual style
- Copying Omni's imperative DOM implementation
- Removing existing advanced capabilities such as site-direct search or calculator
- Reworking scenario shortcut storage in this phase

## Target Principles

### 1. One canonical query model

The raw input string should be parsed once into a canonical model, and every downstream decision should use that model.

### 2. Input UI should not rewrite meaning

The input component should display text, caret, and optional visual hints, but it should not own semantic parsing or create alternative representations of the actual query.

### 3. Suggestion pipeline should be explicit

Each suggestion source should return items into a known bucket, and the final merge order should be declared in one place.

### 4. Keyboard behavior should target the result contract, not implementation details

Arrow keys, Enter, Escape, number hints, and tab-specific actions should operate on the same normalized result list.

## Proposed Architecture

## Overview

The redesigned flow should be:

`raw input` -> `parse once` -> `build search session model` -> `fetch/filter sources` -> `rank/merge final suggestions` -> `keyboard/select/submit`

Only the session model is allowed to describe query meaning.

## Core State Model

Introduce one canonical parsed model, conceptually like:

```ts
type SearchSessionModel = {
  rawValue: string;
  trimmedValue: string;
  mode: 'default' | 'bookmarks' | 'tabs';
  command: {
    id: 'bookmarks' | 'tabs' | null;
    token: string | null;
    isExactToken: boolean;
    query: string;
  };
  engineOverride: 'google' | 'bing' | 'duckduckgo' | 'baidu' | null;
  siteDirect: {
    active: boolean;
    domain: string | null;
    url: string | null;
    label: string | null;
    query: string;
  };
  calculator: {
    active: boolean;
    resultText: string;
  } | null;
  normalizedQuery: string;
}
```

Rules:

- `rawValue` is always the real source of truth.
- `command.query` is the text after removing a recognized command token.
- `mode` is derived only from `command.id`.
- `normalizedQuery` is the query used for ranking within the active mode.
- Submission logic must use this model, not re-parse from raw strings elsewhere.

## Input Box Design

### Keep the value native

The real `<input>` value should remain the full raw string, including command token.

We should stop using a split model where the command token is removed from the native input value and rendered separately as if it were outside the text field.

Reason:

- Native selection and caret behavior stay predictable
- IME edge cases drop sharply
- Backspace semantics become normal again
- We remove a class of bugs where UI state and actual value drift apart

### Visual command highlighting

If we still want the command prefix to look special, treat it as a non-authoritative visual overlay.

That means:

- Overlay may highlight `/tabs`
- Actual input still contains `/tabs foo`
- Selection, copy, paste, and edit all happen against the native input value

If the overlay becomes costly or fragile, it should be removed before the underlying logic is compromised.

### Autocomplete behavior

Keep lightweight alias expansion like Omni, but only in one parser-oriented place.

Recommended behavior:

- `/b` -> `/bookmarks`
- `/t` -> `/tabs`
- no automatic trailing space
- pressing Backspace when the full value is exactly `/bookmarks` or `/tabs` clears the whole token

This matches the current user expectation while keeping the behavior narrow and testable.

## Suggestion Pipeline

## Modes

The session can be in only one of these modes:

- `default`
- `bookmarks`
- `tabs`

Mode is derived from parsed command only.

No other file should infer mode with its own string checks.

## Source buckets

Each source returns into a dedicated bucket:

- `shortcutSuggestions`
- `localHistorySuggestions`
- `browserHistorySuggestions`
- `bookmarkSuggestions`
- `tabSuggestions`
- `builtinSiteSuggestions`
- `enginePrefixSuggestions`
- `calculatorSuggestions`

## Merge policy

The final merge policy should live in one file and be written as an explicit contract.

Recommended contract:

### `default` mode with query

1. Shortcut suggestions
2. Local history suggestions
3. Browser history suggestions
4. Built-in site shortcut suggestions
5. Engine override suggestion, if applicable
6. Calculator suggestion, if applicable

### `default` mode with empty input

1. Local history suggestions
2. Browser history suggestions

### `bookmarks` mode

1. Bookmark suggestions only

### `tabs` mode

1. Tab suggestions only

This makes the user's priority model explicit and removes ambiguity.

## Ranking contract

Shortcut ranking should be stable and independent from UI state.

Recommended scoring order:

1. Title prefix match
2. URL/domain prefix match
3. Title contains match
4. URL/domain contains match
5. Fuzzy match
6. Personalization boost
7. Stable insertion order tie-breaker

This is close to the current implementation, but the policy should be documented as a contract rather than emerging from multiple helpers.

## Submission Contract

There should be a single `submitSearchSession(model, selection)` path.

Behavior:

- If a suggestion is actively selected, submit that suggestion by type.
- If `mode === 'tabs'`, only tab items are valid submit targets.
- If `mode === 'bookmarks'`, only bookmark items are valid submit targets.
- If calculator preview is active and there is no selected result, copy calculator result.
- Otherwise submit the session's default search target derived from the canonical model.

This avoids branching by re-checking raw string prefixes in several places.

## Keyboard Contract

Keyboard handling should be centralized around the final rendered list.

Required rules:

- `ArrowDown`: open panel if needed, then move selection forward
- `ArrowUp`: move selection backward
- `Enter`: activate selected result; if none selected, submit session
- `Escape`: close panel, keep input value
- `Cmd/Ctrl + 1..0`: activate visible result by index
- `Tab`: cycle engine only when engine switcher feature is enabled
- `Delete` and `Shift+Delete`: only active in `tabs` mode with tab results

Important:

- IME composition guard must live at the keyboard boundary
- Input component should not implement separate business logic for Enter beyond IME protection

## Permissions

Permission handling should become source-level metadata, not ad hoc logic scattered through interaction code.

Recommended pattern:

- Parser determines `mode`
- Source manager determines whether the required permission is missing
- Source manager returns:
  - items
  - loading state
  - missing-permission state
  - suggested action label

The panel can then render a notice from source status, without needing command-specific logic in multiple places.

## Proposed File Boundaries

Recommended target split:

- `searchSessionModel.ts`
  - parse raw input once
  - resolve mode, command, engine override, site-direct, calculator

- `searchSuggestionSources.ts`
  - source loading only
  - no final merge policy

- `searchSuggestionPolicy.ts`
  - merge order
  - ranking priorities
  - per-mode visibility rules

- `searchSubmit.ts`
  - final submit behavior for session or selected suggestion

- `useSearchController.ts`
  - owns raw input, panel open state, selected index, and interaction events

- `SearchField.tsx`
  - native input shell only
  - no semantic parsing

- `SearchSuggestionsPanel.tsx`
  - render-only plus hover highlight callbacks

This keeps domain logic separate from presentation.

## Migration Plan

### Phase 1: Canonical model

- Introduce a new `searchSessionModel`
- Make all parsing decisions flow through it
- Remove duplicate prefix interpretation outside the model

Success condition:

- same user-visible behavior, fewer parsing entry points

### Phase 2: Native input simplification

- Stop splitting command token out of the real input value
- Reduce SearchField responsibilities to native input behavior and visuals

Success condition:

- selection, caret, backspace, IME, and command editing become stable

### Phase 3: Merge policy rewrite

- Rewrite final suggestion merge as one explicit policy
- Lock default query order to shortcuts first, then history

Success condition:

- plain typing always surfaces shortcuts first when matched

### Phase 4: Submission and keyboard unification

- Route Enter and suggestion activation through one submit contract
- Keep tab/bookmark special actions mode-driven instead of string-driven

Success condition:

- panel shortcuts stop regressing when input visuals change

### Phase 5: Contract tests

- Add pure tests for parser, ranking, merge policy, and keyboard actions

Success condition:

- command and shortcut regressions are caught before UI testing

## Test Matrix

At minimum, the redesign should lock these cases:

- typing plain text matching a shortcut title shows shortcut before history
- typing plain text matching a shortcut URL shows shortcut before history
- typing `/b` autocompletes to `/bookmarks`
- typing `/t` autocompletes to `/tabs`
- pressing Backspace on exact `/bookmarks` clears whole token
- typing `/tabs figma` only shows tab results
- typing `/bookmarks openai` only shows bookmark results
- typing empty value shows local history then browser history
- IME composition does not trigger submit on Enter during composition
- `Cmd/Ctrl + number` activates the correct visible item
- Enter with selected tab switches tab
- Enter with no selected item in default mode submits normal search

## Recommendation

Do not copy Omni's implementation style.

Do copy Omni's architectural discipline:

- one real input
- one parser
- one main result contract
- one keyboard contract

For LeafTab, the best target is:

- Omni-level simplicity in query meaning
- LeafTab-level quality in ranking, permissions, and richer sources

That gives us a cleaner foundation without throwing away the parts that are already stronger than Omni.
