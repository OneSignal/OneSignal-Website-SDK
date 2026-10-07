import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import Log from '../libraries/Log';
import { hasMissingEntries, hasMissingItems, isMissing } from './inputGuard';

const errorSpy = vi.spyOn(Log, '_error').mockImplementation(() => '');

describe('inputGuard', () => {
  beforeEach(() => {
    errorSpy.mockClear();
  });

  test('null and empty strings are missing, whitespace is not', () => {
    expect(isMissing(null, 'login: externalId')).toBe(true);
    expect(isMissing(undefined, 'login: externalId')).toBe(true);
    expect(isMissing('', 'login: externalId')).toBe(true);
    expect(isMissing(' ', 'login: externalId')).toBe(false);
    expect(isMissing('user', 'login: externalId')).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('login: externalId is required');
  });

  test('a string containing a null byte is missing', () => {
    expect(isMissing('\u0000: 1', 'login: externalId')).toBe(true);
    expect(isMissing('abc\u0000', 'addAlias: id')).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith('login: externalId contains a null byte');
    expect(errorSpy).toHaveBeenCalledWith('addAlias: id contains a null byte');
  });

  test('hasMissingItems rejects a blank entry and a non-array', () => {
    expect(hasMissingItems(null, 'removeTags', 'key')).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith('removeTags: keys must be an array of strings');
    expect(hasMissingItems(['ok', ''], 'removeTags', 'key')).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith('removeTags: key is required');
    expect(hasMissingItems(['ok', ' '], 'removeTags', 'key')).toBe(false);
  });

  test('hasMissingEntries rejects blank keys and blank values', () => {
    expect(hasMissingEntries(null, 'addAliases')).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith('addAliases: argument must be an object');
    expect(hasMissingEntries({ '': 'id' }, 'addAliases')).toBe(true);
    expect(hasMissingEntries({ label: '' }, 'addAliases')).toBe(true);
    expect(hasMissingEntries({ label: 'id' }, 'addAliases')).toBe(false);
    expect(hasMissingEntries({ label: ' ' }, 'addAliases')).toBe(false);
    expect(hasMissingEntries({ external_id: '\u0000: 1' }, 'addAliases')).toBe(true);
  });

  test('hasMissingEntries allows an empty tag value and a null byte in the value', () => {
    expect(hasMissingEntries({ key: '' }, 'addTags', true)).toBe(false);
    expect(hasMissingEntries({ '': 'value' }, 'addTags', true)).toBe(true);
    expect(hasMissingEntries({ key: null }, 'addTags', true)).toBe(true);
    expect(hasMissingEntries({ key: 'a\u0000b' }, 'addTags', true)).toBe(false);
    expect(hasMissingEntries({ 'a\u0000': 'value' }, 'addTags', true)).toBe(true);
  });
});
