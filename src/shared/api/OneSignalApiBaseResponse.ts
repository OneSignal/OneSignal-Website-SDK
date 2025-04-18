export default interface OneSignalApiBaseResponse<T = unknown> {
  ok: boolean;
  result: T;
  status: number;
  retryAfterSeconds?: number;
}
