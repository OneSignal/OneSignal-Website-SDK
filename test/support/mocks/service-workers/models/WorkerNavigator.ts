export default class WorkerNavigator {
  public permissions;

  constructor(
    public readonly appCodeName: string,
    public readonly appName: string,
    public readonly appVersion: string,
    public readonly platform: string,
    public readonly product: string,
    public readonly userAgent: string,
  ) {
    this.permissions = {
      query: async function() {
        return { state: "granted" };
      }
    };
  }
}