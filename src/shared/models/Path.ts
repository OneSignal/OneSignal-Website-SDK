import { EmptyArgumentError } from '../errors/common';

/**
 * Represents a normalized path.
 *
 * Paths spaces are trimmed.
 * Paths without file names will never contain trailing slashes, except for empty paths.
 */
export default class Path {
  private static QUERY_STRING = '?';

  private readonly path: string;

  constructor(path: string) {
    if (!path) throw EmptyArgumentError('path');
    this.path = path.trim();
  }

  getWithoutQueryString(): string {
    return this.path.split(Path.QUERY_STRING)[0];
  }

  getFileName(): string | undefined {
    return this.getWithoutQueryString().split('\\').pop()?.split('/').pop();
  }

  getFullPath() {
    return this.path;
  }
}
