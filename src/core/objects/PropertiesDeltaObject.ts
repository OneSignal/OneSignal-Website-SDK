export class PropertiesDeltasObject {
  constructor(
    public session_time?: number,
    public session_count?: number,
  ) {}

  get hasAtLeastOnePropertySet(): boolean {
    return this.session_time !== undefined || this.session_count !== undefined;
  }
}
