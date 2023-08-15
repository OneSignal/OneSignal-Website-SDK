export const convertHeadersToPlainObjectForUnitTesting = (headers: HeadersInit): IndexableByString<string> => {
  // Convert the headers object into a plain object for unit testing purposes
  const headersObject: IndexableByString<string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      headersObject[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      headersObject[key] = value;
    });
  } else if (typeof headers === 'object') {
    Object.assign(headersObject, headers);
  }
  return headersObject;
};
