import {
  InvalidArgumentError,
  InvalidArgumentReason,
} from '../errors/InvalidArgumentError';

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
    if (!path)
      throw new InvalidArgumentError('path', InvalidArgumentReason.Empty);
    this.path = path.trim();
  }

  getQueryString(): string | null {
    // If there are no ? characters, return null
    // If there are multiple ?, return the substring starting after the first ? all the way to the end
    const indexOfDelimiter = this.path.indexOf('?');
    if (indexOfDelimiter === -1) {
      return null;
    }
    if (this.path.length > indexOfDelimiter) {
      // Return the substring *after the first ? to the end
      return this.path.substring(indexOfDelimiter + 1);
    } else {
      // The last character is ?
      return null;
    }
  }

  getWithoutQueryString(): string {
    return this.path.split(Path.QUERY_STRING)[0];
  }

  getFileName(): string | undefined {
    return this.getWithoutQueryString().split('\\').pop()?.split('/').pop();
  }

  getFileNameWithQuery(): string | undefined {
    return this.path.split('\\').pop()?.split('/').pop();
  }

  getFullPath() {
    return this.path;
  }
}
