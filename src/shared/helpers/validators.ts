export interface ValidatorOptions {
  allowNull?: boolean;
  allowEmpty?: boolean;
  /**
   * For validating URLs, requires that the URL begins with https://.
   */
  requireHttps?: boolean;
}

export function isObject(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidEmail(email: string | undefined | null) {
  return (
    !!email &&
    !!email.match(
      // eslint-disable-next-line no-control-regex
      /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/,
    )
  );
}

export function isValidUrl(
  url: string | null | undefined,
  options?: ValidatorOptions,
) {
  if (options && options.allowNull && url === null) return true;
  else if (options && options.allowEmpty && (url === null || url === undefined))
    return true;
  else {
    try {
      const parsedUrl = new URL(url as string);
      if (options && options.requireHttps) {
        return parsedUrl.protocol === 'https:';
      } else return true;
    } catch (e) {
      return false;
    }
  }
}

/**
 * Returns true if the UUID is a string of 36 characters;
 * @param uuid
 * @returns {*|boolean}
 */
export function isValidUuid(uuid: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    uuid,
  );
}
