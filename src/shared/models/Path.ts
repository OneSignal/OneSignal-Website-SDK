import { EmptyArgumentError } from '../errors/common';

const QUERY_STRING = '?';

/**
 * Represents a normalized path.
 *
 * Paths spaces are trimmed.
 * Paths without file names will never contain trailing slashes, except for empty paths.
 */
export default class Path {
  private readonly _path: string;

  constructor(path: string) {
    if (!path) throw EmptyArgumentError('path');
    this._path = path.trim();
  }

  _getWithoutQueryString(): string {
    return this._path.split(QUERY_STRING)[0];
  }

  _getFileName(): string | undefined {
    return this._getWithoutQueryString().split('\\').pop()?.split('/').pop();
  }

  _getFullPath() {
    return this._path;
  }
}
