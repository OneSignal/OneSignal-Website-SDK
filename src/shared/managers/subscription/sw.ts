import { PermissionBlockedError } from 'src/shared/errors/common';
import type { RawPushSubscription } from 'src/shared/models/RawPushSubscription';
import type { SubscriptionStrategyKindValue } from 'src/shared/models/SubscriptionStrategyKind';
import { Browser } from 'src/shared/useragent/constants';
import { getBrowserName } from 'src/shared/useragent/detect';
import type { ContextSWInterface } from '../../context/types';
import { SubscriptionManagerBase } from './base';

declare let self: ServiceWorkerGlobalScope;

export class SubscriptionManagerSW extends SubscriptionManagerBase<ContextSWInterface> {
  /**
   * Subscribes for a web push subscription.
   *
   * This method can be called from the page context or a webpage a service worker context
   * and will select the correct method.
   */
  public async subscribe(
    subscriptionStrategy: SubscriptionStrategyKindValue,
  ): Promise<RawPushSubscription> {
    return await this.subscribeFcmFromWorker(subscriptionStrategy);
  }

  public async subscribeFcmFromWorker(
    subscriptionStrategy: SubscriptionStrategyKindValue,
  ): Promise<RawPushSubscription> {
    /*
        We're running inside of the service worker.
  
        Check to make sure our registration is activated, otherwise we can't
        subscribe for push.
  
        HACK: Firefox doesn't set self.registration.active in the service worker
        context. From a non-service worker context, like
        navigator.serviceWorker.getRegistration().active, the property actually is
        set, but it's just not set within the service worker context.
  
        Because of this, we're not able to check for this property on Firefox.
       */

    const swRegistration = self.registration;

    if (!swRegistration.active && getBrowserName() !== Browser.Firefox) {
      throw new Error('SW not activated');
      /*
          Or should we wait for the service worker to be ready?
  
          await new Promise(resolve => self.onactivate = resolve);
         */
    }

    /*
        Check to make sure push permissions have been granted.
       */
    const pushPermission = await swRegistration.pushManager.permissionState({
      userVisibleOnly: true,
    });
    if (pushPermission === 'denied') {
      throw PermissionBlockedError;
    } else if (pushPermission === 'prompt') {
      throw new Error('Permission not granted');
    }

    return await this.subscribeWithVapidKey(
      swRegistration.pushManager,
      subscriptionStrategy,
    );
  }
}
