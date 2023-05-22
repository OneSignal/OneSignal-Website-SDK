import * as bowser from 'bowser';

export function bowserCastle() {
  return {
    mobile: bowser.mobile,
    tablet: bowser.tablet,
    name: bowser.name.toLowerCase(),
    version: bowser.version,
  };
}
