import { getDBAppConfig } from 'src/shared/database/config';
import {
  getSubscription,
  setSubscription,
} from 'src/shared/database/subscription';
import {
  AppIDMissingError,
  MalformedArgumentError,
} from 'src/shared/errors/common';
import { error, warn } from 'src/shared/libraries/log';
import {
  checkAndTriggerSubscriptionChanged,
  onInternalSubscriptionSet,
} from 'src/shared/listeners';
import { IDManager } from 'src/shared/managers/IDManager';
import type { EventsMap } from 'src/shared/services/types';
import type { UserSubscription } from 'src/shared/subscriptions/types';
import { EventListenerBase } from '../page/userModel/EventListenerBase';
import { isCompleteSubscriptionObject } from '../shared/managers/utils';
import {
  awaitOneSignalInitAndSupported,
  logMethodCall,
} from '../shared/utils/utils';

export default class PushSubscriptionNamespace extends EventListenerBase {
  private _id?: string | null;
  private _token?: string | null;
  private _optedIn?: boolean;
  private _permission?: NotificationPermission;

  constructor(
    initialize: boolean,
    subscription?: UserSubscription,
    permission?: NotificationPermission,
  ) {
    super();
    if (!initialize || !subscription) {
      warn(
        `PushSubscriptionNamespace: skipping initialization. One or more required params are falsy: initialize: ${initialize}, subscription: ${subscription}`,
      );
      return;
    }

    this._optedIn = !subscription.optedOut;
    this._permission = permission;
    this._token = subscription.subscriptionToken;

    OneSignal._coreDirector
      ._getPushSubscriptionModel()
      .then((pushModel) => {
        if (isCompleteSubscriptionObject(pushModel)) {
          this._id = pushModel.id;
        }
      })
      .catch((e) => {
        error(e);
      });

    OneSignal._emitter.on('change', async (change) => {
      this._id = change?.current.id;
      this._token = change?.current.token;
    });

    OneSignal._emitter.on('permissionChangeAsString', async (permission) => {
      this._permission = permission;
    });
  }

  get id(): string | null | undefined {
    return IDManager._isLocalId(this._id) ? undefined : this._id;
  }

  get token(): string | null | undefined {
    return this._token;
  }

  get optedIn(): boolean {
    return !!this._optedIn && this._permission === 'granted';
  }

  async optIn(): Promise<void> {
    logMethodCall('optIn');
    await awaitOneSignalInitAndSupported();
    this._optedIn = true;

    const permissionStatus =
      await OneSignal._context._permissionManager._getPermissionStatus();

    if (permissionStatus !== 'granted') {
      // TO DO: use user-config options prompting method
      await OneSignal.Notifications.requestPermission();
      return;
    }

    await this._enable(true);
  }

  async optOut(): Promise<void> {
    logMethodCall('optOut');
    await awaitOneSignalInitAndSupported();
    this._optedIn = false;
    await this._enable(false);
  }

  addEventListener(
    event: 'change',
    listener: (change: EventsMap['change']) => void,
  ): void {
    OneSignal._emitter.on(event, listener);
  }

  removeEventListener(
    event: 'change',
    listener: (change: EventsMap['change']) => void,
  ): void {
    OneSignal._emitter.off(event, listener);
  }

  /* P R I V A T E */

  private async _enable(enabled: boolean): Promise<void> {
    await awaitOneSignalInitAndSupported();
    const appConfig = await getDBAppConfig();
    const subscriptionFromDb = await getSubscription();

    if (!appConfig.appId) {
      throw AppIDMissingError;
    }
    if (typeof enabled !== 'boolean') {
      throw MalformedArgumentError('enabled');
    }

    subscriptionFromDb.optedOut = !enabled;
    await setSubscription(subscriptionFromDb);
    onInternalSubscriptionSet(subscriptionFromDb.optedOut).catch((e) => {
      error(e);
    });
    checkAndTriggerSubscriptionChanged().catch((e) => {
      error(e);
    });
  }
}
