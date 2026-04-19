import { describe, expect, it } from 'vitest';
import {
  compareReleaseVersions,
  extractVersionFromReleaseUrl,
  normalizeReleaseApiBase,
  normalizeReleaseVersion,
  parseReleaseNotes,
  parseReleaseNotesInput,
  resolveBackendReleaseUpdateUrl,
} from '@/utils/releaseUpdate';

describe('releaseUpdate helpers', () => {
  it('normalizes versions and strips the v prefix', () => {
    expect(normalizeReleaseVersion(' v1.4.8-alpha.2 ')).toBe('1.4.8-alpha.2');
  });

  it('compares semantic versions using numeric parts', () => {
    expect(compareReleaseVersions('1.4.9', '1.4.8')).toBeGreaterThan(0);
    expect(compareReleaseVersions('1.4.8', '1.4.8-beta.1')).toBe(0);
    expect(compareReleaseVersions('1.4.7', '1.4.8')).toBeLessThan(0);
  });

  it('extracts versions from GitHub release URLs', () => {
    expect(extractVersionFromReleaseUrl('https://github.com/mason173/LeafTab/releases/tag/v1.4.8-alpha.2')).toBe('1.4.8-alpha.2');
    expect(extractVersionFromReleaseUrl('https://github.com/mason173/LeafTab/releases/latest')).toBe('');
  });

  it('normalizes backend api base URLs safely', () => {
    expect(normalizeReleaseApiBase(' https://example.com/api/ ')).toBe('https://example.com/api');
    expect(normalizeReleaseApiBase('ftp://example.com')).toBe('');
    expect(resolveBackendReleaseUpdateUrl('https://example.com/api/')).toBe('https://example.com/api/update/latest');
  });

  it('parses release notes from markdown-like content', () => {
    expect(parseReleaseNotes('# Changelog\n\n- Added sync\n1. Fixed cache\n更新内容\n')).toEqual([
      'Added sync',
      'Fixed cache',
    ]);
  });

  it('parses release notes input from arrays and strings', () => {
    expect(parseReleaseNotesInput([' Added sync ', '', 'Fixed cache'])).toEqual([
      'Added sync',
      'Fixed cache',
    ]);
    expect(parseReleaseNotesInput('* Better search')).toEqual(['Better search']);
    expect(parseReleaseNotesInput(null)).toEqual([]);
  });
});
