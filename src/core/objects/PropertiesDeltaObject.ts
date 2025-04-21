export class PropertiesDeltasObject {
  constructor(
    public sessionTime?: number,
    public sessionCount?: number,
  ) {}

  get hasAtLeastOnePropertySet(): boolean {
    return this.sessionTime !== undefined || this.sessionCount !== undefined;
  }
}
