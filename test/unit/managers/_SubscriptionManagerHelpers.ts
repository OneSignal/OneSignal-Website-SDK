import { arrayBufferToBase64 } from '../../../src/utils/Encoding';
import Random from '../../support/tester/Random';
import { SubscriptionManager, SubscriptionManagerConfig } from "../../../src/managers/SubscriptionManager";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import Context from '../../../src/models/Context';

export class SubscriptionManagerHelper {
  static createMock(): SubscriptionManager {
    const appConfig = TestEnvironment.getFakeAppConfig();
    const context = new Context(appConfig);

    const subscriptionManagerConfig = {
      safariWebId: undefined,
      appId: Random.getRandomUuid(),
      vapidPublicKey: <any>undefined, // Forcing vapidPublicKey to undefined to test throwing
      onesignalVapidPublicKey: SubscriptionManagerHelper.generateVapidKeys().sharedPublic
    } as SubscriptionManagerConfig;

    return new SubscriptionManager(context, subscriptionManagerConfig);
  }

  static generateVapidKeys() {
    return {
      uniquePublic: arrayBufferToBase64(Random.getRandomUint8Array(64).buffer),
      sharedPublic: arrayBufferToBase64(Random.getRandomUint8Array(64).buffer)
    };
  }
}
