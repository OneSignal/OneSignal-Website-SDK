import { http, HttpResponse } from 'msw';
import { server } from '../../../__test__/support/mocks/server';
import { getItem, removeItem } from '../modules/timedStorage';
import { getCountryCode } from './ChannelCaptureContainer';

describe('getCountryCode', () => {
  beforeEach(() => {
    // Clear cached country code before each test
    removeItem('countryCode');

    server.use(
      http.get('https://ipapi.co/json', () => {
        return HttpResponse.json({
          country_code: 'US',
        });
      }),
      http.get('https://free.freeipapi.com/api/json/', () => {
        return HttpResponse.json({
          countryCode: 'US',
        });
      }),
      http.get('https://api.country.is/', () => {
        return HttpResponse.json({
          country: 'US',
        });
      }),
    );
  });

  test('API can reutrn country code', async () => {
    const callback = vi.fn();
    getCountryCode(callback);

    // Wait for the async operation to complete
    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalledWith('us');
    });

    // should store country code in local storage
    expect(getItem('countryCode')).toBe('us');
    callback.mockClear();
    getCountryCode(callback);
    expect(callback).toHaveBeenCalledWith('us');
  });

  test('should use fallback api when first/second api fails', async () => {
    server.use(
      http.get('https://api.country.is/', () => {
        return HttpResponse.error();
      }),
      http.get('https://free.freeipapi.com/api/json/', () => {
        return HttpResponse.json({
          countryCode: 'CA',
        });
      }),
    );

    const callback = vi.fn();
    getCountryCode(callback);

    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalledWith('ca');
    });

    server.use(
      http.get('https://free.freeipapi.com/api/json/', () => {
        return HttpResponse.error();
      }),
      http.get('https://ipapi.co/json', () => {
        return HttpResponse.json({
          country_code: 'GB',
        });
      }),
    );

    callback.mockClear();
    removeItem('countryCode');
    getCountryCode(callback);

    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalledWith('gb');
    });
  });

  test('should return "us" country code when all api fails', async () => {
    server.use(
      http.get('https://api.country.is/', () => {
        return HttpResponse.error();
      }),
      http.get('https://free.freeipapi.com/api/json/', () => {
        return HttpResponse.error();
      }),
      http.get('https://ipapi.co/json', () => {
        return HttpResponse.error();
      }),
    );

    const callback = vi.fn();
    getCountryCode(callback);

    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalledWith('us');
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
