export default interface OneSignalApiBaseResponse<T = unknown> {
  result: T;
  status: number;
  retryAfterSeconds?: number;
}
