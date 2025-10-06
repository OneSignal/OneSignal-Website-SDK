import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';
import { TestEnvironment } from '../../support/environment/TestEnvironment';
import {
  generateNewSubscription,
  getCoreModuleDirector,
} from '../../support/helpers/core';

describe('CoreModuleDirector tests', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  describe('getPushSubscriptionModel', () => {
    async function getPushSubscriptionModel() {
      return (await getCoreModuleDirector())._getPushSubscriptionModel();
    }

    test('returns undefined when it find no push records', async () => {
      expect(await getPushSubscriptionModel()).toBe(undefined);
    });

    test('returns current subscription when available', async () => {
      const pushModelCurrent = generateNewSubscription();
      vi.spyOn(
        CoreModuleDirector.prototype,
        '_getPushSubscriptionModelByCurrentToken',
      ).mockResolvedValue(pushModelCurrent);
      expect(await getPushSubscriptionModel()).toBe(pushModelCurrent);
    });

    test('returns last known subscription when current is unavailable', async () => {
      const pushModelLastKnown = generateNewSubscription();
      vi.spyOn(
        CoreModuleDirector.prototype,
        '_getPushSubscriptionModelByLastKnownToken',
      ).mockResolvedValue(pushModelLastKnown);
      expect(await getPushSubscriptionModel()).toEqual(pushModelLastKnown);
    });

    test('returns current subscription over last known', async () => {
      const pushModelCurrent = generateNewSubscription();
      vi.spyOn(
        CoreModuleDirector.prototype,
        '_getPushSubscriptionModelByCurrentToken',
      ).mockResolvedValue(pushModelCurrent);

      const pushModelLastKnown = generateNewSubscription();
      vi.spyOn(
        CoreModuleDirector.prototype,
        '_getPushSubscriptionModelByLastKnownToken',
      ).mockResolvedValue(pushModelLastKnown);

      expect(await getPushSubscriptionModel()).toBe(pushModelCurrent);
    });
  });
});
