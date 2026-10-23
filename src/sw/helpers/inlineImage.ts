import Log from 'src/shared/libraries/Log';

const CACHE_NAME = 'onesignal-notification-images';
const FETCH_TIMEOUT_MS = 5_000;
const MAX_INLINE_BYTES = 128 * 1024;
const MAX_CACHED_IMAGES = 10;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

interface ImageBytes {
  bytes: Uint8Array<ArrayBuffer>;
  type: string;
}

// Chromium fetches notification images at display time and shows a placeholder
// when that fetch fails. The worker fetches the image first, keeps the last
// good copy in Cache Storage, and hands the browser the bytes as a data URL.
// A cross-origin host must send Access-Control-Allow-Origin for the worker
// to read the bytes; otherwise the remote URL is used as before.
export async function inlineImage(url: string | undefined): Promise<string | undefined> {
  if (!url || url.startsWith('data:')) return url;
  const fresh = await fetchImage(url);
  if (fresh) {
    await cacheImage(url, fresh);
    return toDataUrl(fresh);
  }
  const cached = await readCachedImage(url);
  return cached ? toDataUrl(cached) : url;
}

// Resolves to undefined for a failed fetch, a non-image response, or a body
// over the inline limit, so the caller falls back to the cached copy.
async function fetchImage(url: string): Promise<ImageBytes | undefined> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const type = imageType(response);
    const declaredLength = Number(response.headers.get('content-length'));
    if (!response.ok || !type || !response.body || declaredLength > MAX_INLINE_BYTES) {
      void response.body?.cancel();
      return undefined;
    }
    const bytes = await readUpTo(response.body, MAX_INLINE_BYTES);
    return bytes && { bytes, type };
  } catch {
    return undefined;
  }
}

async function readUpTo(
  body: ReadableStream<Uint8Array<ArrayBuffer>>,
  limit: number,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const reader = body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      void reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return bytes;
}

function imageType(response: Response): string | undefined {
  const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  return type && IMAGE_TYPES.includes(type) ? type : undefined;
}

async function cacheImage(url: string, image: ImageBytes): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(image.bytes, { headers: { 'content-type': image.type } }));
    await pruneCache(cache);
  } catch (e) {
    Log._debug('notification image cache write failed:', e);
  }
}

async function readCachedImage(url: string): Promise<ImageBytes | undefined> {
  try {
    const cached = await (await caches.open(CACHE_NAME)).match(url);
    const type = cached && imageType(cached);
    return type ? { bytes: new Uint8Array(await cached.arrayBuffer()), type } : undefined;
  } catch (e) {
    Log._debug('notification image cache read failed:', e);
    return undefined;
  }
}

// Cache keys come back in insertion order, so the first keys are the oldest.
async function pruneCache(cache: Cache): Promise<void> {
  const keys = await cache.keys();
  const stale = keys.slice(0, Math.max(0, keys.length - MAX_CACHED_IMAGES));
  await Promise.all(stale.map((key) => cache.delete(key)));
}

function toDataUrl({ bytes, type }: ImageBytes): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${type};base64,${btoa(binary)}`;
}
