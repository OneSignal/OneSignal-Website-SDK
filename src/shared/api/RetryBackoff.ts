export const RETRY_BACKOFF: { [key: number]: number } = {
  5: 10_000,
  4: 20_000,
  3: 30_000,
  2: 30_000,
  1: 30_000,
};
