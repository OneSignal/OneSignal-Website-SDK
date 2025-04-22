export class PropertiesObject {
  public tags?: Record<string, string>;
  public language?: string;
  public timezoneId?: string;
  public country?: string;

  constructor(
    properties: {
      tags?: Record<string, string>;
      language?: string;
      timezoneId?: string;
      country?: string;
    } = {},
  ) {
    this.tags = properties.tags;
    this.language = properties.language;
    this.timezoneId = properties.timezoneId;
    this.country = properties.country;
  }

  get hasAtLeastOnePropertySet(): boolean {
    return Object.values(this).some((value) => value !== undefined);
  }
}
