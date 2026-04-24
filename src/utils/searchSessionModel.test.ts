import { describe, expect, it } from 'vitest';
import { createSearchSessionModel, shouldAutoOpenSearchSuggestions } from '@/utils/searchSessionModel';

describe('createSearchSessionModel', () => {
  it('does not treat mixed Chinese input as a Bing prefix search', () => {
    const session = createSearchSessionModel('B 站', {
      prefixEnabled: true,
      defaultEngine: 'google',
    });

    expect(session.enginePrefix.active).toBe(false);
    expect(session.enginePrefix.overrideEngine).toBeNull();
    expect(session.activeQuery).toBe('B 站');
    expect(session.submission.query).toBe('B 站');
    expect(session.submission.effectiveEngine).toBe('google');
  });

  it('supports bang-prefixed temporary engine overrides', () => {
    const session = createSearchSessionModel('!b AI', {
      prefixEnabled: true,
      defaultEngine: 'google',
    });

    expect(session.enginePrefix.active).toBe(true);
    expect(session.enginePrefix.overrideEngine).toBe('bing');
    expect(session.activeQuery).toBe('AI');
    expect(session.submission.query).toBe('AI');
    expect(session.submission.effectiveEngine).toBe('bing');
  });

  it('treats a completed engine-prefix shell as active before keywords are typed', () => {
    const session = createSearchSessionModel('!b ', {
      prefixEnabled: true,
      defaultEngine: 'google',
    });

    expect(session.enginePrefix.active).toBe(true);
    expect(session.enginePrefix.overrideEngine).toBe('bing');
    expect(session.enginePrefix.query).toBe('');
    expect(session.activeQuery).toBe('');
    expect(session.submission.query).toBe('');
    expect(session.submission.effectiveEngine).toBe('bing');
  });

  it('suppresses auto-open suggestions for explicit engine-prefix searches', () => {
    const enginePrefixSession = createSearchSessionModel('!g React', {
      prefixEnabled: true,
      defaultEngine: 'google',
    });
    const normalSession = createSearchSessionModel('React', {
      prefixEnabled: true,
      defaultEngine: 'google',
    });

    expect(shouldAutoOpenSearchSuggestions(enginePrefixSession)).toBe(false);
    expect(shouldAutoOpenSearchSuggestions(normalSession)).toBe(true);
    expect(shouldAutoOpenSearchSuggestions(createSearchSessionModel('!g ', {
      prefixEnabled: true,
      defaultEngine: 'google',
    }))).toBe(false);
  });
});
