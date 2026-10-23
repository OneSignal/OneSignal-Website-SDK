import { installMockCacheStorage, type MockCache } from '__test__/support/mocks/MockCacheStorage';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import { inlineImage } from './inlineImage';

const ICON_URL = 'https://img.example.com/icon.png';
const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);
const PNG_DATA_URL = `data:image/png;base64,${btoa('\x89PNG')}`;

const imageResponse = (bytes: Uint8Array<ArrayBuffer> = PNG_BYTES, type = 'image/png') =>
  new Response(bytes, { status: 200, headers: { 'content-type': type } });

const fetchMock = vi.fn<typeof fetch>();

const openCache = async (): Promise<MockCache> =>
  (await caches.open('onesignal-notification-images')) as unknown as MockCache;

describe('inlineImage', () => {
  beforeEach(() => {
    installMockCacheStorage();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('returns an empty or data URL unchanged without a fetch', async () => {
    expect(await inlineImage(undefined)).toBeUndefined();
    expect(await inlineImage('')).toBe('');
    expect(await inlineImage(PNG_DATA_URL)).toBe(PNG_DATA_URL);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns the fetched bytes as a data URL and caches them', async () => {
    fetchMock.mockResolvedValue(imageResponse());

    expect(await inlineImage(ICON_URL)).toBe(PNG_DATA_URL);

    expect(fetchMock).toHaveBeenCalledWith(ICON_URL, { signal: expect.any(AbortSignal) });
    const cached = await (await openCache()).match(ICON_URL);
    expect(new Uint8Array(await cached!.arrayBuffer())).toEqual(PNG_BYTES);
    expect(cached!.headers.get('content-type')).toBe('image/png');
  });

  test('drops content-type parameters from the data URL', async () => {
    fetchMock.mockResolvedValue(imageResponse(PNG_BYTES, 'image/webp; charset=binary'));

    expect(await inlineImage(ICON_URL)).toBe(`data:image/webp;base64,${btoa('\x89PNG')}`);
  });

  test('accepts an upper-case content-type', async () => {
    fetchMock.mockResolvedValue(imageResponse(PNG_BYTES, 'IMAGE/PNG'));

    expect(await inlineImage(ICON_URL)).toBe(PNG_DATA_URL);
  });

  test('returns the remote URL when the response has no content-type and caches nothing', async () => {
    fetchMock.mockResolvedValue(new Response(PNG_BYTES, { status: 200 }));

    expect(await inlineImage(ICON_URL)).toBe(ICON_URL);
    expect((await openCache()).entries.size).toBe(0);
  });

  test('returns the remote URL for a non-image content type and caches nothing', async () => {
    const cancel = vi.fn();
    fetchMock.mockResolvedValue(
      new Response(new ReadableStream({ cancel }), {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    );

    expect(await inlineImage(ICON_URL)).toBe(ICON_URL);
    expect((await openCache()).entries.size).toBe(0);
    expect(cancel).toHaveBeenCalled();
  });

  test('uses the cached copy when the response is not an image', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse());
    await inlineImage(ICON_URL);

    fetchMock.mockResolvedValueOnce(imageResponse(PNG_BYTES, 'text/html'));
    expect(await inlineImage(ICON_URL)).toBe(PNG_DATA_URL);
  });

  test('uses the cached copy when the fetch rejects', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse());
    await inlineImage(ICON_URL);

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await inlineImage(ICON_URL)).toBe(PNG_DATA_URL);
  });

  test('uses the cached copy when the response is not ok', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse());
    await inlineImage(ICON_URL);

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    expect(await inlineImage(ICON_URL)).toBe(PNG_DATA_URL);
  });

  test('returns the remote URL when the fetch fails and nothing is cached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await inlineImage(ICON_URL)).toBe(ICON_URL);
    expect((await openCache()).entries.size).toBe(0);
  });

  test('returns the remote URL for an image over the inline limit and does not cache it', async () => {
    fetchMock.mockResolvedValue(imageResponse(new Uint8Array(128 * 1024 + 1)));

    expect(await inlineImage(ICON_URL)).toBe(ICON_URL);
    expect((await openCache()).entries.size).toBe(0);
  });

  test('skips the body when Content-Length is over the inline limit', async () => {
    const cancel = vi.fn();
    fetchMock.mockResolvedValue(
      new Response(new ReadableStream({ cancel }), {
        status: 200,
        headers: { 'content-type': 'image/png', 'content-length': String(128 * 1024 + 1) },
      }),
    );

    expect(await inlineImage(ICON_URL)).toBe(ICON_URL);
    expect(cancel).toHaveBeenCalled();
    expect((await openCache()).entries.size).toBe(0);
  });

  test('stops reading a stream once it passes the inline limit', async () => {
    const chunk = new Uint8Array(64 * 1024);
    let pulls = 0;
    const cancel = vi.fn();
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array<ArrayBuffer>>({
          pull(controller) {
            pulls++;
            controller.enqueue(chunk);
          },
          cancel,
        }),
        { status: 200, headers: { 'content-type': 'image/png' } },
      ),
    );

    expect(await inlineImage(ICON_URL)).toBe(ICON_URL);
    expect(cancel).toHaveBeenCalled();
    expect(pulls).toBeLessThan(6);
    expect((await openCache()).entries.size).toBe(0);
  });

  test('returns the fetched bytes when Cache Storage cannot be opened', async () => {
    vi.stubGlobal('caches', { open: () => Promise.reject(new Error('quota')) });
    fetchMock.mockResolvedValue(imageResponse());

    expect(await inlineImage(ICON_URL)).toBe(PNG_DATA_URL);
  });

  test('returns the fetched bytes when the cache write throws', async () => {
    const cache = await openCache();
    vi.spyOn(cache, 'put').mockRejectedValue(new DOMException('quota', 'QuotaExceededError'));
    fetchMock.mockResolvedValue(imageResponse());

    expect(await inlineImage(ICON_URL)).toBe(PNG_DATA_URL);
    expect(cache.entries.size).toBe(0);
  });

  test('keeps only the 10 most recent images in the cache', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(imageResponse()));
    for (let i = 0; i < 12; i++) {
      await inlineImage(`${ICON_URL}?v=${i}`);
    }

    const keys = await (await openCache()).keys();
    expect(keys).toHaveLength(10);
    expect(keys[0]).toBe(`${ICON_URL}?v=2`);
    expect(keys[9]).toBe(`${ICON_URL}?v=11`);
  });

  test('encodes an image larger than one base64 chunk', async () => {
    const bytes = new Uint8Array(0x8000 + 3).map((_, i) => i % 256);
    fetchMock.mockResolvedValue(imageResponse(bytes));

    const dataUrl = await inlineImage(ICON_URL);

    const base64 = dataUrl!.slice('data:image/png;base64,'.length);
    expect(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))).toEqual(bytes);
  });
});
