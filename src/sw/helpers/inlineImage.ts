import Log from 'src/shared/libraries/Log';

const CACHE_NAME = 'onesignal-notification-images';
const FETCH_TIMEOUT_MS = 5_000;
const MAX_INLINE_BYTES = 128 * 1024;
const MAX_CACHED_IMAGES = 10;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

// Chromium fetches notification images at display time and shows a placeholder
// when that fetch fails. The worker fetches the image first, keeps the last
// good copy in Cache Storage, and hands the browser the bytes as a data URL.
// A cross-origin host must send Access-Control-Allow-Origin for the worker
// to read the bytes; otherwise the remote URL is used as before.
export async function inlineImage(url: string | undefined): Promise<string | undefined> {
  if (!url || url.startsWith('data:')) return url;
  const fresh = await fetchDataUrl(url);
  if (fresh === null) return url;
  try {
    const cache = await caches.open(CACHE_NAME);
    if (!fresh) return (await (await cache.match(url))?.text()) || url;
    await cache.put(url, new Response(fresh));
    // Cache keys come back in insertion order, so the first keys are the oldest.
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, -MAX_CACHED_IMAGES).map((key) => cache.delete(key)));
  } catch (e) {
    Log._debug('notification image cache failed:', e);
  }
  return fresh || url;
}

// Resolves to null for a valid image over the inline limit, since the cached
// copy may be an older image at the same URL. Resolves to undefined for a
// failed fetch, a non-image response, or an empty body, so the caller falls
// back to the cached copy.
async function fetchDataUrl(url: string): Promise<string | null | undefined> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!response.ok || !type || !IMAGE_TYPES.includes(type) || !response.body) {
      void response.body?.cancel();
      return undefined;
    }
    if (Number(response.headers.get('content-length')) > MAX_INLINE_BYTES) {
      void response.body.cancel();
      return null;
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_INLINE_BYTES) {
        void reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return total ? await readDataUrl(new Blob(chunks, { type })) : undefined;
  } catch {
    return undefined;
  }
}

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
