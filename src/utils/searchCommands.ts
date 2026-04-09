export const SEARCH_COMMAND_DEFINITIONS = [
  {
    id: 'bookmarks',
    token: '/bookmarks',
    aliases: ['/b'],
    permission: 'bookmarks',
  },
  {
    id: 'tabs',
    token: '/tabs',
    aliases: ['/t'],
    permission: 'tabs',
  },
] as const;

export type SearchCommandId = (typeof SEARCH_COMMAND_DEFINITIONS)[number]['id'];
export type SearchCommandPermission = (typeof SEARCH_COMMAND_DEFINITIONS)[number]['permission'];
export type SearchSuggestionPermission = SearchCommandPermission | 'history';
export type SearchCommandDefinition = (typeof SEARCH_COMMAND_DEFINITIONS)[number];

export type ParsedSearchCommand = {
  active: boolean;
  id: SearchCommandId | null;
  token: string | null;
  query: string;
};

const SEARCH_COMMAND_TOKEN_SET = new Set<string>(
  SEARCH_COMMAND_DEFINITIONS.map((definition) => definition.token),
);

function parseWithDefinition(rawQuery: string, definition: SearchCommandDefinition): {
  active: boolean;
  query: string;
} {
  const trimmedStart = rawQuery.trimStart();
  const lowered = trimmedStart.toLowerCase();

  for (const alias of definition.aliases) {
    if (lowered === alias) {
      return { active: true, query: '' };
    }
    if (lowered.startsWith(`${alias} `)) {
      return { active: true, query: trimmedStart.slice(alias.length).trim() };
    }
  }

  if (lowered === definition.token) {
    return { active: true, query: '' };
  }
  if (lowered.startsWith(`${definition.token} `)) {
    return { active: true, query: trimmedStart.slice(definition.token.length).trim() };
  }
  if (lowered.startsWith(definition.token)) {
    return { active: true, query: trimmedStart.slice(definition.token.length).trim() };
  }

  return { active: false, query: '' };
}

export function parseSearchCommand(rawQuery: string): ParsedSearchCommand {
  for (const definition of SEARCH_COMMAND_DEFINITIONS) {
    const parsed = parseWithDefinition(rawQuery, definition);
    if (parsed.active) {
      return {
        active: true,
        id: definition.id,
        token: definition.token,
        query: parsed.query,
      };
    }
  }

  return {
    active: false,
    id: null,
    token: null,
    query: '',
  };
}

export function parseSearchCommandById(rawQuery: string, id: SearchCommandId): {
  active: boolean;
  query: string;
} {
  const definition = SEARCH_COMMAND_DEFINITIONS.find((item) => item.id === id);
  if (!definition) {
    return { active: false, query: '' };
  }
  return parseWithDefinition(rawQuery, definition);
}

export function matchSearchCommandAliasInput(rawValue: string): SearchCommandId | null {
  const lowered = rawValue.trimStart().toLowerCase();
  for (const definition of SEARCH_COMMAND_DEFINITIONS) {
    if ((definition.aliases as readonly string[]).includes(lowered)) {
      return definition.id;
    }
  }
  return null;
}

export function resolveSearchCommandAutocomplete(rawValue: string): string | null {
  const matchedId = matchSearchCommandAliasInput(rawValue);
  if (!matchedId) return null;
  const matched = SEARCH_COMMAND_DEFINITIONS.find((definition) => definition.id === matchedId);
  if (!matched) return null;
  const leadingWhitespace = rawValue.match(/^\s*/)?.[0] ?? '';
  return `${leadingWhitespace}${matched.token} `;
}

export function isSearchCommandShellValue(rawValue: string): boolean {
  const trimmedTrailingValue = rawValue.trimEnd().toLowerCase();
  return SEARCH_COMMAND_TOKEN_SET.has(trimmedTrailingValue);
}
