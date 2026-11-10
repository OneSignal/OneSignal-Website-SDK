import { ONESIGNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupIdentityModel, setupPropertiesModel } from '__test__/support/helpers/setup';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import User from 'src/onesignal/User';
import { clearAll, db } from 'src/shared/database/client';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';

const sentTags: Record<string, string>[] = [];

describe('OperationRepo after a page reload', () => {
  beforeEach(async () => {
    await clearAll();
    sentTags.length = 0;
    TestEnvironment.initialize();
    server.use(
      http.patch('**/apps/:appId/users/by/onesignal_id/:id', async ({ request }) => {
        const body = (await request.json()) as { properties?: { tags?: Record<string, string> } };
        if (body.properties?.tags) sentTags.push(body.properties.tags);
        return HttpResponse.json({});
      }),
    );
    setupIdentityModel(ONESIGNAL_ID);
    await setupPropertiesModel(ONESIGNAL_ID);
  });

  test('saved tag operations send in enqueue order, so the newest tags win', async () => {
    OneSignal._coreDirector._operationRepo._pause();
    const user = User._createOrGetInstance();
    // Random values that put the newer operation first if the model id is random.
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.9);
    user.addTag('k1', 'v1');
    random.mockReturnValue(0.1);
    user.addTag('k2', 'v2');
    random.mockRestore();
    await vi.waitUntil(async () => (await db.getAll('operations')).length === 2);

    // Reload: stop the old queue, then start a new core module on the same IndexedDB.
    TestEnvironment.initialize();
    await expect.poll(() => sentTags.length, { timeout: 3000, interval: 10 }).toBeGreaterThan(0);

    expect(sentTags.at(-1)).toEqual({ k1: 'v1', k2: 'v2' });
  });
});
