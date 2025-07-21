import { mockUserAgent } from '__test__/support/environment/TestEnvironmentHelpers';
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
    beforeEach(() => {
      vi.resetAllMocks();
      mockUserAgent();
    });

    async function getPushSubscriptionModel() {
      return (await getCoreModuleDirector()).getPushSubscriptionModel();
    }

    test('returns undefined when it find no push records', () => {
      expect(getPushSubscriptionModel()).toBe(undefined);
    });

    test('returns current subscription when available', async () => {
      const pushModelCurrent = generateNewSubscription();
      vi.spyOn(
        CoreModuleDirector.prototype,
        'getPushSubscriptionModelByCurrentToken',
      ).mockResolvedValue(pushModelCurrent);
      expect(getPushSubscriptionModel()).toBe(pushModelCurrent);
    });

    test('returns last known subscription when current is unavailable', () => {
      const pushModelLastKnown = generateNewSubscription();
      vi.spyOn(
        CoreModuleDirector.prototype,
        'getPushSubscriptionModelByLastKnownToken',
      ).mockResolvedValue(pushModelLastKnown);
      expect(getPushSubscriptionModel()).toBe(pushModelLastKnown);
    });

    test('returns current subscription over last known', async () => {
      const pushModelCurrent = generateNewSubscription();
      vi.spyOn(
        CoreModuleDirector.prototype,
        'getPushSubscriptionModelByCurrentToken',
      ).mockResolvedValue(pushModelCurrent);

      const pushModelLastKnown = generateNewSubscription();
      vi.spyOn(
        CoreModuleDirector.prototype,
        'getPushSubscriptionModelByLastKnownToken',
      ).mockResolvedValue(pushModelLastKnown);

      expect(getPushSubscriptionModel()).toBe(pushModelCurrent);
    });
  });
});
