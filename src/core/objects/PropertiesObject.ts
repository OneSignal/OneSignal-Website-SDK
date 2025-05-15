export class PropertiesObject {
  public ip?: string;
  public tags?: Record<string, string>;
  public language?: string;
  public timezone_id?: string;
  public country?: string;

  constructor(
    properties: {
      ip?: string;
      tags?: Record<string, string>;
      language?: string;
      timezone_id?: string;
      country?: string;
    } = {},
  ) {
    this.ip = properties.ip;
    this.tags = properties.tags;
    this.language = properties.language;
    this.timezone_id = properties.timezone_id;
    this.country = properties.country;
  }

  get hasAtLeastOnePropertySet(): boolean {
    return Object.values(this).some((value) => value !== undefined);
  }
}
