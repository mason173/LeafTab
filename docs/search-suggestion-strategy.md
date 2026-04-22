# Search Suggestion Strategy

## Goals

- Keep the search box fully usable without any network dependency.
- Prioritize direct local actions over remote search continuations.
- Add remote search suggestions as an enhancement, never as a requirement.
- Ensure the dropdown stays stable when a remote provider is slow or unavailable.

## Sources

LeafTab combines these sources in the default search dropdown:

1. Local shortcuts
2. Built-in site shortcuts
3. Local search history
4. Remote search suggestions
5. Browser history

Special command modes such as `/b` and `/t` still use their dedicated source pipelines and do not mix in remote suggestions.

## Empty State

When the search box is focused and the query is empty:

- Show local search history first.
- Show browser history after local history if permission is available.
- Do not request any remote search suggestions.

This keeps the empty state fast, offline-friendly, and predictable.

## Query State

When the user types a non-empty query in the default mode, results are mixed in this order:

1. Local shortcuts
2. Built-in site shortcuts
3. Local search history
4. Remote search suggestions
5. Browser history

Rationale:

- Local shortcuts and built-in site shortcuts are the strongest navigation signals.
- Local search history reflects the user's own repeated intent.
- Remote search suggestions help continue a search query, but should not displace direct local actions.
- Browser history remains useful, but it is broader and noisier than explicit local history or direct shortcuts.

## Deduping

The dropdown dedupes query-like suggestions across sources.

- Local history wins over remote suggestions when both contain the same query text.
- Shortcut-like URL targets dedupe by normalized target URL.
- Remote suggestions dedupe by normalized query text.

This avoids showing the same query twice when, for example, a local history hit also appears in 360 suggestions.

## Remote Provider

The first remote provider is `360 Search`.

Why 360:

- It currently exposes a JSON response that is much easier to consume than Baidu's GBK + JSONP endpoint.
- It works as an additive provider for mainland China users.
- It avoids adding a custom backend dependency.

Current endpoint shape:

- Endpoint: `https://sug.so.360.cn/suggest`
- Query params:
  - `word`
  - `encodein=utf-8`
  - `encodeout=utf-8`
- Response field used:
  - `result[].word`

## Network Architecture

Remote suggestions are fetched through the extension background service worker.

Why:

- The page UI remains isolated from cross-origin fetch and permission details.
- We avoid remote script execution entirely.
- The feature can degrade cleanly if host permissions or the upstream provider fail.

Flow:

1. Search UI debounces the query.
2. The UI sends a runtime message to the background script.
3. The background script fetches 360 suggestions.
4. The UI receives normalized suggestion items and merges them into the local-first dropdown.

## Fallback Behavior

Remote suggestions are optional.

If the provider is unavailable because of:

- network failure
- upstream timeout
- upstream schema change
- missing runtime context
- missing host permission

Then LeafTab:

- returns an empty remote suggestion list
- keeps local shortcuts and history fully functional
- does not block search submission
- does not show a disruptive error toast

## Guardrails

- Remote suggestions are only fetched for non-empty queries.
- Remote suggestions are only used in the default search mode.
- Remote suggestions are capped to a small list and cached briefly in memory.
- Search submit behavior remains unchanged: the selected row still wins, otherwise normal search submission runs.
