import Log from 'src/shared/libraries/Log';

const CACHE_NAME = 'onesignal-notification-images';
const FETCH_TIMEOUT_MS = 5_000;
const MAX_INLINE_BYTES = 128 * 1024;
const MAX_CACHED_IMAGES = 10;

interface ImageBytes {
  bytes: ArrayBuffer;
  type: string;
}

// Chromium fetches notification images at display time and shows a placeholder
// when that fetch fails. The worker fetches the image first, keeps the last
// good copy in Cache Storage, and hands the browser the bytes as a data URL.
// A cross-origin host must send Access-Control-Allow-Origin for the worker
// to read the bytes; otherwise the remote URL is used as before.
export async function inlineImage(url: string | undefined): Promise<string | undefined> {
  if (!url || url.startsWith('data:')) return url;
  try {
    const cache = await caches.open(CACHE_NAME);
    const fresh = await fetchImage(url);
    if (fresh) {
      if (fresh.bytes.byteLength > MAX_INLINE_BYTES) return url;
      await cache.put(url, new Response(fresh.bytes, { headers: { 'content-type': fresh.type } }));
      await pruneCache(cache);
      return toDataUrl(fresh);
    }
    const cached = await cache.match(url);
    if (!cached) return url;
    return toDataUrl({ bytes: await cached.arrayBuffer(), type: contentType(cached) });
  } catch (e) {
    Log._debug('inlineImage failed, using the remote URL:', e);
    return url;
  }
}

async function fetchImage(url: string): Promise<ImageBytes | undefined> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return undefined;
    return { bytes: await response.arrayBuffer(), type: contentType(response) };
  } catch {
    return undefined;
  }
}

function contentType(response: Response): string {
  return response.headers.get('content-type')?.split(';')[0].trim() || 'image/png';
}

// Cache keys come back in insertion order, so the first keys are the oldest.
async function pruneCache(cache: Cache): Promise<void> {
  const keys = await cache.keys();
  const stale = keys.slice(0, Math.max(0, keys.length - MAX_CACHED_IMAGES));
  await Promise.all(stale.map((key) => cache.delete(key)));
}

function toDataUrl({ bytes, type }: ImageBytes): string {
  const view = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 0x8000) {
    binary += String.fromCharCode(...view.subarray(i, i + 0x8000));
  }
  return `data:${type};base64,${btoa(binary)}`;
}
