import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';
import { OSModel } from '../../../src/core/modelRepo/OSModel';
import { SupportedSubscription } from '../../../src/core/models/SubscriptionModels';
import { TestEnvironment } from '../../support/environment/TestEnvironment';
import {
  getCoreModuleDirector,
  getDummyPushSubscriptionOSModel,
} from '../../support/helpers/core';

describe('CoreModuleDirector tests', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  describe('getPushSubscriptionModel', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    async function getPushSubscriptionModel(): Promise<
      OSModel<SupportedSubscription> | undefined
    > {
      return (await getCoreModuleDirector()).getPushSubscriptionModel();
    }

    test('returns undefined when it find no push records', async () => {
      expect(await getPushSubscriptionModel()).toBe(undefined);
    });

    test('returns current subscription when available', async () => {
      const pushModelCurrent = getDummyPushSubscriptionOSModel();
      vi.spyOn(
        CoreModuleDirector.prototype,
        'getPushSubscriptionModelByCurrentToken',
      ).mockResolvedValue(pushModelCurrent);
      expect(await getPushSubscriptionModel()).toBe(pushModelCurrent);
    });

    test('returns last known subscription when current is unavailable', async () => {
      const pushModelLastKnown = getDummyPushSubscriptionOSModel();
      vi.spyOn(
        CoreModuleDirector.prototype,
        'getPushSubscriptionModelByLastKnownToken',
      ).mockResolvedValue(pushModelLastKnown);
      expect(await getPushSubscriptionModel()).toBe(pushModelLastKnown);
    });

    test('returns current subscription over last known', async () => {
      const pushModelCurrent = getDummyPushSubscriptionOSModel();
      vi.spyOn(
        CoreModuleDirector.prototype,
        'getPushSubscriptionModelByCurrentToken',
      ).mockResolvedValue(pushModelCurrent);

      const pushModelLastKnown = getDummyPushSubscriptionOSModel();
      vi.spyOn(
        CoreModuleDirector.prototype,
        'getPushSubscriptionModelByLastKnownToken',
      ).mockResolvedValue(pushModelLastKnown);

      expect(await getPushSubscriptionModel()).toBe(pushModelCurrent);
    });
  });
});
