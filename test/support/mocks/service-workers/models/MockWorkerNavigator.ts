export class MockWorkerNavigator implements WorkerNavigator {
  constructor(
    public readonly appCodeName: string,
    public readonly appName: string,
    public readonly appVersion: string,
    public readonly platform: string,
    public readonly product: string,
    public readonly userAgent: string
  ) {
  }
  mediaCapabilities: MediaCapabilities;
  clearAppBadge(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  setAppBadge(contents?: unknown): Promise<void> {
    throw new Error("Method not implemented.");
  }
  locks: LockManager;

  readonly hardwareConcurrency: number;
  readonly onLine: boolean;
  readonly productSub: string;
  readonly vendor: string;
  readonly vendorSub: string;
  readonly permissions: Permissions;
  readonly serviceWorker: ServiceWorkerContainer;
  readonly language: string;
  readonly languages: string[];
  readonly storage: StorageManager;

  sendBeacon(url: string, data?: Blob | Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | DataView | ArrayBuffer | FormData | string | null): boolean {
    return false;
  }
}
