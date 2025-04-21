export class PropertiesObject {
  public tags?: Record<string, string>;
  public language?: string;
  public timezoneId?: string;
  public country?: string;
  public latitude?: number;
  public longitude?: number;

  constructor(
    properties: {
      tags?: Record<string, string>;
      language?: string;
      timezoneId?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
    } = {},
  ) {
    this.tags = properties.tags;
    this.language = properties.language;
    this.timezoneId = properties.timezoneId;
    this.country = properties.country;
    this.latitude = properties.latitude;
    this.longitude = properties.longitude;
  }

  get hasAtLeastOnePropertySet(): boolean {
    return Object.values(this).some((value) => value !== undefined);
  }
}
