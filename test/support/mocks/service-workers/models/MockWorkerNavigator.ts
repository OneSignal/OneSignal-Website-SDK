export class MockWorkerNavigator implements WorkerNavigator {
  constructor(
    public readonly appCodeName: string,
    public readonly appName: string,
    public readonly appVersion: string,
    public readonly platform: string,
    public readonly product: string,
    public readonly userAgent: string,
  ) {
  }

  readonly hardwareConcurrency: number;
  readonly onLine: boolean;
  readonly productSub: string;
  readonly vendor: string;
  readonly vendorSub: string;

  sendBeacon(url: string, data?: Blob | Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | DataView | ArrayBuffer | FormData | string | null): boolean {
    return false;
  }
}
