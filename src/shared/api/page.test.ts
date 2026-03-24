import { describe, expect, test, vi } from 'vite-plus/test';

const { mockJsonp } = vi.hoisted(() => ({
  mockJsonp: vi.fn(),
}));

vi.mock('jsonp', () => ({ default: mockJsonp }));

describe('jsonpLib', () => {
  test('passes explicit options to prevent prototype pollution', async () => {
    vi.resetModules();
    const { jsonpLib } = await import('./page');

    const fn = vi.fn();
    jsonpLib('https://example.com', fn);

    expect(mockJsonp).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        prefix: '__jp',
        param: 'callback',
        timeout: 60000,
      }),
      fn,
    );
  });
});
