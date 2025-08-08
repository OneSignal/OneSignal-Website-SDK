import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import OneSignal from 'src/onesignal/OneSignal';
import type { Mock } from 'vitest';

let emitterSpy: Mock;

beforeEach(async () => {
  await TestEnvironment.initialize();
  emitterSpy = vi.spyOn(OneSignal.emitter, 'on');
});

afterEach(() => {
  vi.resetAllMocks();
});

test('Adding click listener fires internal EventHelper', async () => {
  OneSignal.Notifications.addEventListener('click', () => {});
  expect(emitterSpy).toHaveBeenCalledTimes(1);
});
